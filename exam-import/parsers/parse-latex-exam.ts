/**
 * Parses a LaTeX ZIP bundle (from APMEP) into the same ParsedExamPaper format
 * produced by pdf-to-exam.ts. Math is preserved as LaTeX strings for KaTeX rendering.
 * Falls back gracefully when individual exercises can't be parsed.
 */

import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { levelForExam, schoolCycleForExam } from "../../src/domain/exams.ts";
import type {
  CollectedPaper,
  ExamExercise,
  ExamPaper,
  ParsePdfOptions,
  ParsedExamPaper,
  ParsedExerciseContent,
  ParsedExerciseQuestion,
  ParsedExerciseQuestionSub,
  ParsingConfidence,
} from "./pdf-to-exam.ts";
import { sha256 } from "./pdf-to-exam.ts";

const execFileAsync = promisify(execFile);

// ── Public entry point ────────────────────────────────────────────────────────

export async function parseLatexZipToExam(
  metadata: CollectedPaper,
  zipBytes: Uint8Array,
  options: ParsePdfOptions = {},
): Promise<ParsedExamPaper> {
  const content_hash = sha256(zipBytes);
  const paper_id = buildPaperId(metadata, content_hash);

  const tmpDir = await mkdtemp(join(tmpdir(), "tutorly-latex-"));
  try {
    // Extract ZIP
    const zipPath = join(tmpDir, "exam.zip");
    await writeFile(zipPath, zipBytes);
    await execFileAsync("unzip", ["-q", "-o", zipPath, "-d", tmpDir]);

    // Locate main .tex file (the one containing \begin{document})
    const texPath = await findMainTex(tmpDir);
    if (!texPath) throw new Error("No .tex file with \\begin{document} found in ZIP");

    const rawTex = await readFile(texPath, "utf8");

    // Strip preamble and get document body
    const body = extractBody(rawTex);

    // Split into exercise blocks
    const exerciseBlocks = splitExercises(body);

    // Parse each exercise
    const assetsRoot = options.assetsRoot ?? "exam-import/assets";
    const exercises: ExamExercise[] = [];
    for (const [idx, block] of exerciseBlocks.entries()) {
      const exercise_number = block.number ?? idx + 1;
      const parsed = parseExerciseBlock(block.raw);
      const ex: ExamExercise = {
        id: `${paper_id}:ex${String(exercise_number).padStart(2, "0")}`,
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
        pdf_hash: content_hash,
        exercise_number,
        title: `Exercice ${exercise_number}${block.points ? ` (${block.points} pts)` : ""}`,
        raw_text: cleanLatexText(block.raw),
        parsing_status: "parsed",
        parsed_content: parsed,
        parsing_confidence: parsed.confidence,
      };

      // Attach image assets if requested
      if (options.withAssets) {
        await attachLatexAssets(ex, block.imageRefs, tmpDir, assetsRoot);
      }

      exercises.push(ex);
    }

    const paper: ExamPaper = {
      id: paper_id,
      level: levelForExam(metadata.exam),
      school_cycle: schoolCycleForExam(metadata.exam),
      pdf_hash: content_hash,
      raw_text: cleanLatexText(body),
      exercises: exercises.map((e) => e.id),
      parsing_status: exercises.length > 0 ? "parsed" : "failed",
      ...metadata,
    };

    return { paper, exercises };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ── ZIP / file helpers ────────────────────────────────────────────────────────

async function findMainTex(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { recursive: true });
  const texFiles: string[] = entries
    .filter((f) => typeof f === "string" && f.endsWith(".tex"))
    .map((f) => join(dir, f as string));

  for (const f of texFiles) {
    const content = await readFile(f, "utf8").catch(() => "");
    if (content.includes("\\begin{document}")) return f;
  }
  // Fall back to any .tex file
  return texFiles[0] ?? null;
}

// ── LaTeX body extraction ─────────────────────────────────────────────────────

function extractBody(tex: string): string {
  const start = tex.indexOf("\\begin{document}");
  const end = tex.lastIndexOf("\\end{document}");
  if (start === -1) return tex;
  const body = end !== -1 ? tex.slice(start + "\\begin{document}".length, end) : tex.slice(start + "\\begin{document}".length);
  // Remove page headers/footers (\rhead, \lhead, etc.)
  return body.replace(/\\[lr](?:head|foot)\{[^}]*\}/g, "").replace(/\\pagestyle\{[^}]*\}/g, "").replace(/\\thispagestyle\{[^}]*\}/g, "");
}

