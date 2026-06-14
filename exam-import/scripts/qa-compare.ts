/**
 * qa-compare.ts
 *
 * QA comparison tool: parse the source LaTeX/ZIP and compare it against a
 * compiled bundle to surface discrepancies that need correction.
 *
 * Usage:
 *   node --experimental-strip-types exam-import/scripts/qa-compare.ts \
 *     --zip   <path/to/exam.zip> \
 *     --bundle <path/to/bundle.json> \
 *     --out   <path/to/qa-report.html>
 */

import { readFile, writeFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";

// ─── CLI args ─────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
const argMap: Record<string, string> = {};
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i] ?? "";
  if (a.startsWith("--") && i + 1 < rawArgs.length) {
    argMap[a.slice(2)] = rawArgs[++i] ?? "";
  }
}

const zipPath    = argMap.zip    as string | undefined;
const bundlePath = argMap.bundle as string | undefined;
const outPath    = argMap.out    as string | undefined;

if (!zipPath || !bundlePath || !outPath) {
  console.error("Usage: qa-compare.ts --zip <zip> --bundle <bundle.json> --out <report.html>");
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroundTruth {
  exerciseNumber: number;
  title: string;
  contextSnippet: string;          // first 300 chars of context text
  expectedQuestions: GTQuestion[];
  expectedImages: string[];        // filenames / block types
  missingMath: string[];           // math expressions that were stripped
  keySymbols: string[];            // mathcal, frac, etc. that should appear
}

interface GTQuestion {
  id: string;
  label: string;
  text: string;
  isContainer: boolean;            // true if this is "3." with sub-questions
  subquestions: string[];
  choices?: string[];              // for QCM
}

interface ParsedQuestion {
  id: string;
  label: string;
  text: string;
  choices?: string[];
  subquestions?: Array<{ text: string }>;
}

interface Discrepancy {
  severity: "error" | "warning" | "info";
  category: string;
  description: string;
  expected?: string;
  actual?: string;
}

interface ExerciseQAResult {
  exerciseNumber: number;
  title: string;
  discrepancies: Discrepancy[];
  stats: {
    expectedQuestions: number;
    parsedQuestions: number;
    expectedImages: number;
    parsedImages: number;
    questionsWithChoices: number;
    questionsWithSubquestions: number;
  };
}

// ─── LaTeX ground-truth extractor ─────────────────────────────────────────────

function extractGroundTruth(texContent: string): GroundTruth[] {
  const body = extractBody(texContent);
  const chunks = splitExercises(body);
  return chunks.map(({ number, title, body: chunkBody }) =>
    analyzeExercise(number, title, chunkBody),
  );
}

function extractBody(tex: string): string {
  const beginIdx = tex.indexOf("\\begin{document}");
  const endIdx   = tex.indexOf("\\end{document}");
  if (beginIdx >= 0) {
    const start = beginIdx + "\\begin{document}".length;
    const end   = endIdx >= 0 ? endIdx : tex.length;
    return tex.slice(start, end).trim();
  }
  return tex.trim();
}

function splitExercises(body: string): Array<{ number: number; title: string; body: string }> {
  const pattern = /\\textbf\{\s*Exercice\s+(\d{1,2})\s+\\hfill\s+(\d+)\s*points?[^}]*\}/gi;
  const matches = [...body.matchAll(pattern)];
  return matches.map((match, index) => {
    const matchEnd  = (match.index ?? 0) + match[0].length;
    const nextStart = matches[index + 1]?.index ?? body.length;
    const chunkBody = body.slice(matchEnd, nextStart).trim();
    const number    = parseInt(match[1] ?? String(index + 1), 10);
    const points    = match[2] ? ` (${match[2]} points)` : "";
    return { number, title: `Exercice ${number}${points}`, body: chunkBody };
  });
}

