/**
 * agent-qa — QA agent (runs as a Claude Code subagent)
 *
 * Given paths to the original PDF crop PNG and the generated asset
 * (SVG rendered as PNG, or HTML string), emits a structured prompt
 * payload for the Claude Code QA subagent to evaluate.
 *
 * Called by the Claude Code orchestrator session via the Agent tool.
 * Never called directly by humans — use generate-assets.ts instead.
 *
 * Usage:
 *   node --experimental-strip-types exam-import/scripts/agent-qa.ts \
 *     --source-png   /tmp/gen/ex4-geometrie-crop.png \
 *     --generated    /tmp/gen/ex4-geometrie-rendered.png \
 *     --strategy     svg \
 *     --label        "Figure géométrique – triangles ABCDEF"
 */

import { readFile } from "node:fs/promises";

interface CliArgs {
  sourcePng: string;
  generated: string;       // PNG for svg, raw HTML file path for html
  strategy: "svg" | "html";
  label: string;
  round: number;
}

function parseArgs(args: string[]): CliArgs {
  const opts: Partial<CliArgs> = { round: 1 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i]; const v = args[i + 1];
    if (a === "--source-png" && v)  { opts.sourcePng = v; i++; }
    else if (a === "--generated" && v) { opts.generated = v; i++; }
    else if (a === "--strategy" && (v === "svg" || v === "html")) { opts.strategy = v; i++; }
    else if (a === "--label" && v)  { opts.label = v; i++; }
    else if (a === "--round" && v)  { opts.round = parseInt(v, 10); i++; }
  }
  if (!opts.sourcePng || !opts.generated || !opts.strategy || !opts.label) {
    throw new Error("Missing required args: --source-png --generated --strategy --label");
  }
  return opts as CliArgs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const sourceExists = await readFile(args.sourcePng).then(() => true).catch(() => false);
  if (!sourceExists) throw new Error(`Source PNG not found: ${args.sourcePng}`);

  const generatedExists = await readFile(args.generated).then(() => true).catch(() => false);
  if (!generatedExists) throw new Error(`Generated file not found: ${args.generated}`);

  const payload = {
    role: "qa",
    strategy: args.strategy,
    source_png_path: args.sourcePng,
    generated_path: args.generated,
    label: args.label,
    round: args.round,
    instructions: QA_INSTRUCTIONS,
    verdict_format: "First line must be exactly: ACCEPT | REVISE: <bullets> | CROP",
  };

  console.log(JSON.stringify(payload, null, 2));
}

const QA_INSTRUCTIONS = `\
You are reviewing a regenerated exam asset against its original source.

Evaluation bar: "Would a student find this equivalent to the original for studying?"
- Minor style differences (line weight, exact font size) → acceptable
- Missing shapes, wrong labels, incorrect data values, wrong topology → NOT acceptable

Look at BOTH images:
  • Image 1 = original PDF crop (source of truth)
  • Image 2 = regenerated version (SVG rendered as PNG, or HTML screenshot)

Respond with EXACTLY one of these as your first line:
  ACCEPT
  REVISE: <concise bullet list of what is wrong and how to fix it>
  CROP

Use CROP only if the asset is a photo or is so complex that SVG/HTML cannot faithfully
reproduce it regardless of revision.

After the verdict line, add 1-2 sentences of explanation maximum.`;

main().catch((e) => { console.error(e.message); process.exit(1); });