// ── Exercise splitting ────────────────────────────────────────────────────────

interface ExerciseBlock {
  number: number | null;
  points: number | null;
  raw: string;
  imageRefs: string[];
}

function splitExercises(body: string): ExerciseBlock[] {
  // Match: \textbf{Exercice N \hfill X points}
  // Also handles: \textbf{Exercice N} with points on same line
  const pattern = /\\textbf\{Exercice\s+(\d+)([^}]*)\}/gi;
  const matches = [...body.matchAll(pattern)];
  if (matches.length === 0) {
    // Single exercise or unstructured — treat whole body as one exercise
    return [{ number: null, points: null, raw: body, imageRefs: collectImageRefs(body) }];
  }

  const blocks: ExerciseBlock[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const start = m.index!;
    const end = next?.index ?? body.length;
    const raw = body.slice(start, end);
    const pointsMatch = /(\d+)\s*points?/i.exec(m[2] ?? "");
    blocks.push({
      number: parseInt(m[1], 10),
      points: pointsMatch ? parseInt(pointsMatch[1], 10) : null,
      raw,
      imageRefs: collectImageRefs(raw),
    });
  }
  return blocks;
}

function collectImageRefs(tex: string): string[] {
  const refs: string[] = [];
  for (const m of tex.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
    refs.push(m[1].trim());
  }
  return [...new Set(refs)];
}

// ── Exercise block parsing ────────────────────────────────────────────────────

function parseExerciseBlock(raw: string): ParsedExerciseContent {
  // Protect math environments from being cleaned
  const { protected: protectedTex, restore } = protectMath(raw);

  // Remove document blocks we'll represent as documents
  const { cleaned: bodyClean, documents } = extractDocuments(protectedTex);

  // Split context (before first enumerate) from question list
  const enumStart = bodyClean.indexOf("\\begin{enumerate}");
  const contextTex = enumStart !== -1 ? bodyClean.slice(0, enumStart) : bodyClean;
  const enumTex = enumStart !== -1 ? bodyClean.slice(enumStart) : "";

  const context = restore(cleanLatexText(contextTex));
  const questions = extractQuestions(enumTex, restore);
  const confidence: ParsingConfidence = questions.length > 0 ? "high" : "medium";

  return {
    title: null,
    context,
    documents: documents.map((d) => ({ ...d, label: restore(d.label), content: d.content ? restore(d.content) : undefined })),
    questions,
    raw_excerpt: raw.slice(0, 500),
    confidence,
  };
}

// ── Document extraction ───────────────────────────────────────────────────────

type DocType = "image" | "table" | "graph" | "text";

interface RawDoc {
  type: DocType;
  label: string;
  content?: string;
  table?: { headers: string[]; rows: string[][] };
  local_path?: string;
  alt?: string;
}

function extractDocuments(tex: string): { cleaned: string; documents: RawDoc[] } {
  const documents: RawDoc[] = [];
  let cleaned = tex;

  // 1. PSTricks figures → graph
  cleaned = cleaned.replace(/\\begin\{pspicture\*?\}[\s\S]*?\\end\{pspicture\*?\}/g, (match) => {
    documents.push({ type: "graph", label: "Figure géométrique", content: match, alt: "Figure géométrique (PSTricks)" });
    return "";
  });

  // 2. Scratch blocks → text (algorithm)
  cleaned = cleaned.replace(/\\begin\{scratch\}[\s\S]*?\\end\{scratch\}/g, (match) => {
    const desc = extractScratchDescription(match);
    documents.push({ type: "text", label: "Programme Scratch", content: desc });
    return "";
  });

  // 3. Tables
  cleaned = cleaned.replace(/\\begin\{tabular[Xx]?\}[\s\S]*?\\end\{tabular[Xx]?\}/g, (match) => {
    const table = parseTabular(match);
    documents.push({ type: "table", label: "Tableau", table });
    return "";
  });

  // 4. \includegraphics → image placeholder (local_path resolved later by attachLatexAssets)
  cleaned = cleaned.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, (_match, name) => {
    const ref = name.trim();
    documents.push({ type: "image", label: ref, alt: ref });
    return "";
  });

  return { cleaned, documents };
}

