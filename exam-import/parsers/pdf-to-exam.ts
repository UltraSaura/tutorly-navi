import { createHash } from "node:crypto";
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { levelForExam, schoolCycleForExam } from "../../src/domain/exams.ts";
import { cleanText } from "../utils/cleanText.ts";
import { detectStructuredTables } from "./table-detector.ts";

const execFileAsync = promisify(execFile);

export type SourceName = "eduscol" | "ac-amiens-maths";
export type ExamName = "dnb";
export type ExamSeries = "generale" | "professionnelle" | null;
export type ExamVariant =
  | "standard"
  | "arial16"
  | "arial20"
  | "arial24"
  | "braille_integral"
  | "braille_abrege";
export type ParsingStatus = "parsed" | "partial" | "failed";
export type ParsingConfidence = "high" | "medium" | "low";
export type AnswerType = "short_text" | "numeric" | "math" | "multiple_choice" | "free_text";

export interface ParsedExerciseQuestionSub {
  id: string;
  label: string;
  text: string;
}

export interface ParsedExerciseQuestion {
  id: string;
  label: string;
  text: string;
  points: number | null;
  answer_type: AnswerType;
  expected_answer: string | null;
  student_answer: string | null;
  options?: string[];
  subquestions: ParsedExerciseQuestionSub[];
}

export interface ParsedExercisePart {
  label: string;
  context: string;
  questions: ParsedExerciseQuestion[];
}

export interface ParsedExerciseContent {
  title: string | null;
  context: string;
  parts?: ParsedExercisePart[];
  documents: Array<{
    id?: string;
    label: string;
    caption?: string;
    content?: string;
    type: "text" | "table" | "image" | "graph";
    table?: {
      headers: string[];
      rows: string[][];
    };
    source?: {
      page?: number;
    };
    local_path?: string;
    storage_path?: string;
    public_url?: string | null;
    alt?: string;
    page_number?: number | null;
    sort_order?: number;
    fallback?: boolean;
    render_mode?: 'image_first' | 'table_first' | 'image_only' | 'table_only';
  }>;
  questions: ParsedExerciseQuestion[];
  raw_excerpt: string;
  confidence: ParsingConfidence;
}

export interface ExamSource {
  id: string;
  source_name: SourceName;
  source_url: string;
  fetched_at: string;
}

export interface CollectedPaper {
  source_name: SourceName;
  source_url: string;
  fetched_at: string;
  exam: ExamName;
  session_year: number;
  discipline: string;
  series: ExamSeries;
  location: string;
  variant: ExamVariant;
  pdf_url: string;
  title: string;
}

export interface ExamExercise {
  id: string;
  paper_id: string;
  source_name: SourceName;
  source_url: string;
  fetched_at: string;
  exam: ExamName;
  session_year: number;
  discipline: string;
  series: ExamSeries;
  location: string;
  variant: ExamVariant;
  pdf_url: string;
  pdf_hash: string;
  exercise_number: number | null;
  title: string | null;
  raw_text: string;
  parsing_status: ParsingStatus;
  parsed_content?: ParsedExerciseContent | null;
  parsing_confidence?: ParsingConfidence | null;
}

export interface ExamPaper extends CollectedPaper {
  id: string;
  level: string | null;
  school_cycle?: string | null;
  pdf_hash: string;
  raw_text: string;
  exercises: string[];
  parsing_status: ParsingStatus;
}

export interface ParsedExamPaper {
  paper: ExamPaper;
  exercises: ExamExercise[];
}

export interface ParsePdfOptions {
  withAssets?: boolean;
  assetsRoot?: string;
}

