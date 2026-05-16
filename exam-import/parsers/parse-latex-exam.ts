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
  let counter = 0;
  let inEnum = false;
  const result: string[] = [];
  // Walk through token by token using a simple state machine
  let remaining = tex;

  while (remaining.length > 0) {
    const beginEnum = remaining.match(/^\\begin\{enumerate\}(\[[^\]]*\])?/);
    if (beginEnum) {
      const opts = beginEnum[1] ?? "";
      if (!opts.includes("resume")) counter = 0;
      inEnum = true;
      result.push("\n");
      remaining = remaining.slice(beginEnum[0].length);
      continue;
    }

    const endEnum = remaining.match(/^\\end\{enumerate\}/);
    if (endEnum) {
      inEnum = false;
      result.push("\n");
      remaining = remaining.slice(endEnum[0].length);
      continue;
    }

    const item = remaining.match(/^\\item\b\s*/);
    if (item) {
      if (inEnum) {
        counter += 1;
        result.push(`\n${counter}. `);
      } else {
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

export function latexToText(tex: string): string {
  let t = tex;

  // Remove line comments
  t = t.replace(/%[^\n]*/g, "");

  // Remove pspicture/tikz diagrams entirely (geometry, graphs)
  t = t.replace(/\\begin\{pspicture\*?\}[\s\S]*?\\end\{pspicture\*?\}/g, "");
  t = t.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, "");

  // Remove scratch programming blocks (but leave a placeholder)
  t = t.replace(/\\begin\{scratch\}[\s\S]*?\\end\{scratch\}/g, "[Programme Scratch]");

  // Remove center environments that contain only figures
  t = t.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, (_, inner: string) => {
    const stripped = inner.replace(/\\begin\{pspicture[\s\S]*?\\end\{pspicture\*?\}/g, "").trim();
    return stripped.length > 0 ? `\n${stripped}\n` : "\n";
  });

  // Tables — simplify to pipe-separated text
  t = t.replace(/\\begin\{tabular[x*]?\}(?:\[[^\]]*\])?\{[^}]*\}/g, "\n");
  t = t.replace(/\\end\{tabular[x*]?\}/g, "\n");
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
  t = t.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  t = t.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");
  t = t.replace(/\^\{([^}]*)\}/g, "^$1");
  t = t.replace(/\_\{([^}]*)\}/g, "_$1");
  t = t.replace(/\^([a-zA-Z0-9])/g, "^$1");
  t = t.replace(/_([a-zA-Z0-9])/g, "_$1");

  // Spacing / layout commands
  t = t.replace(/\\(?:big|med|small)skip\b/g, "\n\n");
  t = t.replace(/\\(?:v|h)space\*?\{[^}]*\}/g, " ");
  t = t.replace(/\\hfill\b/g, " ");
  t = t.replace(/\\newpage\b/g, "\n");
  t = t.replace(/\\noindent\b/g, "");
  t = t.replace(/\\(?:quad|qquad)\b/g, " ");
  t = t.replace(/\\[,;:!]\s*/g, " ");
  t = t.replace(/\\decofour(?:left|right)\b/g, "");

  // Font commands — keep their content
  for (const cmd of ["textbf", "emph", "textit", "texttt", "textrm", "textsf", "uline", "uwave", "underline", "sout", "footnotesize", "small", "large", "Large"]) {
    t = t.replace(new RegExp(`\\\\${cmd}\\{`, "g"), "");
  }

  // Remove footnotes
  t = t.replace(/\\footnote\{[^}]*\}/g, "");

  // Remove images (eps/png figures aren't parseable as text)
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

  // Generic remaining environments
  t = t.replace(/\\begin\{[^}]+\}(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, "\n");
  t = t.replace(/\\end\{[^}]+\}/g, "\n");

  // Table/env line breaks (double backslash)
  t = t.replace(/\\\\\s*/g, "\n");

  // Display math \[...\] — strip delimiters, keep content
  t = t.replace(/\\\[/g, " ");
  t = t.replace(/\\\]/g, " ");

  // Inline math $...$ — keep content
  t = t.replace(/\$((?:[^$\\]|\\[\s\S])*)\$/g, "$1");

  // Remove remaining unknown commands (with optional [] and {} args)
  t = t.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, " ");

  // Clean up stray braces
  t = t.replace(/[{}]/g, "");

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
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\[a-zA-Z]+\*?(?:\{[^}]*\})*/g, "")
  );
  t = t.replace(/\\np\{([^}]+)\}/g, (_, n: string) => n.replace(/,(\d{3})/g, " $1"));
  t = t.replace(/\\euro(?:logo)?\{?\}?/g, "€");
  t = t.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, "");
  t = t.replace(/[{}]/g, "");
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
