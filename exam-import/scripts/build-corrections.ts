/**
 * build-corrections.ts
 *
 * Converts a LaTeX corrigé (.tex) file into a JSON bundle that
 * `import-corrections.ts` can ingest into the `exam_question_corrections`
 * Supabase table.
 *
 * Usage:
 *   node --experimental-strip-types exam-import/scripts/build-corrections.ts \
 *     --input path/to/corrige.tex \
 *     --out   exam-import/bundles/my-corrections.json
 *
 * How it works:
 *   1. Read the .tex file.
 *   2. Pass through `latexToText()` from parse-latex-exam.ts.
 *      That function already handles `\begin{enumerate}\item …` via the
 *      internal `expandEnumerate()` helper, which emits:
 *        "1. answer…"  for top-level items
 *        "  a. answer…"  for nested sub-questions
 *   3. Pass the resulting plain text to `parseCorrections()` from
 *      parse-corrections.ts which detects exercise blocks, question
 *      numbers, MCQ answers ("réponse A"), numeric answers, etc.
 *   4. Write the ParsedCorrectionBundle as JSON.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { latexToText } from "../parsers/parse-latex-exam.ts";
import { parseCorrections } from "../parsers/parse-corrections.ts";
import type { ParsedCorrectionBundle } from "../parsers/parse-corrections.ts";

interface CliOptions {
  input: string;
  out: string;
  verbose: boolean;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const tex = await readFile(options.input, "utf8");

  if (options.verbose) {
    console.log(`Read ${tex.length} characters from ${options.input}`);
  }

  // Step 1: Convert LaTeX → plain text (enumerate items become "1. ", "  a. ", …)
  const plainText = latexToText(tex);

  if (options.verbose) {
    console.log("--- plain text preview (first 3000 chars) ---");
    console.log(plainText.slice(0, 3000));
    console.log("--- end preview ---");
  }

  // Step 2: Parse into structured corrections
  const bundle: ParsedCorrectionBundle = parseCorrections(plainText);

  if (bundle.corrections.length === 0) {
    console.warn("Warning: no corrections parsed. Check the input file format.");
  }

  // Step 3: Write JSON bundle
  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  // Summary
  const byExercise = new Map<number, number>();
  for (const c of bundle.corrections) {
    byExercise.set(c.exercise_number, (byExercise.get(c.exercise_number) ?? 0) + 1);
  }
  console.log(`Wrote ${options.out}`);
  console.log(`Total corrections: ${bundle.corrections.length}`);
  for (const [ex, count] of [...byExercise.entries()].sort((a, b) => a[0] - b[0])) {
    const mcq = bundle.corrections.filter(
      (c) => c.exercise_number === ex && c.answer_type === "mcq",
    ).length;
    const numeric = bundle.corrections.filter(
      (c) => c.exercise_number === ex && c.answer_type === "numeric",
    ).length;
    const text = bundle.corrections.filter(
      (c) => c.exercise_number === ex && c.answer_type === "text",
    ).length;
    console.log(
      `  Exercice ${ex}: ${count} items` +
        (mcq > 0 ? ` [${mcq} mcq]` : "") +
        (numeric > 0 ? ` [${numeric} numeric]` : "") +
        (text > 0 ? ` [${text} text]` : ""),
    );
  }

  if (options.verbose) {
    console.log("\nSample corrections:");
    for (const c of bundle.corrections.slice(0, 6)) {
      console.log(
        `  Ex${c.exercise_number} Q${c.question_id} [${c.answer_type}] → "${c.correct_answer}"`,
      );
    }
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: Partial<CliOptions> = { verbose: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    if (arg === "--input" && value) {
      options.input = value;
      i++;
    } else if (arg === "--out" && value) {
      options.out = value;
      i++;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg ?? ""}`);
    }
  }

  if (!options.input) throw new Error("--input is required");
  if (!options.out) throw new Error("--out is required");

  return options as CliOptions;
}

function printHelp(): void {
  console.log(`Usage: node --experimental-strip-types build-corrections.ts [options]

Options:
  --input <path>   Path to LaTeX corrigé .tex file (required)
  --out   <path>   Path for output JSON bundle (required)
  --verbose, -v    Print plain-text preview and sample corrections

Output format:
  { "corrections": [
      { "exercise_number": 1, "question_id": "1",
        "correct_answer": "...", "answer_type": "numeric|mcq|text",
        "explanation_steps": [...] },
      ...
  ]}

Then import with:
  npm run import:corrections -- --bundle <out> --paper-id <UUID>
`);
}

const isCliEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCliEntrypoint) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