export function sha256(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function downloadPdf(url: string): Promise<Uint8Array> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-learning)" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    const curlBytes = await tryCurlBytes(url);
    if (curlBytes !== null) return curlBytes;
    throw new Error(`Unable to download PDF ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const fromPdftotext = await tryPdftotext(pdfBytes);
  if (fromPdftotext.trim().length > 0) {
    return normalizeText(fromPdftotext);
  }

  return normalizeText(extractReadablePdfStrings(Buffer.from(pdfBytes)));
}

export async function parsePdfToExam(
  metadata: CollectedPaper,
  pdfBytes: Uint8Array,
  options: ParsePdfOptions = {},
): Promise<ParsedExamPaper> {
  const pdf_hash = sha256(pdfBytes);
  const raw_text = await extractPdfText(pdfBytes);
  const paper_id = buildPaperId(metadata, pdf_hash);
  const chunks = splitExercises(raw_text);
  const parsing_status = chunks.status;

  const exercises = chunks.items.map((item, index) => {
    const exercise_number = item.number ?? index + 1;
    const title = cleanText(item.title) || null;
    const parsed = parseExercisePedagogical(item.raw_text, title, exercise_number);
    const effectiveStatus: ParsingStatus =
      parsed.confidence === "low" ? "partial" : parsing_status;
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
      exercise_number,
      title,
      raw_text: item.raw_text,
      parsing_status: effectiveStatus,
      parsed_content: parsed,
      parsing_confidence: parsed.confidence,
    } satisfies ExamExercise;
  });

  if (options.withAssets === true) {
    await attachPageImageAssets(pdfBytes, paper_id, exercises, options.assetsRoot ?? "exam-import/assets");
    
    // Import dynamically to avoid circular dependencies if any, or just import at top.
    const { applyCropsToExercises } = await import("../scripts/pdf-crop-assets.ts");
    const paperInfo = { ...metadata, id: paper_id } as ExamPaper;
    await applyCropsToExercises(paperInfo, exercises, pdfBytes, options.assetsRoot ?? "exam-import/assets");
  }

  return {
    paper: {
      ...metadata,
      id: paper_id,
      level: levelForExam(metadata.exam),
      school_cycle: schoolCycleForExam(metadata.exam),
      pdf_hash,
      raw_text,
      exercises: exercises.map((exercise) => exercise.id),
      parsing_status,
    },
    exercises,
  };
}

/**
 * Supprime uniquement une ou plusieurs lignes de pied de copie à la FIN du texte
 * (référence « Page X sur Y »), sans couper après un pied de page intermédiaire.
 */
function stripTrailingExamPageFooters(text: string): string {
  let t = text.trim();
  const footerLine = /\n[^\n]{0,400}\bPage\s+\d+\s+sur\s+\d+\b[^\n]*$/i;
  for (let i = 0; i < 8; i += 1) {
    const next = t.replace(footerLine, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

export function parseExercisePedagogical(rawText: string, title: string | null, exerciseNumber: number): ParsedExerciseContent {
  const cleaned = normalizeText(rawText);
  const stripped = stripTrailingExamPageFooters(cleaned);
  const content = stripped.length >= 60 ? stripped : cleaned;

  const text = content.split("\n").join("\n").trim();

  const body = text.replace(/^\s*(?:Exercice|EXERCICE)\s+\d{1,2}\b[^\n]*\n+/m, "").trim();

  const headerPoints = parseExerciseHeaderPoints(title);

  const partieMarkers = findPartieMarkers(body);
  const useParts = partieMarkers.length >= 2;

  if (useParts) {
    return parseExerciseWithPartieSections(body, partieMarkers, title, exerciseNumber, headerPoints);
  }

  const { context, questions } = extractContextAndQuestions(body);
  const documents = extractLikelyStructuredDocuments(body);

  let confidence = computeQuestionConfidence(context, questions);
  const questionsDup = [...questions];
  applyExerciseTotalPoints(questionsDup, headerPoints);

  const raw_excerpt = body.length > 800 ? `${body.slice(0, 800).trim()}…` : body;

  return {
    title: title ?? `Exercice ${exerciseNumber}`,
    context,
    documents,
    questions: questionsDup,
    raw_excerpt,
    confidence,
  };
}

function findPartieMarkers(body: string): Array<{ idx: number; headerLen: number; letter: string }> {
  const matches = [...body.matchAll(/(?:^|\n)\s*((?:PARTIE|Partie)\s+([AB]))\b\s*:?\s*/gi)];
  const markers: Array<{ idx: number; headerLen: number; letter: string }> = [];
  for (const m of matches) {
    const letter = String(m[2] ?? "").toUpperCase();
    if (letter !== "A" && letter !== "B") continue;
    markers.push({
      idx: m.index ?? 0,
      headerLen: m[0]?.length ?? 0,
      letter,
    });
  }
  return markers.sort((a, b) => a.idx - b.idx);
}

function parseExerciseWithPartieSections(
  body: string,
  markers: Array<{ idx: number; headerLen: number; letter: string }>,
  title: string | null,
  exerciseNumber: number,
  headerPoints: number | null,
): ParsedExerciseContent {
  const ordered = [...markers].sort((a, b) => a.idx - b.idx);
  const prelude = ordered.length > 0 ? body.slice(0, ordered[0]!.idx).trim() : body.trim();

  const partsBuilt: ParsedExercisePart[] = [];
  const merged: ParsedExerciseQuestion[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const m = ordered[i]!;
    const sliceStart = m.idx + m.headerLen;
    const sliceEnd = ordered[i + 1]?.idx ?? body.length;
    const segmentRaw = body.slice(sliceStart, sliceEnd).trim();
    const segment = normalizePartieContinuation(segmentRaw);
    const { context, questions } = extractContextAndQuestions(segment);

    partsBuilt.push({
      label: `Partie ${m.letter}`,
      context,
      questions,
    });
    merged.push(...questions);
  }

  applyExerciseTotalPoints(merged, headerPoints);

  const documents = extractLikelyStructuredDocuments(body);
  const confidence = computeQuestionConfidence(prelude, merged);

  const raw_excerpt = body.length > 800 ? `${body.slice(0, 800).trim()}…` : body;

  return {
    title: title ?? `Exercice ${exerciseNumber}`,
    context: prelude,
    parts: partsBuilt,
    documents,
    questions: merged,
    raw_excerpt,
    confidence,
  };
}

/** Harmonise suite de partie après coupure de page (sauts déjà normalisés en \\n dans normalizeText). */
function normalizePartieContinuation(segment: string): string {
  return segment.replace(/^\u000c+/g, "").trim();
}

function extractContextAndQuestions(segmentBody: string): {
  context: string;
  questions: ParsedExerciseQuestion[];
} {
  const questionStart = /^\s*(\d{1,2})\s*[\).\u2013\-:]\s+/m;
  let firstQuestionIndex = segmentBody.search(questionStart);
  if (firstQuestionIndex < 0) {
    const alt = /\n\s*(\d{1,2})\s*[\).\u2013\-:]/m.exec(segmentBody);
    firstQuestionIndex = alt?.index ?? -1;
  }

  const context =
    firstQuestionIndex >= 0 ? segmentBody.slice(0, firstQuestionIndex).trim() : segmentBody.trim();
  const questionsBlock = firstQuestionIndex >= 0 ? segmentBody.slice(firstQuestionIndex).trim() : "";

  let questions = parseQuestions(questionsBlock);
  if (questions.length === 0 && questionsBlock.length >= 120) {
    questions = parseQuestionsFallback(questionsBlock);
  }

  return { context, questions };
}

function computeQuestionConfidence(globalContext: string, questions: ParsedExerciseQuestion[]): ParsingConfidence {
  const substantialQs = questions.filter(
    (q) =>
      q.text.trim().length >= minQuestionStemLength(q) ||
      (q.subquestions ?? []).some((s) => s.text.trim().length >= 18),
  );

  let confidence: ParsingConfidence =
    substantialQs.length >= 2 ? "high" : substantialQs.length === 1 ? "medium" : "low";
  if (questions.length > 0 && substantialQs.length === 0) confidence = "low";
  if (questions.length === 0 && globalContext.length >= 120) confidence = "low";
  return confidence;
}

function minQuestionStemLength(question: ParsedExerciseQuestion): number {
  return (question.subquestions ?? []).length > 0 ? 8 : 18;
}

function parseExerciseHeaderPoints(headerLine: string | null): number | null {
  if (!headerLine) return null;
  const m = headerLine.match(/\(\s*(\d{1,3})\s*points?\s*\)/i);
  return m ? Number.parseInt(m[1] ?? "", 10) : null;
}

function applyExerciseTotalPoints(questions: ParsedExerciseQuestion[], total: number | null): void {
  if (total === null || !Number.isFinite(total) || questions.length === 0) return;
  const hasIndividual = questions.some((q) => typeof q.points === "number");
  if (hasIndividual) return;
  const per = Math.round((total / questions.length) * 10) / 10;
  for (const q of questions) {
    q.points = per;
  }
}

async function attachPageImageAssets(
  pdfBytes: Uint8Array,
  paperId: string,
  exercises: ExamExercise[],
  assetsRoot: string,
): Promise<void> {
  const pageImages = await renderPdfPages(pdfBytes, collectExercisePages(exercises));
  if (pageImages.size === 0) {
    await cleanupRenderedPages(pageImages);
    return;
  }

  const safePaperId = safePathSegment(paperId);

  for (const [exerciseIndex, exercise] of exercises.entries()) {
    const pages = extractExercisePageNumbers(exercise.raw_text);
    const effectivePages = pages.length > 0 ? pages : [exerciseIndex + 1];
    const docs = exercise.parsed_content?.documents ?? [];
    const safeExerciseId = safePathSegment(exercise.id);
    const exerciseDir = join(assetsRoot, safePaperId, safeExerciseId);
    const hasStructuredTable = docs.some((doc) => doc.type === "table" && doc.table !== undefined);
    await mkdir(exerciseDir, { recursive: true });

    for (const pageNumber of effectivePages) {
      const renderedPath = pageImages.get(pageNumber);
      if (renderedPath === undefined) continue;
      const fileName = `page-${pageNumber}.png`;
      const destination = join(exerciseDir, fileName);
      await copyFile(renderedPath, destination);
      const local_path = [assetsRoot, safePaperId, safeExerciseId, fileName].join("/");
      docs.push({
        type: "image",
        label: effectivePages.length > 1 ? `Page ${pageNumber} de l'exercice` : "Capture de l'exercice",
        local_path,
        alt: inferExerciseImageAlt(exercise),
        page_number: pageNumber,
        sort_order: docs.length,
        fallback: hasStructuredTable,
      });
    }

    if (exercise.parsed_content) {
      exercise.parsed_content.documents = docs;
    }
  }

  await cleanupRenderedPages(pageImages);
}

