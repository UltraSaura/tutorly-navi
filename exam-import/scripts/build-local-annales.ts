/**
 * build-local-annales.ts
 *
 * Processes all local LaTeX ZIP / .tex files from the annales folder
 * into a single combined ExamBundle JSON.
 *
 * Usage:
 *   node --experimental-strip-types exam-import/scripts/build-local-annales.ts \
 *     --dir '/path/to/annales' \
 *     --out exam-import/bundles/dnb-local-annales.json
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, basename } from "node:path";
import { parseLatexZipToExam, parseLatexToExam } from "../parsers/parse-latex-exam.ts";
import type {
  CollectedPaper,
  ExamExercise,
  ExamPaper,
  ExamSource,
} from "../parsers/pdf-to-exam.ts";

interface ExamBundle {
  sources: ExamSource[];
  papers: ExamPaper[];
  exercises: ExamExercise[];
  exercise_program_links: never[];
}

// ─── File manifest ────────────────────────────────────────────────────────────
// Each entry describes one annale file. Add new files here.

interface AnnaleEntry {
  filename: string;
  year: number;
  location: string;
  variant?: string;
  series?: "generale" | "professionnelle" | null;
  displayTitle?: string;
}

const ANNALES: AnnaleEntry[] = [
  {
    filename: "Brevet_Antilles-Guyane_23_juin_2016.tex",
    year: 2016,
    location: "antilles_guyane",
    displayTitle: "DNB Antilles-Guyane juin 2016",
  },
  {
    filename: "Brevet_Metropole_14_sept_2017.tex",
    year: 2017,
    location: "metropole",
    displayTitle: "DNB Métropole septembre 2017",
  },
  {
    filename: "Brevet_Metropole_1_juillet_2019_DV-2.tex",
    year: 2019,
    location: "metropole",
    variant: "juillet",
    displayTitle: "DNB Métropole juillet 2019",
  },
  {
    filename: "Brevet_Metropole_16_sept_2019.zip",
    year: 2019,
    location: "metropole",
    variant: "septembre",
    displayTitle: "DNB Métropole septembre 2019",
  },
  {
    filename: "brevet_metropole_sept_2020_dv.zip",
    year: 2020,
    location: "metropole",
    displayTitle: "DNB Métropole septembre 2020",
  },
  {
    filename: "Brevet_Metropole_13_sept_2021_DV.zip",
    year: 2021,
    location: "metropole",
    displayTitle: "DNB Métropole septembre 2021",
  },
  {
    filename: "Brevet_metro_juin_2022_DV.zip",
    year: 2022,
    location: "metropole",
    displayTitle: "DNB Métropole juin 2022",
  },
  {
    filename: "Brevet_Metropole_26_juin_2023_FK.tex",
    year: 2023,
    location: "metropole",
    displayTitle: "DNB Métropole juin 2023",
  },
  {
    filename: "Brevet_Metropole_1_07_2024_DV.zip",
    year: 2024,
    location: "metropole",
    displayTitle: "DNB Métropole juillet 2024",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dir = opts.dir;
  const fetched_at = new Date().toISOString();

  const bundle: ExamBundle = {
    sources: [{
      id: "local_apmep",
      source_name: "apmep",
      source_url: "https://www.apmep.fr",
      fetched_at,
    }],
    papers: [],
    exercises: [],
    exercise_program_links: [],
  };

  for (const entry of ANNALES) {
    const filePath = `${dir}/${entry.filename}`;
    const ext = extname(entry.filename).toLowerCase();

    const metadata: CollectedPaper = {
      source_name: "apmep",
      source_url: "https://www.apmep.fr",
      fetched_at,
      exam: "dnb",
      session_year: entry.year,
      discipline: "mathematiques",
      series: entry.series ?? "generale",
      location: entry.location,
      variant: entry.variant ?? "standard",
      pdf_url: filePath,
      title: entry.displayTitle ?? `DNB ${entry.location} ${entry.year}`,
    };

    process.stdout.write(`[${ext === ".zip" ? "ZIP" : "LaTeX"}] ${metadata.title}… `);

    try {
      let parsed: Awaited<ReturnType<typeof parseLatexZipToExam>>;

      if (ext === ".zip") {
        const zipBytes = new Uint8Array(await readFile(filePath));
        parsed = await parseLatexZipToExam(metadata, zipBytes, { withAssets: true, assetsRoot: "exam-import/assets" });
      } else {
        const texContent = await readFile(filePath, "utf8");
        parsed = parseLatexToExam(texContent, metadata);
      }

      console.log(`ok (${parsed.exercises.length} exercises)`);
      bundle.papers.push(parsed.paper);
      bundle.exercises.push(...parsed.exercises);
    } catch (err) {
      console.warn(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await mkdir(dirname(opts.out), { recursive: true });
  await writeFile(opts.out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${opts.out}`);
  console.log(`Papers: ${bundle.papers.length}; exercises: ${bundle.exercises.length}`);
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

interface CliOptions {
  dir: string;
  out: string;
}

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = {
    dir: "",
    out: "exam-import/bundles/dnb-local-annales.json",
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) { opts.dir = args[++i]; }
    else if (args[i] === "--out" && args[i + 1]) { opts.out = args[++i]; }
  }
  if (!opts.dir) throw new Error("--dir <path> is required");
  return opts;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
