/**
 * agent-creator — Creator agent (runs as a Claude Code subagent)
 *
 * Reads a PNG crop of a PDF region, generates SVG or HTML,
 * writes the result to an output file, and prints a JSON result.
 *
 * Called by the Claude Code orchestrator session via the Agent tool.
 * Never called directly by humans — use generate-assets.ts instead.
 *
 * Usage (invoked programmatically by orchestrator):
 *   node --experimental-strip-types exam-import/scripts/agent-creator.ts \
 *     --crop-png  /tmp/gen/ex4-geometrie-crop.png \
 *     --strategy  svg \
 *     --label     "Figure géométrique – triangles ABCDEF" \
 *     --alt       "Figure géométrique avec les triangles ABC..." \
 *     --out       /tmp/gen/ex4-geometrie.svg \
 *     [--qa-comments "Missing right-angle marker at A..."]
 */

import { readFile, writeFile } from "node:fs/promises";

interface CliArgs {
  cropPng: string;
  strategy: "svg" | "html";
  label: string;
  alt: string;
  out: string;
  qaComments?: string;
}

function parseArgs(args: string[]): CliArgs {
  const opts: Partial<CliArgs> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]; const v = args[i + 1];
    if (a === "--crop-png" && v)    { opts.cropPng = v; i++; }
    else if (a === "--strategy" && (v === "svg" || v === "html")) { opts.strategy = v; i++; }
    else if (a === "--label" && v)  { opts.label = v; i++; }
    else if (a === "--alt" && v)    { opts.alt = v; i++; }
    else if (a === "--out" && v)    { opts.out = v; i++; }
    else if (a === "--qa-comments" && v) { opts.qaComments = v; i++; }
  }
  if (!opts.cropPng || !opts.strategy || !opts.label || !opts.out) {
    throw new Error("Missing required args: --crop-png --strategy --label --out");
  }
  return opts as CliArgs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // ── Read the crop PNG so the orchestrator can pass it to the Claude subagent ──
  // This script is a thin wrapper. The actual generation happens in the
  // Claude Code subagent spawned by the orchestrator. Here we just
  // emit the metadata the orchestrator needs to build its subagent prompt.

  const pngExists = await readFile(args.cropPng).then(() => true).catch(() => false);
  if (!pngExists) throw new Error(`Crop PNG not found: ${args.cropPng}`);

  // Emit a machine-readable prompt payload for the orchestrator subagent
  const payload = {
    role: "creator",
    strategy: args.strategy,
    crop_png_path: args.cropPng,
    label: args.label,
    alt: args.alt,
    out_path: args.out,
    qa_comments: args.qaComments ?? null,
    instructions: args.strategy === "svg" ? SVG_INSTRUCTIONS : HTML_INSTRUCTIONS,
  };

  console.log(JSON.stringify(payload, null, 2));
}

const SVG_INSTRUCTIONS = `\
Look at the image (the PDF crop). Reproduce it as a clean, self-contained SVG.

Rules:
- viewBox should match the figure's aspect ratio; use width="800" as default.
- Use <line>, <polyline>, <polygon>, <circle>, <path>, <rect> — no embedded bitmaps.
- stroke="black" fill="none" for outlines. Light grey (#e8e8e8) for filled regions.
- Text: font-family="serif", proportional font-size, fill="black".
- Right-angle markers: small square at the vertex corner.
- Measurement labels (cm, °): near the relevant edge, never overlapping lines.
- Arrows: <marker> with arrowhead on the path.
- Scratch blocks: <rect rx="4"> with dark fill (motion=blue #4C97FF, control=orange #FFAB19, operators=green #59C059) + white <text>.
- Charts: draw axes, ticks, numeric labels, then the curve/line precisely.
- Output ONLY the SVG — no markdown fences, no explanation, just the raw <svg>…</svg>.`;

const HTML_INSTRUCTIONS = `\
Look at the image (the PDF crop). Reproduce the table as clean, semantic HTML.

Rules:
- Start with <table> — no wrapping elements.
- Use <caption> if there is a title above the table.
- <thead> + <tbody>; <th scope="col"> for column headers, <th scope="row"> for row headers.
- Inline styles only:
    table: border-collapse:collapse;font-family:serif;font-size:14px;
    th,td: border:1px solid #333;padding:4px 8px;text-align:center;
    th: background:#f0f0f0;
- Reproduce every cell value exactly including units (μg/m³ etc.).
- colspan/rowspan for merged cells.
- Output ONLY the HTML — no markdown fences, no explanation, just the raw <table>…</table>.`;

main().catch((e) => { console.error(e.message); process.exit(1); });