function collectExercisePages(exercises: ExamExercise[]): number[] {
  const pages = new Set<number>();
  exercises.forEach((exercise, index) => {
    const fromText = extractExercisePageNumbers(exercise.raw_text);
    if (fromText.length > 0) fromText.forEach((page) => pages.add(page));
    else pages.add(index + 1);
  });
  return [...pages].sort((a, b) => a - b);
}

function extractExercisePageNumbers(rawText: string): number[] {
  const matches = [...rawText.matchAll(/\bPage\s+(\d{1,3})\s+sur\s+\d{1,3}\b/gi)];
  const pages = matches
    .map((match) => Number.parseInt(match[1] ?? "", 10))
    .filter((page) => Number.isFinite(page) && page > 0);
  return [...new Set(pages)];
}

async function renderPdfPages(pdfBytes: Uint8Array, pageNumbers: number[]): Promise<Map<number, string>> {
  const rendered = new Map<number, string>();
  if (pageNumbers.length === 0) return rendered;

  const dir = await mkdtemp(join(tmpdir(), "exam-assets-"));
  const pdfPath = join(dir, "input.pdf");
  await writeFile(pdfPath, pdfBytes);

  try {
    for (const pageNumber of pageNumbers) {
      const prefix = join(dir, `page-${pageNumber}`);
      try {
        await execFileAsync("pdftoppm", ["-png", "-r", "144", "-f", String(pageNumber), "-l", String(pageNumber), pdfPath, prefix], {
          timeout: 30_000,
        });
        const renderedPath = join(dir, `page-${pageNumber}-${pageNumber}.png`);
        rendered.set(pageNumber, renderedPath);
      } catch {
        // Poppler is optional for text parsing. Asset generation is best-effort.
      }
    }
    return rendered;
  } catch {
    return rendered;
  }
}

