import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { parseLatexToExam } from "../parsers/parse-latex-exam.ts";
import { proposeExerciseProgramLinks, type ExerciseProgramLink, type SchoolProgramEntry } from "../mappers/exam-to-school-program.ts";
import type { CollectedPaper, ExamExercise, ExamPaper, ExamSource } from "../parsers/pdf-to-exam.ts";
import { applyCropsToExercises } from "./pdf-crop-assets.ts";

interface CliOptions {
  latexPath: string;
  isDir: boolean;
  year: number;
  location: string;
  series: "generale" | "professionnelle" | null;
  out: string;
  programEntries?: string;
  pdfPath?: string;
  withAssets: boolean;
  assetsRoot: string;
}

interface ExamBundle {
  sources: ExamSource[];
  papers: ExamPaper[];
  exercises: ExamExercise[];
  exercise_program_links: ExerciseProgramLink[];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const latexFile = options.isDir
    ? await findTexFile(options.latexPath)
    : options.latexPath;

  if (options.isDir) console.log(`Found .tex file: ${latexFile}`);

  const texContent = await readFile(latexFile, "utf8");
  const fetched_at = new Date().toISOString();
  const sourceUrl = `https://www.apmep.fr/Brevet-${options.year}`;

  const metadata: CollectedPaper = {
    source_name: "apmep",
    source_url: sourceUrl,
    fetched_at,
    exam: "dnb",
    session_year: options.year,
    discipline: "mathematiques",
    series: options.series,
    location: options.location,
    variant: "standard",
    pdf_url: "",
    title: `DNB Brevet ${capitalize(options.location)} ${options.year}`,
  };

  const parsed = parseLatexToExam(texContent, metadata);

  // Apply PDF crops if --pdf and --with-assets are provided
  if (options.withAssets && options.pdfPath) {
    console.log(`Applying PDF crops from: ${options.pdfPath}`);
    const pdfBytes = await readFile(options.pdfPath);
    await applyCropsToExercises(parsed.paper, parsed.exercises, pdfBytes, options.assetsRoot);
    console.log(`Crops applied → assets in ${options.assetsRoot}`);
  }

  const programEntries = await loadProgramEntries(options.programEntries);
  const exercise_program_links = proposeExerciseProgramLinks(parsed.exercises, programEntries);

  const bundle: ExamBundle = {
    sources: [{ id: `apmep:${sourceUrl}`, source_name: "apmep", source_url: sourceUrl, fetched_at }],
    papers: [parsed.paper],
    exercises: parsed.exercises,
    exercise_program_links,
  };

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log(`Wrote ${options.out}`);
  console.log(`Papers: 1; exercises: ${parsed.exercises.length}; links: ${exercise_program_links.length}`);
  console.log(`Parsing status: ${parsed.paper.parsing_status}`);
  for (const ex of parsed.exercises) {
    const q = ex.parsed_content?.questions?.length ?? 0;
    const docs = ex.parsed_content?.documents?.length ?? 0;
    console.log(`  Ex${ex.exercise_number}: ${ex.title} — ${q} question(s), ${docs} doc(s), confidence=${ex.parsing_confidence}`);
  }
}

async function findTexFile(dir: string): Promise<string> {
  const entries = await readdir(dir);
  const tex = entries.find((f) => extname(f).toLowerCase() === ".tex");
  if (!tex) throw new Error(`No .tex file found in ${dir}`);
  return join(dir, tex);
}

async function loadProgramEntries(path: string | undefined): Promise<SchoolProgramEntry[]> {
  if (path === undefined) return [];
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`--program-entries must be a JSON array: ${path}`);
  return parsed as SchoolProgramEntry[];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseArgs(args: string[]): CliOptions {
  let latexPath: string | undefined;
  let isDir = false;
  let year: number | undefined;
  let location = "metropole";
  let series: "generale" | "professionnelle" | null = "generale";
  let out = "exam-import/bundles/dnb-latex.json";
  let programEntries: string | undefined;
  let pdfPath: string | undefined;
  let withAssets = false;
  let assetsRoot = "exam-import/assets";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const val = args[i + 1];

    if (arg === "--latex-file" && val) {
      latexPath = val;
      isDir = false;
      i += 1;
    } else if (arg === "--latex-dir" && val) {
      latexPath = val;
      isDir = true;
      i += 1;
    } else if (arg === "--year" && val) {
      year = Number.parseInt(val, 10);
      i += 1;
    } else if (arg === "--location" && val) {
      location = val;
      i += 1;
    } else if (arg === "--series" && val) {
      if (val !== "generale" && val !== "professionnelle" && val !== "null") {
        throw new Error(`--series must be generale, professionnelle, or null`);
      }
      series = val === "null" ? null : val;
      i += 1;
    } else if (arg === "--out" && val) {
      out = val;
      i += 1;
    } else if (arg === "--program-entries" && val) {
      programEntries = val;
      i += 1;
    } else if (arg === "--pdf" && val) {
      pdfPath = val;
      i += 1;
    } else if (arg === "--with-assets") {
      withAssets = true;
    } else if (arg === "--assets-root" && val) {
      assetsRoot = val;
      i += 1;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${arg ?? ""}`);
    }
  }

  if (!latexPath) throw new Error("--latex-file or --latex-dir is required");
  if (!year || Number.isNaN(year)) throw new Error("--year is required");
  if (withAssets && !pdfPath) throw new Error("--pdf is required when using --with-assets");

  return { latexPath, isDir, year, location, series, out, programEntries, pdfPath, withAssets, assetsRoot };
}

function printHelp(): void {
  console.log(`Usage: npm run build:latex-bundle -- [options]

Options:
  --latex-file /path/to/exam.tex
  --latex-dir  /path/to/folder/        auto-finds the .tex file
  --year       2018                    required
  --location   metropole               default: metropole
  --series     generale|professionnelle|null  default: generale
  --out        exam-import/bundles/dnb-2018-metropole.json
  --program-entries path/to/entries.json
  --pdf        /path/to/exam.pdf       required with --with-assets
  --with-assets                        crop figures from PDF pages
  --assets-root exam-import/assets     default: exam-import/assets
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
