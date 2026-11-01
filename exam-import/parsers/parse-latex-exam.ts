import { execFile } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { join, basename as pathBasename, dirname } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { levelForExam, schoolCycleForExam } from "../../src/domain/exams.ts";
import {
  parseExercisePedagogical,
  sha256,
  type CollectedPaper,
  type ExamExercise,
  type ExamPaper,
  type ParsedExamPaper,
  type ParsingStatus,
} from "./pdf-to-exam.ts";
import type { StructuredTableDocument } from "./table-detector.ts";
import { unzipSync } from "fflate";
import { compilePsTricksToPng, compileScratch3ToPng, compileEpsViaLatex } from "../scripts/tikz-renderer.ts";

const execFileAsync = promisify(execFile);
const GS_PATH = "/opt/homebrew/bin/gs";
const CWEBP_PATH = "cwebp";

interface LatexExerciseChunk {
  number: number;
  title: string;
  body: string;
}

export function parseLatexToExam(texContent: string, metadata: CollectedPaper): ParsedExamPaper {
  const contentBytes = new TextEncoder().encode(texContent);
  const pdf_hash = sha256(contentBytes);

  const body = extractDocumentBody(texContent);
  const rawText = latexToText(body);
  const paper_id = buildPaperId(metadata, pdf_hash);
  const chunks = splitLatexExercises(body);
  const parsing_status: ParsingStatus =
    chunks.length >= 2 ? "parsed" : chunks.length === 1 ? "partial" : "failed";

  const exercises: ExamExercise[] = chunks.map((chunk, index) => {
    const exerciseRawText = latexToText(chunk.body);
    const exerciseNumber = chunk.number;
    const title = chunk.title;
    const parsed = parseExercisePedagogical(exerciseRawText, title, exerciseNumber);

    // Post-process: extract standalone questions from parts that have 0 questions.
    // This handles cases like Exercise 5 Partie B where the question is embedded
    // inside a minipage context rather than a numbered \enumerate list.
    for (const part of parsed.parts ?? []) {
      if (part.questions.length === 0 && part.context) {
        // Look for a sentence ending with '?' — that is the question
        const qMatch = part.context.match(/([^\n.]*\?)/);
        if (qMatch) {
          const questionText = qMatch[1].trim();
          // Remove the question sentence from the context
          part.context = part.context.replace(questionText, "").replace(/\n{3,}/g, "\n\n").trim();
          const newQ = {
            id: String((parsed.questions?.length ?? 0) + 1),
            label: "1.",
            text: questionText,
            answer_type: "numeric" as const,
            expected_answer: null,
            points: null,
            student_answer: null,
            options: [],
            subquestions: [],
          };
          part.questions = [newQ];
          parsed.questions = [...(parsed.questions ?? []), newQ];
        }
      }
    }

    // QCM extraction: try table-based QCM extraction whenever a QCM table is present.
    // Prefer QCM results over the text-based parseExercisePedagogical output because the
    // table parser gives clean (prompt, choices[]) pairs whereas the text parser embeds
    // the pipe-separated cells into the question text.
    const qcmQuestions = extractQcmQuestions(chunk.body);
    if (qcmQuestions && qcmQuestions.length > 0) {
      parsed.questions = qcmQuestions.map((q, i) => ({
        id: String(i + 1),
        label: `${i + 1}.`,
        text: q.prompt,
        answer_type: "multiple_choice" as const,
        choices: q.choices,
        expected_answer: null,
        points: null,
        student_answer: null,
        options: [],
        subquestions: [],
      }));
      parsed.confidence = "medium" as const;
    }

    const effectiveStatus: ParsingStatus =
      parsed.confidence === "low" ? "partial" : parsing_status;

    const tableDocs = extractLatexTableDocuments(chunk.body, `${paper_id}:ex${String(index + 1).padStart(2, "0")}`);
    if (tableDocs.length > 0) {
      parsed.documents = [...tableDocs, ...parsed.documents];
    }

    return {
      id: `${paper_id}:ex${String(index + 1).padStart(2, "0")}`,
      paper_id,
      source_name: metadata.source_name,
      source_url: metadata.source_url,
      fetched_at: metadata.fetched_at,
      exam: metadata.exam,
      session_year: metadata.session_year,
      discipline: metadata.discipline,
      series: metadata.series,
      location: metadata.location,
      variant: metadata.variant,
      pdf_url: metadata.pdf_url,
      pdf_hash,
      exercise_number: exerciseNumber,
      title,
      raw_text: exerciseRawText,
      parsing_status: effectiveStatus,
      parsed_content: parsed,
      parsing_confidence: parsed.confidence,
    } satisfies ExamExercise;
  });

  const paper: ExamPaper = {
    ...metadata,
    id: paper_id,
    level: levelForExam(metadata.exam),
    school_cycle: schoolCycleForExam(metadata.exam),
    pdf_hash,
    raw_text: rawText,
    exercises: exercises.map((ex) => ex.id),
    parsing_status,
  };

  return { paper, exercises };
}

function extractDocumentBody(tex: string): string {
  const beginIdx = tex.indexOf("\\begin{document}");
  const endIdx = tex.indexOf("\\end{document}");
  if (beginIdx >= 0) {
    const start = beginIdx + "\\begin{document}".length;
    const end = endIdx >= 0 ? endIdx : tex.length;
    return tex.slice(start, end).trim();
  }
  return tex.trim();
}

function splitLatexExercises(body: string): LatexExerciseChunk[] {
  // Matches: \textbf{Exercice 1 \hfill 11 points}
  const pattern = /\\textbf\{\s*Exercice\s+(\d{1,2})\s+\\hfill\s+(\d+)\s*points?[^}]*\}/gi;
  const matches = [...body.matchAll(pattern)];
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const matchEnd = (match.index ?? 0) + match[0].length;
    const nextStart = matches[index + 1]?.index ?? body.length;
    const chunkBody = body.slice(matchEnd, nextStart).trim();
    const number = Number.parseInt(match[1] ?? String(index + 1), 10);
    const points = match[2] ? ` (${match[2]} points)` : "";
    const title = `Exercice ${number}${points}`;
    return { number, title, body: chunkBody };
  });
}