async function cleanupRenderedPages(pageImages: Map<number, string>): Promise<void> {
  const firstPath = pageImages.values().next().value;
  if (typeof firstPath === "string") {
    await rm(dirname(firstPath), { force: true, recursive: true });
  }
}

function inferExerciseImageAlt(exercise: ExamExercise): string {
  const title = exercise.title ?? `Exercice ${exercise.exercise_number ?? ""}`.trim();
  const text = exercise.raw_text.toLowerCase();
  if (text.includes("température") || text.includes("temperature")) {
    return `Tableau ou figure associé à ${title}, dont les températures moyennes mensuelles.`;
  }
  if (text.includes("figure") || text.includes("schéma") || text.includes("schema")) {
    return `Figure ou schéma associé à ${title}.`;
  }
  if (text.includes("tableau") || text.includes("questions") || text.includes("réponse")) {
    return `Tableau associé à ${title}.`;
  }
  return `Capture PDF complète de ${title}.`;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function extractLikelyStructuredDocuments(body: string): ParsedExerciseContent["documents"] {
  const structuredTables = detectStructuredTables(body);
  if (structuredTables.length > 0) {
    return structuredTables;
  }

  const fromTables = extractPipeTables(body);
  if (fromTables.length > 0) return fromTables;
  return extractQcmTableSlices(body).slice(0, 3);
}

function extractPipeTables(body: string): ParsedExerciseContent["documents"] {
  const lines = body.split("\n");
  const chunks: string[] = [];
  let buf: string[] = [];

  const flush = (): void => {
    if (buf.length >= 2) {
      const content = buf.join("\n").trim();
      if (content.length >= 30) chunks.push(content);
    }
    buf = [];
  };

  for (const raw of lines) {
    const pipeCount = (raw.match(/\|/g) ?? []).length;
    if (pipeCount >= 2) buf.push(raw.trimEnd());
    else flush();
  }
  flush();

  return chunks.slice(0, 3).map((content, idx) => ({
    label: `Tableau ${idx + 1}`,
    content,
    type: "table" as const,
  }));
}

function extractQcmTableSlices(body: string): ParsedExerciseContent["documents"] {
  const lower = body.toLowerCase();
  const idx = lower.indexOf("réponse");
  if (idx < 0 || !/\bQuestions\b/i.test(body)) return [];

  const slice = body.slice(Math.max(0, idx - 400), Math.min(body.length, idx + 3500)).trim();
  if (slice.length < 120) return [];
  return [{ label: "Tableau — QCM", content: slice, type: "table" as const }];
}

function parseQuestionsFallback(block: string): ParsedExerciseQuestion[] {
  const parts = block
    .split(/\n(?=\s*\d{1,2}\s*[\).\u2013\-:]\s+)/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const items: ParsedExerciseQuestion[] = [];

  for (const raw of parts) {
    const lead = raw.match(/^(\d{1,2})\s*[\).\u2013\-:]\s+/);
    if (!lead?.[1]) continue;
    const qNumber = lead[1];
    const qText = raw.slice(lead[0].length).trim();
    const pts = extractTrailingPoints(raw);
    const subParsed = parseSubquestions(qText);
    const stemEnd = subParsed.length > 0 ? Math.max(0, subParsed[0]!.leadIndex) : qText.length;
    const stem = qText.slice(0, stemEnd).trim();
    const displayStem = stem.length > 0 ? stem : subParsed.length > 0 ? "" : qText;

    items.push(buildQuestion(qNumber, displayStem, pts, subParsed));
  }

  return items;
}

