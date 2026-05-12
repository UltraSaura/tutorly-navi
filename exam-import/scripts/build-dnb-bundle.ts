import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { collectAmiensDnbMaths } from "../sources/amiens-dnb-maths.ts";
import { collectEduscolDnb, type EduscolCollectOptions } from "../sources/eduscol-dnb.ts";
import {
  downloadPdf,
  parsePdfToExam,
  type CollectedPaper,
  type ExamSource,
} from "../parsers/pdf-to-exam.ts";
import {
  proposeExerciseProgramLinks,
  type ExerciseProgramLink,
  type SchoolProgramEntry,
} from "../mappers/exam-to-school-program.ts";

type SourceOption = "eduscol" | "amiens" | "all";

interface CliOptions {
  source: SourceOption;
  year?: number;
  discipline?: string;
  out: string;
  programEntries?: string;
  withAssets: boolean;
  assetsRoot: string;
}

interface ExamBundle {
  sources: ExamSource[];
  papers: Awaited<ReturnType<typeof parsePdfToExam>>["paper"][];
  exercises: Awaited<ReturnType<typeof parsePdfToExam>>["exercises"];
  exercise_program_links: ExerciseProgramLink[];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const collected = await collectPapers(options);
  const bundle: ExamBundle = { sources: buildSources(collected), papers: [], exercises: [], exercise_program_links: [] };

  for (const paper of collected) {
    try {
      const bytes = await downloadPdf(paper.pdf_url);
      const parsed = await parsePdfToExam(paper, bytes, {
        withAssets: options.withAssets,
        assetsRoot: options.assetsRoot,
      });
      bundle.papers.push(parsed.paper);
      bundle.exercises.push(...parsed.exercises);
    } catch (error) {
      console.error(`Skipping ${paper.pdf_url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const programEntries = await loadProgramEntries(options.programEntries);
  bundle.exercise_program_links = proposeExerciseProgramLinks(bundle.exercises, programEntries);

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log(`Wrote ${options.out}`);
  console.log(`Sources: ${bundle.sources.length}; papers: ${bundle.papers.length}; exercises: ${bundle.exercises.length}; links: ${bundle.exercise_program_links.length}`);
}

async function collectPapers(options: CliOptions): Promise<CollectedPaper[]> {
  const eduscolOptions: EduscolCollectOptions = {
    year: options.year,
    discipline: options.discipline,
  };

  const batches = await Promise.all([
    options.source === "eduscol" || options.source === "all" ? collectEduscolDnb(eduscolOptions) : Promise.resolve([]),
    options.source === "amiens" || options.source === "all" ? collectAmiensDnbMaths({ year: options.year }) : Promise.resolve([]),
  ]);

  const papers = batches.flat().filter((paper) => {
    if (options.discipline !== undefined && paper.discipline !== normalizeDiscipline(options.discipline)) return false;
    return true;
  });

  return dedupePreferAmiensForHistoricMaths(papers);
}

function dedupePreferAmiensForHistoricMaths(papers: CollectedPaper[]): CollectedPaper[] {
  const score = (paper: CollectedPaper): number => {
    if (paper.source_name === "ac-amiens-maths" && paper.discipline === "mathematiques" && paper.location === "metropole" && paper.session_year >= 2007 && paper.session_year <= 2021) {
      return 2;
    }
    return 1;
  };

  const byKey = new Map<string, CollectedPaper>();
  for (const paper of papers) {
    const key = [paper.session_year, paper.discipline, paper.series ?? "all", paper.location, paper.variant].join(":");
    const previous = byKey.get(key);
    if (previous === undefined || score(paper) > score(previous)) {
      byKey.set(key, paper);
    }
  }
  return [...byKey.values()].sort((a, b) => b.session_year - a.session_year || a.source_name.localeCompare(b.source_name));
}

function buildSources(papers: CollectedPaper[]): ExamSource[] {
  const bySource = new Map<string, ExamSource>();
  for (const paper of papers) {
    const id = `${paper.source_name}:${paper.source_url}`;
    bySource.set(id, {
      id,
      source_name: paper.source_name,
      source_url: paper.source_url,
      fetched_at: paper.fetched_at,
    });
  }
  return [...bySource.values()];
}

async function loadProgramEntries(path: string | undefined): Promise<SchoolProgramEntry[]> {
  if (path === undefined) return [];
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`--program-entries must point to a JSON array: ${path}`);
  }
  return parsed as SchoolProgramEntry[];
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    source: "all",
    out: "exam-import/bundles/dnb-maths.json",
    withAssets: false,
    assetsRoot: "exam-import/assets",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if (arg === "--source" && isSourceOption(value)) {
      options.source = value;
      index += 1;
    } else if (arg === "--year" && value !== undefined) {
      options.year = Number.parseInt(value, 10);
      index += 1;
    } else if (arg === "--discipline" && value !== undefined) {
      options.discipline = value;
      index += 1;
    } else if (arg === "--out" && value !== undefined) {
      options.out = value;
      index += 1;
    } else if (arg === "--program-entries" && value !== undefined) {
      options.programEntries = value;
      index += 1;
    } else if (arg === "--with-assets") {
      options.withAssets = true;
    } else if (arg === "--assets-root" && value !== undefined) {
      options.assetsRoot = value;
      index += 1;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${arg ?? ""}`);
    }
  }

  if (options.year !== undefined && Number.isNaN(options.year)) {
    throw new Error("--year must be a number");
  }

  return options;
}

function isSourceOption(value: string | undefined): value is SourceOption {
  return value === "eduscol" || value === "amiens" || value === "all";
}

function normalizeDiscipline(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function printHelp(): void {
  console.log(`Usage: npm run build:dnb-annales -- [options]

Options:
  --source eduscol|amiens|all
  --year 2021
  --discipline mathematiques
  --out exam-import/bundles/dnb-maths.json
  --program-entries path/to/existing-program-entries.json
  --with-assets
  --assets-root exam-import/assets
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