function expandEnumerate(tex: string): string {
  // Stack-based enumerate expansion.
  // Level 1 → numeric labels ("1.", "2.", …)
  // Level 2+ → alphabetic labels ("a.", "b.", …)  so parseSubquestions can detect them.
  const counters: number[] = []; // one entry per active enumerate depth
  const result: string[] = [];
  let remaining = tex;

  while (remaining.length > 0) {
    const beginEnum = remaining.match(/^\\begin\{enumerate\}(\[[^\]]*\])?/);
    if (beginEnum) {
      const opts = beginEnum[1] ?? "";
      // resume: don't reset, continue from current depth counter
      if (!opts.includes("resume")) {
        counters.push(0);
      }
      result.push("\n");
      remaining = remaining.slice(beginEnum[0].length);
      continue;
    }

    const endEnum = remaining.match(/^\\end\{enumerate\}/);
    if (endEnum) {
      counters.pop();
      result.push("\n");
      remaining = remaining.slice(endEnum[0].length);
      continue;
    }

    const item = remaining.match(/^\\item\b\s*/);
    if (item) {
      if (counters.length > 0) {
        counters[counters.length - 1] = (counters[counters.length - 1] ?? 0) + 1;
        const n = counters[counters.length - 1]!;
        const depth = counters.length;
        if (depth === 1) {
          result.push(`\n${n}. `);
        } else {
          // Level 2+: use alphabetic labels ("a.", "b.", …)
          const letter = String.fromCharCode(96 + n); // a=1, b=2, …
          const indent = "  ".repeat(depth - 1);
          result.push(`\n${indent}${letter}. `);
        }
      } else {
        // Inside \itemize (no enumerate context)
        result.push("\n• ");
      }
      remaining = remaining.slice(item[0].length);
      continue;
    }

    result.push(remaining[0]!);
    remaining = remaining.slice(1);
  }

  return result.join("");
}

/**
 * Pre-process two-column "Programme A | Programme B" comparison tables.
 *
 * Must be called inside latexToText() AFTER scratch blocks are replaced with
 * [Programme Scratch] but BEFORE generic table stripping.
 *
 * Converts the tabular into clearly-labelled text sections so students can
 * distinguish Programme A (text description) from Programme B (Scratch image).
 */
function reformatProgrammeABTable(tex: string): string {
  // Match the full tabular block using a nested-brace-aware spec pattern
  const b3 = String.raw`\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}`;
  const tabRx = new RegExp(
    String.raw`\\begin\{tabular[xy*]?\}(?:\[[^\]]*\]|` + b3 + ")*" +
    String.raw`([\s\S]*?)` +
    String.raw`\\end\{tabular[xy*]?\}`,
    "g",
  );

  return tex.replace(tabRx, (match, content: string) => {
    // Only target Programme A/B comparison tables
    if (!content.includes("Programme A") || !content.includes("Programme B")) return match;

    // Split content into rows by \\ line-break
    const rows = content
      .split(/\\\\/)
      .map((r: string) => r.replace(/\\hline/g, "").trim())
      .filter((r: string) => r.length > 0);

    if (rows.length < 2) return match;

    // Find the data row: contains the itemize list and/or scratch placeholder
    const dataRow =
      rows.find((r: string) => r.includes("\\begin{itemize}") || r.includes("[Programme Scratch]")) ??
      rows[rows.length - 1];

    if (!dataRow) return match;

    // Brace-depth-aware split at the first & separating the two columns
    let col1 = "";
    let col2 = "";
    let depth = 0;
    let split = false;
    for (const ch of dataRow) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === "&" && depth === 0 && !split) {
        split = true;
        continue;
      }
      if (split) col2 += ch;
      else col1 += ch;
    }

    col1 = col1.trim();
    col2 = col2.trim();

    if (!col1 || !col2) return match;

    return `\n\nProgramme A :\n${col1}\n\nProgramme B :\n${col2}\n\n`;
  });
}