function extractTrailingPoints(line: string): number | null {
  const m = line.match(/\(\s*(\d{1,2}(?:[\.,]\d+)?)\s*points?\s*\)\s*$/i);
  if (!m) return null;
  return Number.parseFloat(m[1]!.replace(",", "."));
}

function parseSubquestions(
  qText: string,
): Array<{ id: string; label: string; text: string; leadIndex: number }> {
  const subMatches = [...qText.matchAll(/(?:^|\n)\s*([a-z])\s*[\).:\-\u2013]\s+/gi)];
  if (subMatches.length === 0) return [];

  const subquestions: Array<{ id: string; label: string; text: string; leadIndex: number }> = [];

  for (let s = 0; s < subMatches.length; s += 1) {
    const sm = subMatches[s];
    const sStart = sm.index ?? 0;
    const sEnd = subMatches[s + 1]?.index ?? qText.length;
    const letter = (sm[1] ?? String.fromCharCode(97 + s)).toLowerCase();
    const sRaw = qText.slice(sStart, sEnd).trim();
    const sText = sRaw.replace(/^\s*[a-z]\s*[\).:\-\u2013]\s+/i, "").trim();
    subquestions.push({ id: letter, label: `${letter}.`, text: sText, leadIndex: sm.index ?? -1 });
  }

  return subquestions;
}

