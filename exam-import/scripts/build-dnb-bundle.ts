import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { collectAmiensDnbMaths } from "../sources/amiens-dnb-maths.ts";
import { collectEduscolDnb, type EduscolCollectOptions } from "../sources/eduscol-dnb.ts";
import { collectApmepDnb } from "../sources/apmep-dnb.ts";
import { parseLatexZipToExam } from "../parsers/parse-latex-exam.ts";
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

type SourceOption = "eduscol" | "amiens" | "apmep" | "all";

interface CliOptions {
  source: SourceOption;
  year?: number;
  discipline?: string;
  location?: string;
  out: string;
  programEntries?: string;
  withAssets: boolean;
  assetsRoot: string;
  latexZip?: string; // path to a locally downloaded APMEP LaTeX ZIP
}

interface ExamBundle {
  sources: ExamSource[];
  papers: Awaited<ReturnType<typeof parsePdfToExam>>["paper"][];
  exercises: Awaited<ReturnType<typeof parsePdfToExam>>["exercises"];
  exercise_program_links: ExerciseProgramLink[];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Local LaTeX ZIP mode — skip scraping
  if (options.latexZip) {
    await buildFromLocalLatexZip(options);
    return;
  }

  const collected = await collectPapers(options);
  const bundle: ExamBundle = { sources: buildSources(collected), papers: [], exercises: [], exercise_program_links: [] };

  for (const paper of collected) {
    try {
      let parsed: Awaited<ReturnType<typeof parsePdfToExam>>;

      if (paper.latex_zip_url) {
        try {
          process.stdout.write(`[LaTeX] ${paper.title}… `);
          const zipBytes = await downloadFile(paper.latex_zip_url);
          parsed = await parseLatexZipToExam(paper, zipBytes, {
            withAssets: options.withAssets,
            assetsRoot: options.assetsRoot,
          });
          console.log(`ok (${parsed.exercises.length} exercises)`);
        } catch (latexError) {
          console.warn(`failed (${latexError instanceof Error ? latexError.message : String(latexError)})`);
          process.stdout.write(`  [PDF fallback] ${paper.title}… `);
          const pdfBytes = await downloadPdf(paper.pdf_url);
          parsed = await parsePdfToExam(paper, pdfBytes, {
            withAssets: options.withAssets,
            assetsRoot: options.assetsRoot,
          });
          console.log(`ok (${parsed.exercises.length} exercises)`);
        }
      } else {
        process.stdout.write(`[PDF] ${paper.title}… `);
        const pdfBytes = await downloadPdf(paper.pdf_url);
        parsed = await parsePdfToExam(paper, pdfBytes, {
          withAssets: options.withAssets,
          assetsRoot: options.assetsRoot,
        });
        console.log(`ok (${parsed.exercises.length} exercises)`);
      }

      bundle.papers.push(parsed.paper);
      bundle.exercises.push(...parsed.exercises);
    } catch (error) {
      console.error(`Skipping ${paper.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const programEntries = await loadProgramEntries(options.programEntries);
  bundle.exercise_program_links = proposeExerciseProgramLinks(bundle.exercises, programEntries);

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log(`Wrote ${options.out}`);
  console.log(`Sources: ${bundle.sources.length}; papers: ${bundle.papers.length}; exercises: ${bundle.exercises.length}; links: ${bundle.exercise_program_links.length}`);
}

async function buildFromLocalLatexZip(options: CliOptions): Promise<void> {
  if (!options.latexZip) throw new Error("--latex-zip path is required");
  if (!options.year) throw new Error("--year is required with --latex-zip");

  const { readFile: fsReadFile } = await import("node:fs/promises");
  const zipBytes = new Uint8Array(await (await fsReadFile(options.latexZip)).buffer);

  const metadata: CollectedPaper = {
    source_name: "apmep",
    source_url: "https://www.apmep.fr",
    fetched_at: new Date().toISOString(),
    exam: "dnb",
    session_year: options.year,
    discipline: options.discipline ?? "mathematiques",
    series: "generale",
    location: options.location ?? "metropole",
    variant: "standard",
    pdf_url: options.latexZip,
    latex_zip_url: options.latexZip,
    title: `DNB mathématiques ${options.location ?? "metropole"} ${options.year}`,
  };

  process.stdout.write(`[LaTeX] ${metadata.title}… `);
  const parsed = await parseLatexZipToExam(metadata, zipBytes, {
    withAssets: options.withAssets,
    assetsRoot: options.assetsRoot,
  });
  console.log(`ok (${parsed.exercises.length} exercises)`);

  const bundle: ExamBundle = {
    sources: [{ id: "apmep", source_name: "apmep", source_url: metadata.source_url, fetched_at: metadata.fetched_at }],
    papers: [parsed.paper],
    exercises: parsed.exercises,
    exercise_program_links: [],
  };

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Wrote ${options.out}`);
  console.log(`Papers: ${bundle.papers.length}; exercises: ${bundle.exercises.length}`);
}

async function collectPapers(options: CliOptions): Promise<CollectedPaper[]> {
  const eduscolOptions: EduscolCollectOptions = {
    year: options.year,
    discipline: options.discipline,
  };

  const batches = await Promise.all([
    options.source === "eduscol" || options.source === "all" ? collectEduscolDnb(eduscolOptions) : Promise.resolve([]),
    options.source === "amiens" || options.source === "all" ? collectAmiensDnbMaths({ year: options.year }) : Promise.resolve([]),
    options.source === "apmep" || options.source === "all" ? collectApmepDnb({ year: options.year }) : Promise.resolve([]),
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
    } else if (arg === "--location" && value !== undefined) {
      options.location = value;
      index += 1;
    } else if (arg === "--latex-zip" && value !== undefined) {
      options.latexZip = value;
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
  return value === "eduscol" || value === "amiens" || value === "apmep" || value === "all";
}

async function downloadFile(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-schoolprg)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

function normalizeDiscipline(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function printHelp(): void {
  console.log(`Usage: npm run build:dnb-annales -- [options]

Local LaTeX ZIP mode (APMEP, download manually):
  --latex-zip ~/Downloads/dnb2024_metropole.zip
  --year 2024
  --location metropole|amerique_du_nord|asie|polynesie|antilles_guyane
  --out exam-import/bundles/dnb-2024-metropole.json

Scrape mode:
  --source eduscol|amiens|all
  --year 2024
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