export function latexToText(tex: string): string {
  let t = tex;

  // Remove line comments
  t = t.replace(/%[^\n]*/g, "");

  // Replace pspicture/tikz diagrams with a placeholder (geometry, graphs)
  t = t.replace(/\\begin\{pspicture\*?\}[\s\S]*?\\end\{pspicture\*?\}/g, "\n[Schéma — voir document original]\n");
  t = t.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, "\n[Schéma — voir document original]\n");

  // Remove scratch programming blocks (but leave a placeholder)
  t = t.replace(/\\begin\{scratch\}[\s\S]*?\\end\{scratch\}/g, "[Programme Scratch]");

  // Reformat two-column Programme A / Programme B comparison tables into labeled sections.
  // Must run AFTER scratch → [Programme Scratch] substitution but BEFORE generic table stripping.
  t = reformatProgrammeABTable(t);

  // Remove center environments that contain only figures
  t = t.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, (_, inner: string) => {
    const stripped = inner.replace(/\\begin\{pspicture[\s\S]*?\\end\{pspicture\*?\}/g, "").trim();
    return stripped.length > 0 ? `\n${stripped}\n` : "\n";
  });

  // Tables — simplify to pipe-separated text
  // Use depth-3 brace matching to fully strip the column spec (e.g. {|m{8.5cm}|*{3}{>{\centering}X|}})
  {
    const b3 = String.raw`\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}`;
    const tabRx = new RegExp(
      String.raw`\\begin\{tabular[xy*]?\}(?:\[[^\]]*\]|` + b3 + ")+",
      "g",
    );
    t = t.replace(tabRx, "\n");
  }
  t = t.replace(/\\end\{tabular[xy*]?\}/g, "\n");
  t = t.replace(/\\hline\b/g, "");
  t = t.replace(/\\multicolumn\{\d+\}\{[^}]*\}\{([^}]*)\}/g, "$1");
  t = t.replace(/\\multirow\{\d+\}\{[^}]*\}/g, "");
  t = t.replace(/\\diagbox\{[^}]*\}\{[^}]*\}/g, "");
  t = t.replace(/&/g, " | ");

  // French guillemets
  t = t.replace(/\\og\b\s*/g, "« ");
  t = t.replace(/\\fg\b\s*(?:\{\})?/g, " »");

  // numprint \np{...}
  t = t.replace(/\\np\{([^}]+)\}/g, (_, n: string) => n.replace(/,(\d{3})/g, " $1"));

  // Common math/symbol replacements
  t = t.replace(/\\euro(?:logo)?\{?\}?/g, "€");
  t = t.replace(/\\degres?\b/g, "°");
  t = t.replace(/\\times\b/g, "×");
  t = t.replace(/\\cdot\b/g, "·");
  t = t.replace(/\\leq\b/g, "≤");
  t = t.replace(/\\geq\b/g, "≥");
  t = t.replace(/\\neq\b/g, "≠");
  t = t.replace(/\\approx\b/g, "≈");
  t = t.replace(/\\infty\b/g, "∞");
  t = t.replace(/\\pi\b/g, "π");
  // Fractions (both \frac and \dfrac)
  t = t.replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  t = t.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");
  t = t.replace(/\^\{([^}]*)\}/g, "^$1");
  t = t.replace(/\_\{([^}]*)\}/g, "_$1");
  t = t.replace(/\^([a-zA-Z0-9])/g, "^$1");
  t = t.replace(/_([a-zA-Z0-9])/g, "_$1");
  // \text{...} inside math — preserve the text content (e.g. \text{cm} in units)
  t = t.replace(/\\text\{([^}]*)\}/g, "$1");
  // Calligraphic / blackboard-bold letters — keep the letter
  t = t.replace(/\\mathcal\{([^}]*)\}/g, "$1");
  t = t.replace(/\\mathbb\{([^}]*)\}/g, "$1");
  t = t.replace(/\\mathit\{([^}]*)\}/g, "$1");
  t = t.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  // LaTeX tilde non-breaking space → regular space
  t = t.replace(/~/g, " ");
  // \up{...} superscripts (used in "1\up{er}")
  t = t.replace(/\\up\{([^}]*)\}/g, "$1");

  // Display math \[...\] — must run BEFORE the global \qquad→space rule so we can
  // intercept \qquad separators and turn them into newlines within the block.
  // This keeps side-by-side expressions (e.g. E_1 = ... \qquad E_2 = ...) each on
  // their own line instead of running together.
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => {
    const separated = inner
      .replace(/\\qquad\b/g, "\n")
      .replace(/\\quad\b/g, "\n")
      .trim();
    return `\n${separated}\n`;
  });

  // Spacing / layout commands
  t = t.replace(/\\(?:big|med|small)skip\b/g, "\n\n");
  t = t.replace(/\\(?:v|h)space\*?\{[^}]*\}/g, " ");
  t = t.replace(/\\hfill\b/g, " ");
  t = t.replace(/\\newpage\b/g, "\n");
  t = t.replace(/\\noindent\b/g, "");
  // \quad / \qquad remaining outside \[...\] blocks → single space
  t = t.replace(/\\(?:quad|qquad)\b/g, " ");
  t = t.replace(/\\[,;:!]\s*/g, " ");
  t = t.replace(/\\decofour(?:left|right)\b/g, "");

  // Font commands — keep their content
  for (const cmd of ["textbf", "emph", "textit", "texttt", "textrm", "textsf", "uline", "uwave", "underline", "sout", "footnotesize", "small", "large", "Large"]) {
    t = t.replace(new RegExp(`\\\\${cmd}\\{`, "g"), "");
  }

  // Remove footnotes
  t = t.replace(/\\footnote\{[^}]*\}/g, "");

  // Remove image references (actual images injected as separate document entries)
  t = t.replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]+\}/g, "");

  // parbox / minipage — strip wrapper, keep content
  t = t.replace(/\\parbox(?:\[[^\]]*\])?\{[^}]*\}\{/g, "");
  t = t.replace(/\\begin\{minipage\}(?:\[[^\]]*\])?\{[^}]*\}/g, "");
  t = t.replace(/\\end\{minipage\}/g, "");

  // Enumerate: convert \item to numbered items preserving counter across [resume]
  t = expandEnumerate(t);

  // Itemize
  t = t.replace(/\\begin\{itemize\}/g, "\n");
  t = t.replace(/\\end\{itemize\}/g, "\n");
  t = t.replace(/\\item\s*/g, "\n• ");

  // Strip tabular/tabularx/array column specs (handles up to 3 levels of nested braces)
  // e.g. \begin{tabularx}{\linewidth}{|m{8.5cm}|*{3}{>{\centering\arraybackslash}X|}}
  const brace3 = String.raw`\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}`;
  const tabularArgRx = new RegExp(
    String.raw`\\begin\{(?:tabular[xy*]?|array)\}(?:\[[^\]]*\]|` + brace3 + ")+",
    "g",
  );
  t = t.replace(tabularArgRx, "\n");

  // Generic remaining environments (strip up to two {…} args)
  t = t.replace(/\\begin\{[^}]+\}(?:\[[^\]]*\])?(?:\{[^}]*\})?(?:\{[^}]*\})?/g, "\n");
  t = t.replace(/\\end\{[^}]+\}/g, "\n");

  // Table/env line breaks (double backslash)
  t = t.replace(/\\\\\s*/g, "\n");

  // Display math \[...\] — preserve on its own line.
  // Inside each \[...\] block, convert \qquad / \quad to newlines so that
  // side-by-side expressions (e.g. E_1 = ... \qquad E_2 = ... \qquad E_3 = ...)
  // each appear on their own line rather than running together.
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => {
    const separated = inner
      .replace(/\\qquad\b/g, "\n")
      .replace(/\\quad\b/g, "\n")
      .trim();
    return `\n${separated}\n`;
  });

  // Inline math $...$ — keep content (math symbol replacements already applied above)
  t = t.replace(/\$((?:[^$\\]|\\[\s\S])*)\$/g, "$1");

  // Strip \psset{...} and similar PSTricks configuration commands
  t = t.replace(/\\psset\{[^}]*\}/g, "");

  // Named trig functions and Greek letters → readable Unicode/text.
  // These must run BEFORE the generic command stripper so they survive.
  t = t.replace(/\\cos\b/g, "cos");
  t = t.replace(/\\sin\b/g, "sin");
  t = t.replace(/\\tan\b/g, "tan");
  t = t.replace(/\\alpha\b/g, "α");
  t = t.replace(/\\beta\b/g, "β");
  t = t.replace(/\\gamma\b/g, "γ");
  t = t.replace(/\\delta\b/g, "δ");
  t = t.replace(/\\theta\b/g, "θ");
  t = t.replace(/\\lambda\b/g, "λ");
  t = t.replace(/\\mu\b/g, "μ");
  t = t.replace(/\\sigma\b/g, "σ");
  t = t.replace(/\\omega\b/g, "ω");

  // Remove remaining unknown commands (with optional [] and {} args)
  t = t.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, " ");

  // Clean up stray braces
  t = t.replace(/[{}]/g, "");

  // Strip lone QCM label suffixes like "1.~" or "2.~" (after tilde→space, becomes "1. ")
  // These appear at the start of QCM question text when the tabular cell starts with \textbf{N.~}
  t = t.replace(/^(\d+)\.\s+\n/gm, (m, n) => `${n}. `);

  // Normalize whitespace
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.trim();

  return t;
}