function extractScratchDescription(match: string): string {
  // Extract human-readable block names from scratch environment
  const blocks: string[] = [];
  for (const m of match.matchAll(/\\blockmove\{([^}]+)\}|\\blockvariable\{([^}]+)\}|\\blockevent\{([^}]+)\}|\\blockinit\{([^}]+)\}|\\blockrepeat\{([^}]+)\}|\\blockevent\{([^}]+)\}/g)) {
    const text = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? "";
    if (text) blocks.push(cleanLatexText(text));
  }
  return blocks.join("\n");
}

function parseTabular(match: string): { headers: string[]; rows: string[][] } {
  const lines = match
    .replace(/\\begin\{tabular[Xx]?\}\{[^}]*\}/g, "")
    .replace(/\\end\{tabular[Xx]?\}/g, "")
    .replace(/\\hline/g, "")
    .replace(/\\cline\{[^}]*\}/g, "")
    .split(/\\\\/)
    .map((line) => line.split("&").map((cell) => cleanLatexText(cell.trim())).filter((c) => c.length > 0))
    .filter((row) => row.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = lines;
  return { headers: headers ?? [], rows };
}

// ── Math protection ───────────────────────────────────────────────────────────

function protectMath(tex: string): { protected: string; restore: (s: string) => string } {
  const store = new Map<string, string>();
  let counter = 0;

  function placeholder(content: string): string {
    const key = `%%MATH${counter++}%%`;
    store.set(key, content);
    return key;
  }

  let result = tex;

  // Display math \[...\]
  result = result.replace(/\\\[[\s\S]*?\\\]/g, (m) => placeholder(m));

  // Inline math $...$  (not $$...$$)
  result = result.replace(/\$\$[\s\S]*?\$\$/g, (m) => placeholder(m));
  result = result.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\[\s\S])*?)\$/g, (m) => placeholder(m));

  // \(...\)
  result = result.replace(/\\\([\s\S]*?\\\)/g, (m) => placeholder(m));

  // Common standalone math commands that appear outside $ $
  // e.g. \frac{}{}, \sqrt{}, \pi
  result = result.replace(/\\(?:frac|sqrt|overrightarrow|widehat)\{[^}]*\}\{[^}]*\}|\\(?:pi|alpha|beta|theta|Delta|Sigma)\b/g, (m) => placeholder(m));

  function restore(s: string): string {
    for (const [key, val] of store) {
      s = s.replaceAll(key, val);
    }
    return s;
  }

  return { protected: result, restore };
}

// ── Text cleaning ─────────────────────────────────────────────────────────────

export function cleanLatexText(tex: string): string {
  let s = tex;

  // Remove comments
  s = s.replace(/%[^\n]*/g, "");

  // French numprint \np{6 371} → 6 371
  s = s.replace(/\\np\{([^}]+)\}/g, "$1");

  // French quotes
  s = s.replace(/\\og\s*/g, "« ");
  s = s.replace(/\\fg\s*\{?\}?/g, " »");

  // Degree symbol
  s = s.replace(/\\degres\b/g, "°");
  s = s.replace(/\\degree\b/g, "°");

  // Euro
  s = s.replace(/\\euro(?:logo)?\{?\}?/g, "€");

  // \dots
  s = s.replace(/\\(?:dots|ldots|cdots)\b/g, "…");

  // Unwrap common formatting (keep content) — run twice for nesting
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\(?:textbf|textit|emph|text|underline|uline|uwave|uuline|textrm|textsf|texttt)\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\(?:footnote|footnotemark)\{[^{}]*\}/g, "");
    s = s.replace(/\\parbox(?:\[[^\]]*\])?\{[^}]*\}\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\ovalnum\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\ovaloperator\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\ovalvariable\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\namemoreblocks\{([^{}]*)\}/g, "$1");
  }

  // Remove sizing/layout commands
  s = s.replace(/\\(?:medskip|bigskip|smallskip|vskip\s*[\d.]+\w*|noindent|centering|raggedright|raggedleft|newpage|clearpage)\b/g, "\n");
  s = s.replace(/\\(?:vspace|hspace|vskip|hskip)\*?\{[^}]*\}/g, "");
  s = s.replace(/\\hfill\b/g, " ");
  s = s.replace(/\\(?:footnotesize|scriptsize|small|normalsize|large|Large|LARGE|huge|Huge|tiny)\b/g, "");
  s = s.replace(/\\(?:tracingtabularx|renewcommand|newcommand|setlength|usepackage|documentclass|renewcommand)\{[^}]*\}[^$]*/g, "");

  // PSTricks layout artifacts
  s = s.replace(/\\uput(?:\[[^\]]*\])?\([^)]*\)\{([^}]*)\}/g, "$1");
  s = s.replace(/\\rput(?:\{[^}]*\})?\([^)]*\)\{([^}]*)\}/g, "$1");
  s = s.replace(/\\psset\{[^}]*\}/g, "");
  s = s.replace(/\\psframe[^;]*/g, "");

  // Remove \begin{center}...\end{center} wrapper (keep content)
  s = s.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, "$1");
  s = s.replace(/\\begin\{(?:flushleft|flushright|minipage|lscape)\}[\s\S]*?\\end\{(?:flushleft|flushright|minipage|lscape)\}/g, "");

  // Remove orphaned braces left by removed commands (only after non-letter chars)
  // Be conservative: only strip brace-groups that follow a space or line start
  s = s.replace(/(^|[\s,;.!?])\{([^{}]{0,80})\}/gm, "$1$2");

  // Normalize whitespace
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