function parseQuestions(block: string): ParsedExerciseQuestion[] {
  if (!block) return [];

  const normalized = block.replace(/\r/g, "\n");
  const questionMatches = [...normalized.matchAll(/^\s*(\d{1,2})\s*[\).\u2013\-:]\s+/gm)];
  if (questionMatches.length === 0) return [];

  const items: ParsedExerciseQuestion[] = [];

  for (let i = 0; i < questionMatches.length; i += 1) {
    const match = questionMatches[i];
    const start = match.index ?? 0;
    const end = questionMatches[i + 1]?.index ?? normalized.length;
    const qNumber = match[1] ?? String(i + 1);
    const raw = normalized.slice(start, end).trim();
    const qText = raw.replace(/^\s*\d{1,2}\s*[\).\u2013\-:]\s+/, "").trim();

    const subParsed = parseSubquestions(qText);
    const pts = extractTrailingPoints(raw);

    const stemEnd = subParsed.length > 0 ? Math.max(0, subParsed[0]!.leadIndex) : qText.length;
    const stem = qText.slice(0, stemEnd).trim();
    const displayStem = stem.length > 0 ? stem : subParsed.length > 0 ? "" : qText;

    items.push(buildQuestion(qNumber, displayStem, pts, subParsed));
  }

  return items;
}

function buildQuestion(
  qNumber: string,
  text: string,
  points: number | null,
  subParsed: Array<{ id: string; label: string; text: string; leadIndex: number }>,
): ParsedExerciseQuestion {
  return {
    id: qNumber,
    label: `${qNumber}.`,
    text,
    points,
    answer_type: inferAnswerType(text),
    expected_answer: null,
    student_answer: null,
    options: inferMultipleChoiceOptions(text),
    subquestions: subParsed.map(({ id, label, text }) => ({ id: `${qNumber}${id}`, label, text })),
  };
}

function inferAnswerType(text: string): AnswerType {
  const normalized = text.toLowerCase();
  if (inferMultipleChoiceOptions(text).length > 0) return "multiple_choice";
  if (/\b(calculer|déterminer|arrondi|pourcentage|probabilité|volume|aire|longueur|hauteur|combien)\b/i.test(normalized)) {
    return "math";
  }
  if (/\bjustifier|expliquer|montrer|vérifier|affirmer|vrai|fausse?\b/i.test(normalized)) return "free_text";
  if (/\bquelle formule|quel nombre|quelle est|quel est\b/i.test(normalized)) return "short_text";
  return text.length > 180 ? "free_text" : "short_text";
}

function inferMultipleChoiceOptions(text: string): string[] {
  const compact = text.replace(/\s+/g, " ").trim();
  const explicit = [...compact.matchAll(/\b(?:Réponse\s*)?([ABC])\s*[:.)-]\s*([^ABC]{1,90})(?=\s+(?:Réponse\s*)?[ABC]\s*[:.)-]|$)/gi)]
    .map((match) => cleanText(match[2] ?? ""))
    .filter((option) => option.length > 0);
  return explicit.length >= 2 ? explicit.slice(0, 6) : [];
}

function buildPaperId(metadata: CollectedPaper, pdfHash: string): string {
  return [
    "dnb",
    metadata.source_name,
    metadata.session_year,
    slugify(metadata.discipline),
    metadata.series ?? "toutes-series",
    slugify(metadata.location),
    metadata.variant,
    pdfHash.slice(0, 12),
  ].join(":");
}