function buildPaperId(metadata: CollectedPaper, contentHash: string): string {
  return [
    "dnb",
    metadata.source_name,
    metadata.session_year,
    slugify(metadata.discipline),
    metadata.series ?? "toutes-series",
    slugify(metadata.location),
    metadata.variant,
    contentHash.slice(0, 12),
  ].join(":");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── LaTeX table extraction ───────────────────────────────────────────────────

export function extractLatexTableDocuments(body: string, exerciseIdPrefix: string): StructuredTableDocument[] {
  const innermostTabulars = findInnermostTabulars(body);
  const results: StructuredTableDocument[] = [];
  let tableIndex = 0;

  for (const { content, spec } of innermostTabulars) {
    const colCount = countTableColumns(spec);
    if (colCount < 2) continue; // Skip single-column text boxes

    const parsed = parseTabularContent(content);
    if (parsed === null || parsed.rows.length === 0) continue;

    tableIndex += 1;
    const label = inferTableLabel(body, content) ?? `Tableau ${tableIndex}`;
    const caption = inferTableCaption(body, content);

    results.push({
      id: `${exerciseIdPrefix}:table-${tableIndex}`,
      type: "table",
      label,
      caption: caption ?? label,
      table: {
        headers: parsed.headers,
        rows: parsed.rows,
      },
    });
  }

  return results;
}

interface InnermostTabular {
  content: string;
  spec: string;
}

function findInnermostTabulars(text: string): InnermostTabular[] {
  // Collect positions of all \begin{tabular} and \end{tabular}
  type TexEvent = { type: "begin" | "end"; pos: number; afterPos: number; spec: string };
  const events: TexEvent[] = [];

  const beginRx = /\\begin\{tabular[x*]?\}(?:\[[^\]]*\])?\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = beginRx.exec(text)) !== null) {
    events.push({ type: "begin", pos: m.index, afterPos: m.index + m[0].length, spec: m[1] ?? "" });
  }

  const endRx = /\\end\{tabular[x*]?\}/g;
  while ((m = endRx.exec(text)) !== null) {
    events.push({ type: "end", pos: m.index, afterPos: m.index + m[0].length, spec: "" });
  }

  events.sort((a, b) => a.pos - b.pos);

  const stack: Array<{ afterPos: number; spec: string }> = [];
  const results: InnermostTabular[] = [];

  for (const event of events) {
    if (event.type === "begin") {
      stack.push({ afterPos: event.afterPos, spec: event.spec });
    } else if (stack.length > 0) {
      const begin = stack.pop()!;
      const content = text.slice(begin.afterPos, event.pos);
      // Innermost: no nested \begin{tabular} inside
      if (!/\\begin\{tabular[x*]?\}/.test(content)) {
        results.push({ content, spec: begin.spec });
      }
    }
  }

  return results;
}

function countTableColumns(spec: string): number {
  // Count column specifiers: l, r, c, m{}, p{}, X (tabularx)
  return (spec.match(/[lrcX]|m\{[^}]*\}|p\{[^}]*\}/g) ?? []).length;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function parseTabularContent(content: string): ParsedTable | null {
  // Split into rows by \\ (with optional \hline after)
  const rawRows = content
    .split(/\\\\/)
    .map((row) => row.replace(/\\hline\b/g, "").replace(/%[^\n]*/g, "").trim())
    .filter((row) => row.length > 0);

  if (rawRows.length === 0) return null;

  const allCells = rawRows.map((row) =>
    row.split("&").map((cell) => cleanLatexCell(cell))
  );

  // Detect merged header: if second row first cell is empty, merge into first row
  let headerCells = allCells[0] ?? [];
  let dataStart = 1;

  if (allCells.length >= 2 && (allCells[1]?.[0] ?? "").trim() === "" && allCells[1].length > 1) {
    headerCells = headerCells.map((h, i) => {
      const cont = allCells[1]?.[i] ?? "";
      return cont.trim() ? `${h} ${cont}`.trim() : h;
    });
    dataStart = 2;
  }

  const dataRows = allCells.slice(dataStart).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (dataRows.length === 0) return null;

  return { headers: headerCells, rows: dataRows };
}