// ── Question extraction ───────────────────────────────────────────────────────

function extractQuestions(enumTex: string, restore: (s: string) => string): ParsedExerciseQuestion[] {
  const questions: ParsedExerciseQuestion[] = [];

  // Collect all \begin{enumerate} blocks, respecting [resume] to continue numbering
  let remaining = enumTex;
  let questionCounter = 0;

  while (remaining.length > 0) {
    const enumStart = remaining.indexOf("\\begin{enumerate}");
    if (enumStart === -1) break;

    // Check if this enumerate has [resume]
    const afterBegin = remaining.slice(enumStart + "\\begin{enumerate}".length);
    const isResume = /^\s*\[resume\]/i.test(afterBegin);
    if (!isResume) questionCounter = 0;

    const enumEnd = findEnvEnd(remaining, enumStart, "enumerate");
    const blockEnd = enumEnd !== -1 ? enumEnd + "\\end{enumerate}".length : remaining.length;

    const innerStart = enumStart + "\\begin{enumerate}".length + (isResume ? afterBegin.match(/^\s*\[resume\]/i)![0].length : 0);
    const innerEnd = enumEnd !== -1 ? enumEnd : remaining.length;
    const innerTex = remaining.slice(innerStart, innerEnd);
    const items = splitItems(innerTex);

    remaining = remaining.slice(blockEnd);

  for (const [, itemTex] of items.entries()) {
    questionCounter += 1;
    const qNum = questionCounter;
    const qId = `q${qNum}`;

    // Check for nested enumerate → sub-questions
    const nestedStart = itemTex.indexOf("\\begin{enumerate}");
    if (nestedStart !== -1) {
      const nestedEnd = findEnvEnd(itemTex, nestedStart, "enumerate");
      const contextPart = cleanLatexText(restore(itemTex.slice(0, nestedStart)));
      const nestedPart = nestedEnd !== -1 ? itemTex.slice(nestedStart, nestedEnd + "\\end{enumerate}".length) : "";
      const subItems = splitItems(nestedPart.slice("\\begin{enumerate}".length));

      const subquestions: ParsedExerciseQuestionSub[] = subItems.map((sub, si) => ({
        id: `${qId}${String.fromCharCode(97 + si)}`,
        label: `${String.fromCharCode(97 + si)}.`,
        text: restore(cleanLatexText(sub)),
      }));

      questions.push({
        id: qId,
        label: `${qNum}.`,
        text: contextPart,
        points: null,
        answer_type: detectAnswerType(contextPart),
        expected_answer: null,
        student_answer: null,
        subquestions,
      });
    } else {
      const text = restore(cleanLatexText(itemTex));
      questions.push({
        id: qId,
        label: `${qNum}.`,
        text,
        points: null,
        answer_type: detectAnswerType(text),
        expected_answer: null,
        student_answer: null,
        subquestions: [],
      });
    }
  } // end for items
  } // end while enumerate blocks

  return questions;
}

// ── Stack-based enumerate helpers ─────────────────────────────────────────────

function findEnvEnd(tex: string, startPos: number, envName: string): number {
  const open = `\\begin{${envName}}`;
  const close = `\\end{${envName}}`;
  let depth = 1;
  let pos = startPos + open.length;

  while (pos < tex.length && depth > 0) {
    const nextOpen = tex.indexOf(open, pos);
    const nextClose = tex.indexOf(close, pos);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + open.length;
    } else {
      depth--;
      pos = nextClose + close.length;
    }
  }
  return depth === 0 ? pos - close.length : -1;
}