function analyzeExercise(number: number, title: string, body: string): GroundTruth {
  // ── Context snippet (everything before first \begin{enumerate}) ──────────────
  const enumIdx   = body.indexOf("\\begin{enumerate}");
  const preEnum   = enumIdx >= 0 ? body.slice(0, enumIdx) : body;
  const contextSnippet = roughLatexToText(preEnum).slice(0, 300);

  // ── Expected questions ────────────────────────────────────────────────────────
  // Check for QCM table first (Exercise 4 style)
  const qcmFromTable = extractQCMGroundTruth(body);
  const expectedQuestions = qcmFromTable.length > 0
    ? qcmFromTable.map((q, i) => ({
        id: String(i + 1),
        label: `${i + 1}.`,
        text: "",
        isContainer: false,
        subquestions: [],
        choices: q.choices,
      }))
    : extractQuestions(body);

  // ── Expected images ───────────────────────────────────────────────────────────
  const expectedImages: string[] = [];
  for (const m of body.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
    expectedImages.push(m[1] ?? "");
  }
  // Count uncommented pspicture blocks
  let pspCount = 0;
  for (const m of body.matchAll(/\\begin\{pspicture\*?\}/g)) {
    const startIdx  = m.index ?? 0;
    const lineStart = body.lastIndexOf("\n", startIdx);
    const prefix    = body.slice(lineStart + 1, startIdx).trimStart();
    if (!prefix.startsWith("%")) pspCount++;
  }
  for (let i = 0; i < pspCount; i++) expectedImages.push(`pspicture[${i + 1}]`);
  for (const _ of body.matchAll(/\\begin\{scratch\}/g)) {
    expectedImages.push("scratch");
  }

  // ── Math expressions that should NOT be blank after parsing ──────────────────
  const missingMath: string[] = [];
  for (const m of body.matchAll(/\$((?:[^$\\]|\\[\s\S])*)\$/g)) {
    const inner = m[1] ?? "";
    if (/\\d?frac\{/.test(inner)) missingMath.push(m[0]);
    if (/\\mathcal\{/.test(inner)) missingMath.push(m[0]);
    if (/\\text\{/.test(inner)) missingMath.push(m[0]);
    if (/\\vec\{|\\vect\{/.test(inner)) missingMath.push(m[0]);
  }

  // ── Key symbol categories ─────────────────────────────────────────────────────
  const keySymbols: string[] = [];
  if (/\\d?frac\{/.test(body)) keySymbols.push("fraction");
  if (/\\mathcal\{/.test(body)) keySymbols.push("mathcal");
  if (/\\text\{/.test(body)) keySymbols.push("\\text{...}");
  if (/\\cos|\\sin|\\tan/.test(body)) keySymbols.push("trig");
  if (/\\sqrt\{/.test(body)) keySymbols.push("sqrt");

  return { exerciseNumber: number, title, contextSnippet, expectedQuestions, expectedImages, missingMath, keySymbols };
}

function extractQuestions(body: string): GTQuestion[] {
  // Walk the enumerate structure to build hierarchical questions
  const questions: GTQuestion[] = [];
  let depth = 0;
  let counter = 0;
  let subCounter = 0;
  let currentParent: GTQuestion | null = null;

  // Flatten into token stream
  const tokens = tokenizeEnumerate(body);

  for (const tok of tokens) {
    if (tok.type === "begin-enumerate") {
      depth++;
      if (depth === 1) counter = 0;
      if (depth === 2) subCounter = 0;
    } else if (tok.type === "end-enumerate") {
      depth--;
      currentParent = null;
    } else if (tok.type === "item") {
      if (depth === 1) {
        counter++;
        const q: GTQuestion = {
          id:          String(counter),
          label:       `${counter}.`,
          text:        tok.text,
          isContainer: tok.hasNestedEnumerate,
          subquestions: [],
        };
        questions.push(q);
        currentParent = q;
      } else if (depth === 2 && currentParent) {
        subCounter++;
        const label = String.fromCharCode(96 + subCounter); // a, b, c...
        currentParent.subquestions.push(`${label}. ${tok.text}`);
      }
    }
  }

  // QCM: extract choices from tabularx
  const qcmQuestions = extractQCMGroundTruth(body);
  if (qcmQuestions.length > 0) {
    // Merge choices into existing questions by index
    for (let i = 0; i < qcmQuestions.length; i++) {
      const q = questions[i];
      if (q) q.choices = qcmQuestions[i]?.choices;
    }
  }

  return questions;
}

interface Token {
  type: "begin-enumerate" | "end-enumerate" | "item";
  text: string;
  hasNestedEnumerate: boolean;
}

function tokenizeEnumerate(body: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  // Track nesting depth of ALL environments so we only process items that are
  // directly inside an \begin{enumerate} (not inside tabularx, itemize, etc.)
  let enumDepth = 0; // depth counting only enumerate environments
  let envDepth  = 0; // depth counting ALL environments (to skip non-enumerate items)

  // Pre-tokenize all significant positions
  type Ev = { pos: number; kind: "begin-enum" | "end-enum" | "begin-other" | "end-other" | "item" };
  const events: Ev[] = [];

  for (const m of body.matchAll(/\\begin\{(enumerate)\}|\\end\{(enumerate)\}|\\begin\{([^}]+)\}|\\end\{([^}]+)\}|\\item\b/g)) {
    const kind = m[0].startsWith("\\begin{enumerate}") ? "begin-enum"
               : m[0].startsWith("\\end{enumerate}")   ? "end-enum"
               : m[0].startsWith("\\begin{")           ? "begin-other"
               : m[0].startsWith("\\end{")             ? "end-other"
               : "item";
    // Skip commented-out matches
    const lineStart = body.lastIndexOf("\n", m.index ?? 0);
    const linePrefix = body.slice(lineStart + 1, m.index ?? 0).trimStart();
    if (linePrefix.startsWith("%")) continue;
    events.push({ pos: m.index ?? 0, kind });
  }
  events.sort((a, b) => a.pos - b.pos);

  const BEGIN_ENUM = "\\begin{enumerate}";
  const END_ENUM   = "\\end{enumerate}";

  let evIdx = 0;
  while (evIdx < events.length) {
    const ev = events[evIdx]!;
    evIdx++;

    if (ev.kind === "begin-enum") {
      enumDepth++;
      tokens.push({ type: "begin-enumerate", text: "", hasNestedEnumerate: false });
    } else if (ev.kind === "end-enum") {
      enumDepth = Math.max(0, enumDepth - 1);
      tokens.push({ type: "end-enumerate", text: "", hasNestedEnumerate: false });
    } else if (ev.kind === "item" && enumDepth >= 1) {
      // Collect item content: from after \item to the next sibling \item or \end{enumerate}
      const itemStart = ev.pos + (body.slice(ev.pos).match(/^\\item\b\s*/))?.[0]?.length ?? 6;
      // Find end: walk events to find next same-depth item or end-enumerate
      let depth2 = 0; // only counting enumerates
      let itemEnd = body.length;
      for (let j = evIdx; j < events.length; j++) {
        const next = events[j]!;
        if (next.kind === "begin-enum") { depth2++; }
        else if (next.kind === "end-enum") {
          if (depth2 === 0) { itemEnd = next.pos; break; }
          depth2--;
        } else if (next.kind === "item" && depth2 === 0) {
          itemEnd = next.pos; break;
        }
      }
      const itemBody = body.slice(itemStart, itemEnd);
      // Strip nested enumerate blocks to get just this item's own text
      const ownText = itemBody.replace(/\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}/g, "");
      const text = roughLatexToText(ownText).slice(0, 200).trim();
      const hasNested = /\\begin\{enumerate\}/.test(itemBody);
      tokens.push({ type: "item", text, hasNestedEnumerate: hasNested });
    }
    // else: skip (items outside enumerate, other environments)
  }

  return tokens;
}

function extractQCMGroundTruth(body: string): Array<{ choices: string[] }> {
  const tablePattern = /\\begin\{tabular[x*]?\}[\s\S]*?\\end\{tabular[x*]?\}/g;
  for (const match of body.matchAll(tablePattern)) {
    const block = match[0];
    if (!/R[eé]ponse/i.test(block)) continue;

    // Strip inner environments
    const stripped = block
      .replace(/\\begin\{pspicture\*?\}[\s\S]*?\\end\{pspicture\*?\}/g, "[Schéma]")
      .replace(/\\begin\{minipage\}[\s\S]*?\\end\{minipage\}/g, "[fig]")
      .replace(/%[^\n]*/g, "");

    const rows = stripped.split(/\\\\/).map(r => r.replace(/\\hline\b/g, "").trim()).filter(Boolean);
    const result: Array<{ choices: string[] }> = [];
    let headerSkipped = false;

    for (const row of rows) {
      const cells = row.split("&").map(c => roughLatexToText(c).trim());
      if (cells.length < 4) continue;
      if (!headerSkipped && /R[eé]ponse/i.test(cells[1] ?? "")) { headerSkipped = true; continue; }
      const prompt = cells[0] ?? "";
      if (!prompt.trim()) continue;
      result.push({ choices: [cells[1] ?? "", cells[2] ?? "", cells[3] ?? ""] });
    }

    if (result.length > 0) return result;
  }
  return [];
}

/** Very rough LaTeX → plain text for ground truth labels */
function roughLatexToText(tex: string): string {
  let t = tex;
  t = t.replace(/%[^\n]*/g, "");
  t = t.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, " ");
  t = t.replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  t = t.replace(/\\mathcal\{([^}]*)\}/g, "𝒞"); // approximate
  t = t.replace(/\\text\{([^}]*)\}/g, "$1");
  t = t.replace(/\\textbf\{([^}]*)\}/g, "$1");
  t = t.replace(/\\emph\{([^}]*)\}/g, "$1");
  t = t.replace(/\$([^$]*)\$/g, "$1");
  t = t.replace(/\\\[[\s\S]*?\\\]/g, "[formule]");
  t = t.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, " ");
  t = t.replace(/[{}$]/g, "");
  t = t.replace(/[ \t]+/g, " ").trim();
  return t;
}