function cleanLatexCell(cell: string): string {
  let t = cell.trim();
  // Remove tilde-separated padding (~~text~~)
  t = t.replace(/~~([^~]*)~~/g, "$1");
  // Apply a subset of latexToText
  t = t.replace(/%[^\n]*/g, "");
  t = t.replace(/\\textbf\{([^}]*)\}/g, "$1");
  t = t.replace(/\\emph\{([^}]*)\}/g, "$1");
  t = t.replace(/\\textit\{([^}]*)\}/g, "$1");
  t = t.replace(/\\footnotesize\b/g, "");
  t = t.replace(/\\small\b/g, "");
  t = t.replace(/\\hspace\*?\{[^}]*\}/g, "");
  t = t.replace(/\\multicolumn\{\d+\}\{[^}]*\}\{([^}]*)\}/g, "$1");
  t = t.replace(/\\multirow\{\d+\}\{[^}]*\}/g, "");
  // Math: strip $...$ delimiters, keep content; simple symbol replacements
  t = t.replace(/\$([^$]*)\$/g, (_, inner: string) =>
    inner
      .replace(/\\mu\b/g, "μ")
      .replace(/\\cos\b/g, "cos").replace(/\\sin\b/g, "sin").replace(/\\tan\b/g, "tan")
      .replace(/\\alpha\b/g, "α").replace(/\\beta\b/g, "β").replace(/\\theta\b/g, "θ")
      .replace(/\\gamma\b/g, "γ").replace(/\\delta\b/g, "δ").replace(/\\pi\b/g, "π")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
      .replace(/\\mathcal\{([^}]*)\}/g, "$1")
      .replace(/\\[a-zA-Z]+\*?(?:\{[^}]*\})*/g, "")
  );
  t = t.replace(/\\np\{([^}]+)\}/g, (_, n: string) => n.replace(/,(\d{3})/g, " $1"));
  t = t.replace(/\\euro(?:logo)?\{?\}?/g, "€");
  // Strip display math delimiters \[...\] but keep the content (e.g. list of numbers in Q5)
  t = t.replace(/\\\[/g, " ").replace(/\\\]/g, " ");
  // Named trig / Greek symbols before generic stripper
  t = t.replace(/\\cos\b/g, "cos").replace(/\\sin\b/g, "sin").replace(/\\tan\b/g, "tan");
  t = t.replace(/\\alpha\b/g, "α").replace(/\\beta\b/g, "β").replace(/\\theta\b/g, "θ");
  t = t.replace(/\\gamma\b/g, "γ").replace(/\\delta\b/g, "δ").replace(/\\pi\b/g, "π");
  t = t.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, "");
  t = t.replace(/[{}]/g, "");
  // LaTeX tilde non-breaking space → regular space
  t = t.replace(/~/g, " ");
  // Strip leading QCM item label "N. " or "N.~" from the start of a cell
  // (e.g. "1. Quelle est..." → "Quelle est...")
  t = t.replace(/^\s*\d+\.\s+/, "");
  t = t.replace(/[ \t]+/g, " ").trim();
  return t;
}

function inferTableLabel(body: string, tableContent: string): string | null {
  // Look for \textbf{...} caption just before this tabular environment
  const tableStart = body.indexOf(tableContent);
  if (tableStart < 0) return null;

  // Search the 300 chars before the tabular \begin{} for a \textbf
  const before = body.slice(Math.max(0, tableStart - 400), tableStart);
  const match = before.match(/\\textbf\{([^}]{5,120})\}[^\\]*$/);
  if (match?.[1]) return cleanLatexCell(match[1]).slice(0, 80);
  return null;
}

function inferTableCaption(body: string, tableContent: string): string | null {
  return inferTableLabel(body, tableContent);
}

// ─── QCM table extractor ─────────────────────────────────────────────────────

/**
 * Detect and extract questions from a QCM (multiple-choice) table in a LaTeX
 * exercise body. Returns null if no QCM table is found.
 *
 * Expected format:
 *   \begin{tabularx}{\linewidth}{|m{...}|*{3}{...X|}}
 *   \textbf{Question} & \textbf{Réponse A} & \textbf{Réponse B} & \textbf{Réponse C}\\ \hline
 *   Question text & A & B & C \\ \hline
 *   ...
 *   \end{tabularx}
 */
function extractQcmQuestions(body: string): Array<{ prompt: string; choices: string[] }> | null {
  // Find any tabularx or tabular block
  const tablePattern = /\\begin\{tabular[x*]?\}[\s\S]*?\\end\{tabular[x*]?\}/g;
  for (const match of body.matchAll(tablePattern)) {
    const block = match[0];

    // QCM signature: must mention "Réponse" (header row)
    if (!/R[eé]ponse/i.test(block)) continue;

    // Find the first \hline — content starts after it (header row follows)
    const hlineIdx = block.indexOf("\\hline");
    if (hlineIdx < 0) continue;
    const afterFirstHline = block.slice(hlineIdx + "\\hline".length);

    // Strip pspicture / tikzpicture blocks inside cells before splitting on \\
    const stripped = afterFirstHline
      .replace(/\\begin\{pspicture\*?\}[\s\S]*?\\end\{pspicture\*?\}/g, "[Schéma]")
      .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, "[Schéma]")
      .replace(/\\begin\{minipage\}(?:\[[^\]]*\])?\{[^}]*\}([\s\S]*?)\\end\{minipage\}/g, "$1")
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, "$1")
      .replace(/%[^\n]*/g, "");

    // Split rows on \\ (row separator)
    const rows = stripped.split(/\\\\/).map((r) => r.replace(/\\hline\b/g, "").trim()).filter(Boolean);

    let headerSkipped = false;
    const questions: Array<{ prompt: string; choices: string[] }> = [];

    for (const row of rows) {
      const cells = row.split("&").map((c) => cleanLatexCell(c).trim());
      if (cells.length < 4) continue;

      // Skip header row (contains "Réponse")
      if (!headerSkipped && /R[eé]ponse/i.test(cells[1] ?? "")) {
        headerSkipped = true;
        continue;
      }

      const prompt = cells[0] ?? "";
      if (!prompt.trim()) continue; // skip empty rows

      const choices = [cells[1] ?? "", cells[2] ?? "", cells[3] ?? ""].filter(Boolean);
      if (choices.length < 2) continue;

      questions.push({ prompt, choices });
    }

    if (questions.length > 0) return questions;
  }
  return null;
}

// ─── EPS → PNG/WebP converter ────────────────────────────────────────────────

/**
 * Convert an EPS (or any Ghostscript-readable) image to WebP (falling back to PNG).
 * Returns the path of the output file, or null on failure.
 */