export function splitExercises(rawText: string): { status: ParsingStatus; items: Array<{ number: number | null; title: string | null; raw_text: string }> } {
  const text = rawText.trim();
  if (text.length === 0) {
    return { status: "failed", items: [{ number: null, title: null, raw_text: "" }] };
  }

  /** Seules les lignes « Exercice N (…) points » : évite faux positifs (« Exercice 3 avec… »). La TOC « Exercice N     20 points » est exclue (pas de parenthèses) et traitée comme doublon filtrée. */
  const matches = [
    ...text.matchAll(
      /\b(?:Exercice|EXERCICE)\s+(\d{1,2})\b[^\n\r]*?\(\s*\d{1,3}\s*points?\s*\)/gi,
    ),
  ];
  if (matches.length === 0) {
    return { status: "failed", items: [{ number: null, title: null, raw_text: text }] };
  }

  const items = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const raw_text = text.slice(start, end).trim();
    return {
      number: Number.parseInt(match[1] ?? String(index + 1), 10),
      title: cleanText(match[0]) || null,
      raw_text,
    };
  });

  const dedupedItems = removeExerciseIndexEntries(items);
  return { status: dedupedItems.length >= 2 ? "parsed" : "partial", items: dedupedItems };
}

function removeExerciseIndexEntries(
  items: Array<{ number: number | null; title: string | null; raw_text: string }>,
): Array<{ number: number | null; title: string | null; raw_text: string }> {
  const countsByNumber = new Map<number, number>();
  for (const item of items) {
    if (item.number === null) continue;
    countsByNumber.set(item.number, (countsByNumber.get(item.number) ?? 0) + 1);
  }

  const hasDuplicateNumbers = [...countsByNumber.values()].some((count) => count > 1);
  if (!hasDuplicateNumbers) return items;

  const filtered = items.filter((item) => {
    if (item.number === null) return true;
    const duplicate = (countsByNumber.get(item.number) ?? 0) > 1;
    const compactText = item.raw_text.replace(/\s+/g, " ").trim();
    const titleOnly = item.raw_text.length < 140 && /^exercice\s+\d{1,2}\s+(?:\(?\d+\s*points\)?)?$/i.test(compactText);
    const tableOfContentsEntry = item.raw_text.length < 600 && /\bpage\s+\d+\s+sur\s+\d+\b/i.test(compactText);
    return !(duplicate && (titleOnly || tableOfContentsEntry));
  });

  return filtered.length > 0 ? filtered : items;
}

async function tryPdftotext(pdfBytes: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "exam-import-"));
  const pdfPath = join(dir, "input.pdf");
  const textPath = join(dir, "output.txt");

  try {
    await writeFile(pdfPath, pdfBytes);
    await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath], { timeout: 30_000 });
    return await readFile(textPath, "utf8");
  } catch {
    return "";
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function tryCurlBytes(url: string): Promise<Uint8Array | null> {
  try {
    const { stdout } = await execFileAsync("curl", ["-L", "--compressed", "-s", "-A", "TutorlyExamImport/1.0", url], {
      encoding: "buffer",
      maxBuffer: 100 * 1024 * 1024,
      timeout: 60_000,
    });
    return new Uint8Array(stdout);
  } catch {
    return null;
  }
}

function extractReadablePdfStrings(buffer: Buffer): string {
  const content = buffer.toString("latin1");
  const strings: string[] = [];
  const stringPattern = /\(((?:\\.|[^\\()]){3,})\)\s*Tj/g;
  const arrayPattern = /\[((?:\s*\((?:\\.|[^\\()])*\)\s*-?\d*)+)\]\s*TJ/g;

  for (const match of content.matchAll(stringPattern)) {
    strings.push(unescapePdfString(match[1] ?? ""));
  }

  for (const match of content.matchAll(arrayPattern)) {
    const segment = match[1] ?? "";
    for (const part of segment.matchAll(/\((?:\\.|[^\\()])*\)/g)) {
      strings.push(unescapePdfString(part[0].slice(1, -1)));
    }
  }

  return strings.join("\n");
}

function unescapePdfString(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
      return map[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