// ─── Comparison engine ────────────────────────────────────────────────────────

interface BundleExercise {
  exerciseNumber: number;
  title: string;
  raw_text: string;
  parsed_content: {
    context: string;
    questions: ParsedQuestion[];
    documents: Array<{ type: string; local_path?: string; label?: string }>;
  };
}

function compareExercise(gt: GroundTruth, parsed: BundleExercise): ExerciseQAResult {
  const discrepancies: Discrepancy[] = [];
  const pc = parsed.parsed_content;
  const questions = pc.questions ?? [];
  const documents = pc.documents ?? [];

  // Count images in parsed documents
  const parsedImageCount = documents.filter(d => d.type === "image").length;
  const parsedTableCount = documents.filter(d => d.type === "table").length;

  // ── Question count ───────────────────────────────────────────────────────────
  const expectedTotal = gt.expectedQuestions.reduce((n, q) => n + 1 + q.subquestions.length, 0);
  const actualTotal   = questions.reduce((n: number, q: ParsedQuestion) => n + 1 + (q.subquestions?.length ?? 0), 0);

  if (gt.expectedQuestions.length !== questions.length) {
    discrepancies.push({
      severity: "error",
      category: "Questions",
      description: `Top-level question count mismatch`,
      expected: `${gt.expectedQuestions.length} questions`,
      actual:   `${questions.length} questions`,
    });
  }

  // ── Per-question check ───────────────────────────────────────────────────────
  for (let i = 0; i < Math.max(gt.expectedQuestions.length, questions.length); i++) {
    const gtQ   = gt.expectedQuestions[i];
    const pQ    = questions[i];
    const qLabel = `Q${i + 1}`;

    if (!gtQ) {
      discrepancies.push({ severity: "warning", category: "Questions", description: `${qLabel}: extra question in bundle not in source`, actual: pQ?.text?.slice(0, 80) });
      continue;
    }
    if (!pQ) {
      discrepancies.push({ severity: "error", category: "Questions", description: `${qLabel}: question from source missing in bundle`, expected: gtQ.text.slice(0, 80) });
      continue;
    }

    // Check container questions have sub-questions
    if (gtQ.isContainer && (pQ.subquestions?.length ?? 0) === 0) {
      const expectedSubs = gtQ.subquestions.length;
      const parsedSubs   = pQ.subquestions?.length ?? 0;
      if (parsedSubs < expectedSubs) {
        discrepancies.push({
          severity: "error",
          category: "Sub-questions",
          description: `${qLabel}: sub-questions missing or flattened`,
          expected: `${expectedSubs} sub-questions: ${gtQ.subquestions.slice(0, 3).join("; ")}`,
          actual:   parsedSubs === 0 ? "no sub-questions (flattened into top-level)" : `only ${parsedSubs}`,
        });
      }
    }

    // Check QCM choices
    if (gtQ.choices && gtQ.choices.length > 0) {
      const parsedChoices = pQ.choices ?? (pQ as unknown as { options?: string[] }).options ?? [];
      if (parsedChoices.length === 0) {
        discrepancies.push({
          severity: "error",
          category: "QCM Choices",
          description: `${qLabel}: A/B/C choices missing`,
          expected: gtQ.choices.join(" | "),
          actual:   "no choices",
        });
      } else if (parsedChoices.join("|") !== gtQ.choices.join("|")) {
        discrepancies.push({
          severity: "warning",
          category: "QCM Choices",
          description: `${qLabel}: choices differ`,
          expected: gtQ.choices.join(" | "),
          actual:   parsedChoices.join(" | "),
        });
      }
    }

    // Check question text for important content
    const qText = pQ.text ?? "";
    if (gtQ.text.length > 5 && qText === gtQ.label) {
      discrepancies.push({
        severity: "error",
        category: "Question text",
        description: `${qLabel}: question is just a bare label "${qText}" — text content missing`,
        expected: gtQ.text.slice(0, 100),
        actual:   qText,
      });
    }

    // Detect stripped math fractions
    if (/\\d?frac\{/.test(gtQ.text) && !/\(/.test(qText)) {
      discrepancies.push({
        severity: "warning",
        category: "Math",
        description: `${qLabel}: fraction likely stripped (\\dfrac or \\frac not rendered as text)`,
        expected: "fraction like (1)/(37)",
        actual:   qText.slice(0, 100),
      });
    }
  }

  // ── Image / diagram count ────────────────────────────────────────────────────
  const expectedImageCount = gt.expectedImages.length;
  if (parsedImageCount < expectedImageCount) {
    discrepancies.push({
      severity: "error",
      category: "Images",
      description: `Fewer images in bundle than expected`,
      expected: `${expectedImageCount} images/diagrams: ${gt.expectedImages.join(", ")}`,
      actual:   `${parsedImageCount} images`,
    });
  }

  // ── Context / symbol checks ───────────────────────────────────────────────────
  const rawText = parsed.raw_text ?? pc.context ?? "";

  if (gt.keySymbols.includes("fraction") && !/\(/.test(rawText)) {
    discrepancies.push({
      severity: "warning",
      category: "Math",
      description: "Fractions (\\frac / \\dfrac) in source — verify they appear as (num)/(den) in text",
    });
  }

  if (gt.keySymbols.includes("mathcal")) {
    // Check if any calligraphic letter appears (𝒞 or at least the base letter)
    const hasCal = /𝒞|𝒟|𝒜|ℬ/.test(rawText) || /\bC\b/.test(rawText);
    if (!hasCal) {
      discrepancies.push({
        severity: "warning",
        category: "Math",
        description: "\\mathcal{} in source — calligraphic letter may be missing from text",
      });
    }
  }

  if (gt.keySymbols.includes("\\text{...}")) {
    // Check \\text{cm} etc didn't become "~^2" style
    if (/~\s*\^/.test(rawText)) {
      discrepancies.push({
        severity: "warning",
        category: "Math",
        description: 'Unit labels like "cm²" may show as "~ ^2" — \\text{} not preserved',
        actual: rawText.match(/~\s*\^[\w\d]+/)?.[0] ?? "",
      });
    }
  }

  // ── Context completeness ─────────────────────────────────────────────────────
  const context = pc.context ?? "";
  if (context.length < 20 && gt.contextSnippet.length > 50) {
    discrepancies.push({
      severity: "warning",
      category: "Context",
      description: "Context appears very short compared to source",
      expected: gt.contextSnippet.slice(0, 100),
      actual:   context.slice(0, 100),
    });
  }

  // Check for raw LaTeX leaking through
  if (/\\begin\{|\\end\{|\\\[/.test(rawText)) {
    const leaks = (rawText.match(/\\begin\{[^}]+\}|\\end\{[^}]+\}|\\\[/g) ?? []).slice(0, 5);
    discrepancies.push({
      severity: "warning",
      category: "LaTeX leak",
      description: "Raw LaTeX commands found in text",
      actual: leaks.join(", "),
    });
  }

  if (parsedTableCount === 0 && /\\begin\{tabular/.test("")) {
    // (only if we know tables exist — skip for now)
  }

  return {
    exerciseNumber: gt.exerciseNumber,
    title: gt.title,
    discrepancies,
    stats: {
      expectedQuestions: gt.expectedQuestions.length,
      parsedQuestions:   questions.length,
      expectedImages:    expectedImageCount,
      parsedImages:      parsedImageCount,
      questionsWithChoices:      questions.filter((q: ParsedQuestion) => (q.choices?.length ?? 0) > 0).length,
      questionsWithSubquestions: questions.filter((q: ParsedQuestion) => (q.subquestions?.length ?? 0) > 0).length,
    },
  };
}

// ─── HTML report ──────────────────────────────────────────────────────────────

function buildHtmlReport(results: ExerciseQAResult[], bundlePath: string, zipPath: string): string {
  const totalErrors   = results.reduce((n, r) => n + r.discrepancies.filter(d => d.severity === "error").length, 0);
  const totalWarnings = results.reduce((n, r) => n + r.discrepancies.filter(d => d.severity === "warning").length, 0);

  const exerciseHtml = results.map(r => {
    const errors   = r.discrepancies.filter(d => d.severity === "error");
    const warnings = r.discrepancies.filter(d => d.severity === "warning");
    const infos    = r.discrepancies.filter(d => d.severity === "info");
    const statusEmoji = errors.length > 0 ? "🔴" : warnings.length > 0 ? "🟡" : "✅";

    const discHtml = r.discrepancies.map(d => {
      const color = d.severity === "error" ? "#fee2e2" : d.severity === "warning" ? "#fef9c3" : "#e0f2fe";
      const icon  = d.severity === "error" ? "❌" : d.severity === "warning" ? "⚠️" : "ℹ️";
      return `
      <tr style="background:${color}">
        <td>${icon}</td>
        <td><strong>${d.category}</strong></td>
        <td>${d.description}</td>
        <td style="font-family:monospace;font-size:0.85em;color:#166534">${d.expected ? escHtml(d.expected) : "—"}</td>
        <td style="font-family:monospace;font-size:0.85em;color:#991b1b">${d.actual   ? escHtml(d.actual)   : "—"}</td>
      </tr>`;
    }).join("");

    return `
    <section style="border:1px solid #e5e7eb;border-radius:8px;margin:16px 0;padding:0;overflow:hidden">
      <header style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;gap:12px;align-items:center">
        <span style="font-size:1.4em">${statusEmoji}</span>
        <h2 style="margin:0;font-size:1em">${r.title}</h2>
        <span style="margin-left:auto;font-size:0.85em;color:#6b7280">
          Q: ${r.stats.parsedQuestions}/${r.stats.expectedQuestions} &nbsp;|&nbsp;
          Imgs: ${r.stats.parsedImages}/${r.stats.expectedImages} &nbsp;|&nbsp;
          Choices: ${r.stats.questionsWithChoices} &nbsp;|&nbsp;
          Sub-q: ${r.stats.questionsWithSubquestions}
        </span>
      </header>
      ${r.discrepancies.length === 0
        ? '<p style="padding:12px 16px;margin:0;color:#166534">✅ No discrepancies found</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:0.9em">
            <thead style="background:#f3f4f6">
              <tr>
                <th style="padding:6px 8px;width:28px"></th>
                <th style="padding:6px 8px;text-align:left;width:120px">Category</th>
                <th style="padding:6px 8px;text-align:left">Issue</th>
                <th style="padding:6px 8px;text-align:left;width:220px">Expected</th>
                <th style="padding:6px 8px;text-align:left;width:220px">Actual</th>
              </tr>
            </thead>
            <tbody>${discHtml}</tbody>
          </table>`
      }
    </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>QA Report — Brevet 2024</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1100px; margin: 0 auto; padding: 24px; color: #111; }
    h1   { font-size: 1.5em; }
    table td, table th { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  </style>
</head>
<body>
  <h1>📋 QA Report — DNB Brevet 2024</h1>
  <p style="color:#6b7280;font-size:0.9em">
    Source: <code>${escHtml(zipPath)}</code><br>
    Bundle: <code>${escHtml(bundlePath)}</code><br>
    Generated: ${new Date().toISOString()}
  </p>

  <div style="display:flex;gap:16px;margin:16px 0">
    <div style="background:#fee2e2;border-radius:8px;padding:12px 20px;flex:1;text-align:center">
      <div style="font-size:2em;font-weight:bold">${totalErrors}</div>
      <div style="color:#991b1b">Errors</div>
    </div>
    <div style="background:#fef9c3;border-radius:8px;padding:12px 20px;flex:1;text-align:center">
      <div style="font-size:2em;font-weight:bold">${totalWarnings}</div>
      <div style="color:#92400e">Warnings</div>
    </div>
    <div style="background:#dcfce7;border-radius:8px;padding:12px 20px;flex:1;text-align:center">
      <div style="font-size:2em;font-weight:bold">${results.filter(r => r.discrepancies.filter(d => d.severity === "error").length === 0).length}/${results.length}</div>
      <div style="color:#166534">Exercises OK</div>
    </div>
  </div>

  ${exerciseHtml}
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load ZIP and extract LaTeX
  const zipBytes  = await readFile(zipPath!);
  const zipFiles  = unzipSync(new Uint8Array(zipBytes));
  const texEntry  = Object.keys(zipFiles).find(k => k.endsWith(".tex") && !k.includes("__MACOSX"));
  if (!texEntry) throw new Error("No .tex file found in ZIP");
  const texContent = strFromU8(zipFiles[texEntry]!);

  // Load bundle
  const bundleRaw = await readFile(bundlePath!, "utf8");
  const bundle    = JSON.parse(bundleRaw) as { exercises: BundleExercise[] };
  const exercises = bundle.exercises ?? [];

  // Extract ground truths
  const groundTruths = extractGroundTruth(texContent);
  console.log(`Ground truth: ${groundTruths.length} exercises`);
  console.log(`Bundle:       ${exercises.length} exercises`);

  // Log per-exercise GT summary
  for (const gt of groundTruths) {
    console.log(`\n  Ex${gt.exerciseNumber}: ${gt.title}`);
    console.log(`    expected questions: ${gt.expectedQuestions.length}`);
    console.log(`    expected images:    ${gt.expectedImages.join(", ")}`);
    gt.expectedQuestions.forEach((q, i) => {
      const subs = q.subquestions.length ? ` [${q.subquestions.length} sub-q]` : "";
      const cho  = q.choices ? ` [choices: ${q.choices.join("/")}]` : "";
      console.log(`      Q${i+1}: ${q.text.slice(0, 70)}${subs}${cho}`);
    });
  }

  // Compare
  const results: ExerciseQAResult[] = [];
  for (let i = 0; i < Math.max(groundTruths.length, exercises.length); i++) {
    const gt     = groundTruths[i];
    const parsed = exercises[i];
    if (!gt || !parsed) {
      console.warn(`  Missing exercise at index ${i}`);
      continue;
    }
    results.push(compareExercise(gt, parsed));
  }

  // Print summary to console
  console.log("\n─── QA Summary ───────────────────────────────");
  for (const r of results) {
    const err  = r.discrepancies.filter(d => d.severity === "error").length;
    const warn = r.discrepancies.filter(d => d.severity === "warning").length;
    const icon = err > 0 ? "🔴" : warn > 0 ? "🟡" : "✅";
    console.log(`${icon} ${r.title}: ${err} errors, ${warn} warnings`);
    for (const d of r.discrepancies) {
      const pfx = d.severity === "error" ? "  ❌" : "  ⚠️";
      console.log(`${pfx} [${d.category}] ${d.description}`);
      if (d.expected) console.log(`       expected: ${d.expected}`);
      if (d.actual)   console.log(`       actual:   ${d.actual}`);
    }
  }

  // Write HTML report
  const html = buildHtmlReport(results, bundlePath!, zipPath!);
  await writeFile(outPath!, html, "utf8");
  console.log(`\n✅ QA report written to: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