async function convertEpsToImage(epsBytes: Uint8Array, srcName: string, outDir: string, id: string): Promise<string | null> {
  const workDir = await mkdtemp(join(tmpdir(), `eps-${id.slice(0, 16)}-`));
  try {
    const ext = srcName.split(".").pop()?.toLowerCase() ?? "eps";
    const inPath = join(workDir, `input.${ext}`);
    const pngPath = join(workDir, "output.png");

    await writeFile(inPath, epsBytes);

    // Ghostscript: EPS → PNG at 120 DPI (screen-proportional)
    await execFileAsync(
      GS_PATH,
      ["-dNOPAUSE", "-dBATCH", "-sDEVICE=png16m", "-r120", "-dEPSCrop", `-sOutputFile=${pngPath}`, inPath],
      { timeout: 20_000 },
    );

    await mkdir(outDir, { recursive: true });

    // Try converting to WebP
    const webpPath = join(outDir, `${id}.webp`);
    try {
      await execFileAsync(CWEBP_PATH, ["-q", "92", pngPath, "-o", webpPath], { timeout: 10_000 });
      return webpPath;
    } catch {
      // Fallback to PNG
      const finalPng = join(outDir, `${id}.png`);
      await copyFile(pngPath, finalPng);
      return finalPng;
    }
  } catch (err) {
    console.warn(`  [eps] Conversion failed for ${srcName}: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Given a parsed exam and the original tex body, inject image documents into
 * exercises that reference those images via \includegraphics.
 */
function injectImageDocuments(
  parsed: ParsedExamPaper,
  texBody: string,
  imageMap: Map<string, string>, // basename (without ext) → local path
): void {
  if (imageMap.size === 0) return;

  // Find exercise boundary positions in the tex body
  const exerciseBoundaries: Array<{ number: number; start: number }> = [];
  const boundaryRx = /\\textbf\{\s*Exercice\s+(\d{1,2})\s+\\hfill/gi;
  for (const m of texBody.matchAll(boundaryRx)) {
    exerciseBoundaries.push({ number: Number.parseInt(m[1] ?? "0", 10), start: m.index ?? 0 });
  }

  // For each \includegraphics, determine which exercise it belongs to
  const imgRx = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
  for (const m of texBody.matchAll(imgRx)) {
    const imgPos = m.index ?? 0;
    const imgRef = m[1] ?? "";
    const imgBase = imgRef.replace(/\.[^.]+$/, ""); // strip extension

    const localPath = imageMap.get(imgBase) ?? imageMap.get(imgRef);
    if (!localPath) continue;

    // Find which exercise owns this position
    let exNumber = 0;
    for (let i = exerciseBoundaries.length - 1; i >= 0; i--) {
      if ((exerciseBoundaries[i]?.start ?? 0) <= imgPos) {
        exNumber = exerciseBoundaries[i]?.number ?? 0;
        break;
      }
    }
    if (exNumber === 0) continue;

    const exercise = parsed.exercises.find((e) => e.exercise_number === exNumber);
    if (!exercise) continue;

    // Add as first document if not already present
    const alreadyHas = exercise.parsed_content.documents.some((d) => d.local_path === localPath);
    if (!alreadyHas) {
      exercise.parsed_content.documents.unshift({
        id: `${exercise.id}:img-${imgBase}`,
        type: "image",
        label: imgBase,
        local_path: localPath,
        alt: imgBase,
        render_mode: "image_first",
      } as StructuredTableDocument & { render_mode: string; alt: string; local_path: string });
    }
  }
}

// ─── Diagram block extractor & renderer ──────────────────────────────────────

interface DiagramBlock {
  code: string;
  type: "pspicture" | "scratch";
  /** approximate char offset in the exercise body */
  position: number;
}

/** Extract all pspicture and scratch blocks from an exercise body. */
function extractDiagramBlocks(body: string): DiagramBlock[] {
  const blocks: DiagramBlock[] = [];

  for (const m of body.matchAll(/\\begin\{pspicture\*?\}[\s\S]*?\\end\{pspicture\*?\}/g)) {
    // Skip commented-out blocks: check if this \begin is preceded by % on the same line
    const startIdx = m.index ?? 0;
    const lineStart = body.lastIndexOf("\n", startIdx);
    const linePrefix = body.slice(lineStart + 1, startIdx);
    if (linePrefix.trimStart().startsWith("%")) continue;
    blocks.push({ code: m[0], type: "pspicture", position: startIdx });
  }
  for (const m of body.matchAll(/\\begin\{scratch\}[\s\S]*?\\end\{scratch\}/g)) {
    blocks.push({ code: m[0], type: "scratch", position: m.index ?? 0 });
  }

  blocks.sort((a, b) => a.position - b.position);
  return blocks;
}

/**
 * Extract the preamble packages from a full tex document (for use in standalone
 * rendering). Returns the extra package lines that compilePsTricksToPng may need.
 */
function extractTexPreamblePackages(texContent: string): string {
  const lines: string[] = [];
  const preamble = texContent.slice(0, texContent.indexOf("\\begin{document}"));
  for (const m of preamble.matchAll(/\\(usepackage)(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
    const pkg = m[2]?.trim() ?? "";
    // Skip packages already included in the standalone template
    if (/pstricks|pst-plot|pst-text|pst-tree|pstricks-add|pst-node|amsmath|amssymb|babel|fontenc|inputenc|geometry|fancyhdr|hyperref|numprint/.test(pkg)) continue;
    // Skip lualatex-only or packages requiring non-basic TeX Live files
    if (/scratch3|luatex|luacode|luapackageloader|diagbox/.test(pkg)) continue;
    // Skip tikz/pgf packages (not needed for PSTricks, may conflict)
    if (/tikz|pgf|pgfplots/.test(pkg)) continue;
    // Skip font packages — they require .pfb files dvips can't always find,
    // and geometry/function diagrams don't depend on the document font.
    if (/fourier|helvet|mathpazo|palatino|times|mathptmx|lmodern|bookman|chancery|charter|newcent|utopia|libertine|sourcepro|opensans/.test(pkg)) continue;
    lines.push(`\\${m[1]}{${pkg}}`);
  }
  // Also grab \newcommand definitions that diagrams might rely on
  for (const m of preamble.matchAll(/\\(newcommand|renewcommand|def)\{[^}]+\}[\s\S]*?(?=\\(?:newcommand|renewcommand|def|usepackage|\n\n)|$)/g)) {
    const cmd = m[0].split("\n")[0]; // just first line to avoid grabbing too much
    if (cmd && cmd.length < 200) lines.push(cmd);
  }
  return lines.join("\n");
}

/**
 * Render all PSpicture and Scratch diagram blocks found in each exercise body,
 * and inject the resulting images as documents into the parsed exercises.
 */
async function renderAndInjectDiagrams(
  parsed: ParsedExamPaper,
  texContent: string,
  outDir: string,
): Promise<void> {
  const texBody = extractDocumentBody(texContent);
  const extraPackages = extractTexPreamblePackages(texContent);

  // Get exercise body slices from the full tex body
  const exerciseBoundaries: Array<{ number: number; start: number }> = [];
  const boundaryRx = /\\textbf\{\s*Exercice\s+(\d{1,2})\s+\\hfill/gi;
  for (const m of texBody.matchAll(boundaryRx)) {
    exerciseBoundaries.push({ number: Number.parseInt(m[1] ?? "0", 10), start: m.index ?? 0 });
  }

  for (let i = 0; i < exerciseBoundaries.length; i++) {
    const boundary = exerciseBoundaries[i]!;
    const nextStart = exerciseBoundaries[i + 1]?.start ?? texBody.length;
    const exerciseBody = texBody.slice(boundary.start, nextStart);
    const exercise = parsed.exercises.find((e) => e.exercise_number === boundary.number);
    if (!exercise) continue;

    const blocks = extractDiagramBlocks(exerciseBody);
    if (blocks.length === 0) continue;

    const renderedDocs: Array<StructuredTableDocument & { render_mode: string; alt: string; local_path: string }> = [];

    for (let j = 0; j < blocks.length; j++) {
      const block = blocks[j]!;
      const id = `${exercise.id.replace(/:/g, "-")}-diagram-${j + 1}`;
      let localPath: string | null = null;

      if (block.type === "pspicture") {
        process.stdout.write(`  [pstricks] Rendering Ex${boundary.number} diagram ${j + 1}… `);
        localPath = await compilePsTricksToPng(block.code, outDir, id, extraPackages);
        console.log(localPath ? "ok" : "failed");
      } else if (block.type === "scratch") {
        process.stdout.write(`  [scratch3] Rendering Ex${boundary.number} scratch block… `);
        localPath = await compileScratch3ToPng(block.code, outDir, id);
        console.log(localPath ? "ok" : "failed");
      }

      if (localPath) {
        renderedDocs.push({
          id: `${exercise.id}:diagram-${j + 1}`,
          type: "image",
          label: block.type === "scratch" ? "Programme Scratch" : `Schéma ${j + 1}`,
          local_path: localPath,
          alt: `Schéma exercice ${boundary.number}`,
          render_mode: "image_first",
        } as StructuredTableDocument & { render_mode: string; alt: string; local_path: string });
      }
    }

    if (renderedDocs.length > 0) {
      // Insert rendered diagrams after any EPS images already injected, before tables
      const existingImages = exercise.parsed_content.documents.filter((d) => d.type === "image");
      const existingTables = exercise.parsed_content.documents.filter((d) => d.type !== "image");
      exercise.parsed_content.documents = [...existingImages, ...renderedDocs, ...existingTables];
    }
  }
}

// ─── PDF page renderer (fallback for failed diagram compilation) ──────────────

const PDFTOTEXT_PATH = "/opt/homebrew/bin/pdftotext";
const PDFTOPPM_PATH = "/opt/homebrew/bin/pdftoppm";

/**
 * Use pdftotext to find which PDF page each exercise starts on.
 * Pages are separated by \x0C (form feed) in pdftotext output.
 */
async function findExercisePdfPages(pdfPath: string, exerciseNumbers: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  try {
    const { stdout } = await execFileAsync(PDFTOTEXT_PATH, ["-layout", pdfPath, "-"], { timeout: 20_000, maxBuffer: 10 * 1024 * 1024 });
    const pages = stdout.split("\x0C");
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const pageText = pages[pageIdx] ?? "";
      for (const num of exerciseNumbers) {
        if (!result.has(num) && new RegExp(`Exercice\\s+${num}\\b`).test(pageText)) {
          result.set(num, pageIdx + 1); // 1-indexed page number
        }
      }
    }
  } catch (err) {
    console.warn(`  [pdf-fallback] pdftotext failed: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`);
  }
  return result;
}

/**
 * Render a single PDF page to a PNG/WebP image for use as exercise fallback.
 */
async function renderPdfPage(pdfPath: string, pageNumber: number, outDir: string, id: string): Promise<string | null> {
  const workDir = await mkdtemp(join(tmpdir(), `pdf-page-${id.slice(0, 16)}-`));
  try {
    const pngPrefix = join(workDir, "page");
    await execFileAsync(
      PDFTOPPM_PATH,
      ["-png", "-r", "120", "-f", String(pageNumber), "-l", String(pageNumber), "-singlefile", pdfPath, pngPrefix],
      { timeout: 20_000 },
    );
    const pngPath = `${pngPrefix}.png`;
    await mkdir(outDir, { recursive: true });
    const webpPath = join(outDir, `${id}.webp`);
    try {
      await execFileAsync(CWEBP_PATH, ["-q", "92", pngPath, "-o", webpPath], { timeout: 10_000 });
      return webpPath;
    } catch {
      const finalPng = join(outDir, `${id}.png`);
      await copyFile(pngPath, finalPng);
      return finalPng;
    }
  } catch (err) {
    console.warn(`  [pdf-fallback] Page render failed (${id}): ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * For exercises that have pspicture/scratch blocks but no rendered image documents,
 * fall back to rendering the corresponding PDF page.
 */
async function injectPdfPageFallbacks(
  parsed: ParsedExamPaper,
  texContent: string,
  pdfPath: string,
  outDir: string,
): Promise<void> {
  // Find exercises that need images but didn't get any from LaTeX rendering
  const texBody = extractDocumentBody(texContent);
  const exerciseBoundaries: Array<{ number: number; start: number }> = [];
  const boundaryRx = /\\textbf\{\s*Exercice\s+(\d{1,2})\s+\\hfill/gi;
  for (const m of texBody.matchAll(boundaryRx)) {
    exerciseBoundaries.push({ number: Number.parseInt(m[1] ?? "0", 10), start: m.index ?? 0 });
  }

  // Which exercises have diagram blocks but no rendered image documents?
  const needsFallback: number[] = [];
  for (let i = 0; i < exerciseBoundaries.length; i++) {
    const boundary = exerciseBoundaries[i]!;
    const nextStart = exerciseBoundaries[i + 1]?.start ?? texBody.length;
    const exerciseBody = texBody.slice(boundary.start, nextStart);
    const hasDiagrams = /\\begin\{pspicture\*?\}|\\begin\{scratch\}/.test(exerciseBody);
    if (!hasDiagrams) continue;

    const exercise = parsed.exercises.find((e) => e.exercise_number === boundary.number);
    if (!exercise) continue;

    const hasRenderedImages = exercise.parsed_content.documents.some((d) => d.type === "image");
    if (!hasRenderedImages) {
      needsFallback.push(boundary.number);
    }
  }

  if (needsFallback.length === 0) return;

  console.log(`  [pdf-fallback] Rendering PDF pages for exercises: ${needsFallback.join(", ")}`);
  const pageMap = await findExercisePdfPages(pdfPath, needsFallback);

  for (const exNum of needsFallback) {
    const pageNum = pageMap.get(exNum);
    if (!pageNum) {
      console.warn(`  [pdf-fallback] Could not find page for Exercise ${exNum}`);
      continue;
    }

    const exercise = parsed.exercises.find((e) => e.exercise_number === exNum);
    if (!exercise) continue;

    process.stdout.write(`  [pdf-fallback] Ex${exNum} → page ${pageNum}… `);
    const id = `${exercise.id.replace(/:/g, "-")}-pdf-p${pageNum}`;
    const localPath = await renderPdfPage(pdfPath, pageNum, outDir, id);
    console.log(localPath ? "ok" : "failed");

    if (localPath) {
      exercise.parsed_content.documents.unshift({
        id: `${exercise.id}:pdf-page-${pageNum}`,
        type: "image",
        label: `Page ${pageNum} (PDF)`,
        local_path: localPath,
        alt: `Exercice ${exNum} — document original`,
        render_mode: "image_first",
      } as StructuredTableDocument & { render_mode: string; alt: string; local_path: string });
    }
  }
}

// ─── ZIP parser ───────────────────────────────────────────────────────────────

/**
 * Unzip a LaTeX ZIP archive, find the main .tex file, and parse it as an exam.
 * Extracts EPS images and compiles PSpicture/Scratch diagram blocks to images.
 */
export async function parseLatexZipToExam(
  metadata: CollectedPaper,
  zipBytes: Uint8Array,
  options?: { withAssets?: boolean; assetsRoot?: string },
): Promise<ParsedExamPaper> {
  const files = unzipSync(zipBytes);

  // Find all .tex files (excluding macOS metadata)
  const texEntries = Object.entries(files).filter(
    ([name]) => name.endsWith(".tex") && !name.includes("__MACOSX"),
  );
  if (texEntries.length === 0) {
    throw new Error("No .tex file found in ZIP archive");
  }

  // Pick the largest .tex file as the main document
  const [, mainTexBytes] = texEntries.reduce((best, current) =>
    current[1].length > best[1].length ? current : best,
  );
  const texContent = new TextDecoder("utf-8").decode(mainTexBytes);

  const parsed = parseLatexToExam(texContent, metadata);

  const assetsRoot = options?.assetsRoot ?? "exam-import/assets";
  const outDir = join(assetsRoot, parsed.paper.id.replace(/:/g, "-"));

  // 1. Extract and convert EPS/PNG image files bundled in the ZIP
  const imageEntries = Object.entries(files).filter(
    ([name]) => /\.(eps|png|jpg|jpeg)$/i.test(name) && !name.includes("__MACOSX"),
  );
  if (imageEntries.length > 0) {
    // Build a map of filename → target width (cm) from \includegraphics[width=Xcm]{file}
    const includegraphicsWidths = new Map<string, number>();
    for (const m of texContent.matchAll(/\\includegraphics\[[^\]]*width\s*=\s*([\d.]+)\s*cm[^\]]*\]\{([^}]+)\}/gi)) {
      const widthCm = parseFloat(m[1] ?? "0");
      const fname = pathBasename(m[2] ?? "").replace(/\\/g, "/").split("/").pop() ?? "";
      if (widthCm > 0 && fname) includegraphicsWidths.set(fname, widthCm);
    }

    const imageMap = new Map<string, string>();
    for (const [imgName, imgBytes] of imageEntries) {
      const base = pathBasename(imgName).replace(/\.[^.]+$/, "");
      const fname = pathBasename(imgName);
      console.log(`  [img] Converting ${fname}…`);

      let converted: string | null = null;
      const isEps = /\.eps$/i.test(fname);
      const targetWidthCm = includegraphicsWidths.get(fname) ?? includegraphicsWidths.get(base);

      if (isEps && targetWidthCm && targetWidthCm > 0) {
        // Write EPS to a temp file and use LaTeX standalone pipeline for correct sizing
        const { mkdtemp: _mkdtemp, writeFile: _writeFile, rm: _rm } = await import("node:fs/promises");
        const { join: _join } = await import("node:path");
        const { tmpdir: _tmpdir } = await import("node:os");
        const epsWorkDir = await _mkdtemp(_join(_tmpdir(), `eps-stage-`));
        try {
          const epsFilePath = _join(epsWorkDir, fname);
          await _writeFile(epsFilePath, new Uint8Array(imgBytes));
          converted = await compileEpsViaLatex(epsFilePath, targetWidthCm, outDir, base);
        } finally {
          await _rm(epsWorkDir, { recursive: true, force: true });
        }
      }

      if (!converted) {
        // Fallback: direct Ghostscript conversion
        converted = await convertEpsToImage(new Uint8Array(imgBytes), imgName, outDir, base);
      }

      if (converted) {
        imageMap.set(base, converted);
        imageMap.set(fname, converted);
      }
    }
    injectImageDocuments(parsed, extractDocumentBody(texContent), imageMap);
  }

  // 2. Compile PSpicture and Scratch diagram blocks found in each exercise
  await renderAndInjectDiagrams(parsed, texContent, outDir);

  // 3. PDF-page fallback: for any exercise whose diagram compilation failed,
  //    render the corresponding page from the sibling PDF file (if it exists).
  const zipSourcePath = metadata.pdf_url; // pdf_url holds the local ZIP/tex path
  const siblingPdfPath = zipSourcePath.replace(/\.(zip|tex)$/i, ".pdf");
  try {
    await access(siblingPdfPath);
    await injectPdfPageFallbacks(parsed, texContent, siblingPdfPath, outDir);
  } catch {
    // No sibling PDF found — skip fallback
  }

  return parsed;
}
