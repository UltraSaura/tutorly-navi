import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { ParsedCorrectionBundle, ParsedQuestionCorrection } from "../parsers/parse-corrections.ts";

interface CliOptions {
  bundle: string;
  paperId: string;
}

interface ExerciseLookup {
  id: string;
  exercise_number: number | null;
}

async function main(): Promise<void> {
  await loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !serviceKey && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter((x): x is string => typeof x === "string");
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }

  const raw = await readFile(options.bundle, "utf8");
  const bundle = JSON.parse(raw) as ParsedCorrectionBundle;

  if (!Array.isArray(bundle.corrections) || bundle.corrections.length === 0) {
    console.log("No corrections found in bundle.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Load all exercises for this paper once
  const { data: exercises, error: exError } = await supabase
    .from("exam_exercises")
    .select("id, exercise_number")
    .eq("paper_id", options.paperId);

  if (exError) throw new Error(`Failed to load exercises: ${exError.message}`);

  const exerciseByNumber = new Map<number, string>(
    ((exercises ?? []) as ExerciseLookup[])
      .filter((ex) => ex.exercise_number !== null)
      .map((ex) => [ex.exercise_number as number, ex.id]),
  );

  let inserted = 0;
  let skipped = 0;

  for (const correction of bundle.corrections) {
    const exerciseId = exerciseByNumber.get(correction.exercise_number) ?? null;

    const row = {
      exam_paper_id: options.paperId,
      exercise_id: exerciseId,
      question_id: correction.question_id,
      correct_answer: correction.correct_answer,
      explanation_steps: correction.explanation_steps,
      source: "official",
    };

    const { error } = await supabase
      .from("exam_question_corrections")
      .insert(row);

    if (error) {
      if (error.code === "23505") {
        // Unique violation — row already exists
        skipped += 1;
      } else {
        console.error(`Error inserting correction ${correction.exercise_number}:${correction.question_id}: ${error.message}`);
        skipped += 1;
      }
    } else {
      inserted += 1;
    }
  }

  console.log(`Done. Inserted: ${inserted}, skipped: ${skipped} (of ${bundle.corrections.length} total)`);
}

function parseArgs(args: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    bundle: "exam-import/bundles/corrections.json",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    if (arg === "--bundle" && value) { options.bundle = value; i++; }
    else if (arg === "--paper-id" && value) { options.paperId = value; i++; }
    else if (arg === "--help") { printHelp(); process.exit(0); }
    else { throw new Error(`Unknown option: ${arg ?? ""}`); }
  }

  if (!options.paperId) throw new Error("--paper-id is required");
  return options as CliOptions;
}

function printHelp(): void {
  console.log(`Usage: npm run import:corrections -- [options]

Options:
  --bundle   Path to corrections JSON bundle (default: exam-import/bundles/corrections.json)
  --paper-id UUID of the exam paper (required)

Environment:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

async function loadDotEnv(): Promise<void> {
  let contents: string;
  try { contents = await readFile(".env", "utf8"); } catch { return; }
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
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
