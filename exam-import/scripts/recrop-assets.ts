/**
 * recrop-assets.ts
 *
 * Re-runs the PDF crop pipeline for a single exam paper without re-parsing the
 * LaTeX or downloading anything. Useful after DPI / format changes.
 *
 * Usage:
 *   node --experimental-strip-types exam-import/scripts/recrop-assets.ts \
 *     --bundle  exam-import/bundles/dnb-apmep-2018-metropole-reunion.json \
 *     --paper   "dnb:apmep:2018:mathematiques:generale:metropole-reunion:standard:70e8beb86595" \
 *     --pdf     /path/to/exam.pdf \
 *     [--assets-root exam-import/assets]
 */

import { readFile } from "node:fs/promises";
import { applyCropsToExercises } from "./pdf-crop-assets.ts";
import type { ExamExercise, ExamPaper } from "../parsers/pdf-to-exam.ts";

interface Options {
  bundlePath: string;
  paperId: string;
  pdfPath: string;
  assetsRoot: string;
}

interface Bundle {
  papers: ExamPaper[];
  exercises: ExamExercise[];
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const raw = await readFile(opts.bundlePath, "utf8");
  const bundle: Bundle = JSON.parse(raw);

  const paper = bundle.papers.find((p) => p.id === opts.paperId);
  if (!paper) {
    throw new Error(`Paper "${opts.paperId}" not found in bundle. Available:\n${bundle.papers.map((p) => `  ${p.id}`).join("\n")}`);
  }

  const exercises = bundle.exercises.filter((e) => e.paper_id === opts.paperId);
  if (exercises.length === 0) {
    throw new Error(`No exercises found for paper "${opts.paperId}"`);
  }

  const pdfBytes = new Uint8Array(await readFile(opts.pdfPath));

  console.log(`Re-cropping ${exercises.length} exercises for: ${paper.id}`);
  console.log(`PDF: ${opts.pdfPath}`);
  console.log(`Assets root: ${opts.assetsRoot}`);

  await applyCropsToExercises(paper, exercises, pdfBytes, opts.assetsRoot);

  console.log("Done. Check exam-import/assets/ for the new WebP files.");
}

function parseArgs(args: string[]): Options {
  const opts: Options = {
    bundlePath: "",
    paperId: "",
    pdfPath: "",
    assetsRoot: "exam-import/assets",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const val = args[i + 1];
    if (arg === "--bundle" && val) { opts.bundlePath = val; i++; }
    else if (arg === "--paper" && val) { opts.paperId = val; i++; }
    else if (arg === "--pdf" && val) { opts.pdfPath = val; i++; }
    else if (arg === "--assets-root" && val) { opts.assetsRoot = val; i++; }
    else { throw new Error(`Unknown option: ${arg}`); }
  }

  if (!opts.bundlePath) throw new Error("--bundle is required");
  if (!opts.paperId) throw new Error("--paper is required");
  if (!opts.pdfPath) throw new Error("--pdf is required");

  return opts;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