function splitItems(content: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  let i = 0;

  while (i < content.length) {
    if (content.startsWith("\\begin{", i)) {
      const braceEnd = content.indexOf("}", i + 7);
      depth++;
      current += content.slice(i, (braceEnd === -1 ? i + 7 : braceEnd) + 1);
      i = (braceEnd === -1 ? i + 7 : braceEnd) + 1;
    } else if (content.startsWith("\\end{", i)) {
      const braceEnd = content.indexOf("}", i + 5);
      depth--;
      current += content.slice(i, (braceEnd === -1 ? i + 5 : braceEnd) + 1);
      i = (braceEnd === -1 ? i + 5 : braceEnd) + 1;
    } else if (depth === 0 && content.startsWith("\\item", i) && !/[a-zA-Z]/.test(content[i + 5] ?? "")) {
      if (current.trim()) items.push(current.trim());
      current = "";
      i += 5;
      // Skip optional label e.g. \item[a)]
      let j = i;
      while (j < content.length && content[j] === " ") j++;
      if (content[j] === "[") {
        const end = content.indexOf("]", j);
        i = end !== -1 ? end + 1 : j;
      } else {
        i = j;
      }
    } else {
      current += content[i];
      i++;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

// ── Answer type detection ─────────────────────────────────────────────────────

function detectAnswerType(text: string): ParsedExerciseQuestion["answer_type"] {
  const l = text.toLowerCase();
  if (/calculer|determiner|trouver|valeur|donner|exprimer/.test(l)) return "numeric";
  if (/vrai|faux|choisir|cocher|qcm/.test(l)) return "multiple_choice";
  if (/resoudre|equation|inegalit/.test(l)) return "math";
  return "free_text";
}

// ── Asset attachment ──────────────────────────────────────────────────────────

async function attachLatexAssets(
  exercise: ExamExercise,
  imageRefs: string[],
  tmpDir: string,
  assetsRoot: string,
): Promise<void> {
  if (!exercise.parsed_content || imageRefs.length === 0) return;

  for (const ref of imageRefs) {
    const resolved = await findImageFile(tmpDir, ref);
    if (!resolved) {
      console.warn(`  Image not found: ${ref}`);
      continue;
    }

    const ext = extname(resolved).toLowerCase();
    let assetPath = resolved;

    // Convert .eps to .png if ghostscript available
    if (ext === ".eps") {
      const pngPath = resolved.replace(/\.eps$/i, ".png");
      try {
        await execFileAsync("gs", [
          "-dNOPAUSE", "-dBATCH", "-dSAFER",
          "-sDEVICE=pngalpha", "-r150",
          `-sOutputFile=${pngPath}`, resolved,
        ]);
        assetPath = pngPath;
      } catch {
        console.warn(`  gs not available, skipping .eps conversion for ${ref}`);
        continue;
      }
    }

    const destDir = join(assetsRoot, exercise.paper_id, exercise.id);
    await mkdir(destDir, { recursive: true });
    const destFile = join(destDir, basename(assetPath));
    const bytes = await readFile(assetPath);
    await writeFile(destFile, bytes);

    // Update local_path in the matching document
    for (const doc of exercise.parsed_content.documents) {
      if (doc.local_path === ref || doc.label === ref) {
        doc.local_path = destFile;
      }
    }
  }
}

async function findImageFile(dir: string, ref: string): Promise<string | null> {
  const extensions = [".png", ".jpg", ".jpeg", ".eps", ".pdf", ""];
  for (const ext of extensions) {
    const candidate = join(dir, ref + ext);
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // not found with this extension
    }
  }
  // Recursive search
  const entries = await readdir(dir, { recursive: true });
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const name = basename(entry, extname(entry));
    const refName = basename(ref, extname(ref));
    if (name === refName) return join(dir, entry);
  }
  return null;
}

// ── ID generation ─────────────────────────────────────────────────────────────

function buildPaperId(metadata: CollectedPaper, hash: string): string {
  const slug = [
    metadata.exam,
    metadata.session_year,
    metadata.discipline,
    metadata.location,
    metadata.variant,
  ].join("-");
  const shortHash = hash.slice(0, 8);
  return `${slug}-${shortHash}`;
}
