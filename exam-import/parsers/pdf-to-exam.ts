import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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

export interface ParsedExerciseContent {
  title: string | null;
  context: string;
  documents: Array<{
    label: string;
    content: string;
    type: "text" | "table" | "image" | "graph";
  }>;
  questions: Array<{
    id: string;
    label: string;
    text: string;
    points: number | null;
    subquestions: Array<{
      id: string;
      label: string;
      text: string;
    }>;
  }>;
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
  pdf_hash: string;
  raw_text: string;
  exercises: string[];
  parsing_status: ParsingStatus;
}

export interface ParsedExamPaper {
  paper: ExamPaper;
  exercises: ExamExercise[];
}

export function sha256(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function downloadPdf(url: string): Promise<Uint8Array> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-schoolprg)" },
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
): Promise<ParsedExamPaper> {
  const pdf_hash = sha256(pdfBytes);
  const raw_text = await extractPdfText(pdfBytes);
  const paper_id = buildPaperId(metadata, pdf_hash);
  const chunks = splitExercises(raw_text);
  const parsing_status = chunks.status;

  const exercises = chunks.items.map((item, index) => {
    const exercise_number = item.number ?? index + 1;
    const parsed = parseExercisePedagogical(item.raw_text, item.title, exercise_number);
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
      title: item.title,
      raw_text: item.raw_text,
      parsing_status: effectiveStatus,
      parsed_content: parsed,
      parsing_confidence: parsed.confidence,
    } satisfies ExamExercise;
  });

  return {
    paper: {
      ...metadata,
      id: paper_id,
      pdf_hash,
      raw_text,
      exercises: exercises.map((exercise) => exercise.id),
      parsing_status,
    },
    exercises,
  };
}

function parseExercisePedagogical(rawText: string, title: string | null, exerciseNumber: number): ParsedExerciseContent {
  const cleaned = normalizeText(rawText);

  const withoutFooter = cleaned.replace(/\n?\b\d{2,}[A-Z]{2,}\w*\s+Page\s+\d+\s+sur\s+\d+\b[\s\S]*$/i, "").trim();
  const content = withoutFooter || cleaned;

  const questionStart = /^\s*(\d{1,2})\s*[\).\u2013\-:]\s+/m;

  const text = content.split("\n").join("\n").trim();

  const body = text.replace(/^\s*(?:Exercice|EXERCICE)\s+\d{1,2}\b[^\n]*\n+/m, "").trim();

  const headerPoints = parseExerciseHeaderPoints(title);

  const firstLead = body.match(questionStart);
  let firstQuestionIndex = firstLead?.index ?? -1;
  if (firstQuestionIndex < 0) {
    const alt = /\n\s*(\d{1,2})\s*[\).\u2013\-:]/m.exec(body);
    firstQuestionIndex = alt?.index ?? -1;
  }

  const context = firstQuestionIndex >= 0 ? body.slice(0, firstQuestionIndex).trim() : body.trim();
  const questionsBlock = firstQuestionIndex >= 0 ? body.slice(firstQuestionIndex).trim() : "";

  let questions = parseQuestions(questionsBlock);
  if (questions.length === 0 && questionsBlock.length >= 120) {
    questions = parseQuestionsFallback(questionsBlock);
  }

  const documents = extractLikelyStructuredDocuments(body);

  const substantialQs = questions.filter(
    (q) =>
      q.text.trim().length >= minQuestionStemLength(q) ||
      (q.subquestions ?? []).some((s) => s.text.trim().length >= 18),
  );

  let confidence: ParsingConfidence =
    substantialQs.length >= 2 ? "high" : substantialQs.length === 1 ? "medium" : "low";
  if (questions.length > 0 && substantialQs.length === 0) confidence = "low";
  if (questions.length === 0 && context.length >= 120) confidence = "low";

  applyExerciseTotalPoints(questions, headerPoints);

  const raw_excerpt = body.length > 800 ? `${body.slice(0, 800).trim()}…` : body;

  return {
    title: title ?? `Exercice ${exerciseNumber}`,
    context,
    documents,
    questions,
    raw_excerpt,
    confidence,
  };
}

function minQuestionStemLength(question: ParsedExerciseContent["questions"][number]): number {
  return (question.subquestions ?? []).length > 0 ? 8 : 18;
}

function parseExerciseHeaderPoints(headerLine: string | null): number | null {
  if (!headerLine) return null;
  const m = headerLine.match(/\(\s*(\d{1,3})\s*points?\s*\)/i);
  return m ? Number.parseInt(m[1] ?? "", 10) : null;
}

function applyExerciseTotalPoints(questions: ParsedExerciseContent["questions"], total: number | null): void {
  if (total === null || !Number.isFinite(total) || questions.length === 0) return;
  const hasIndividual = questions.some((q) => typeof q.points === "number");
  if (hasIndividual) return;
  const per = Math.round((total / questions.length) * 10) / 10;
  for (const q of questions) {
    q.points = per;
  }
}

function extractLikelyStructuredDocuments(body: string): ParsedExerciseContent["documents"] {
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

function parseQuestionsFallback(block: string): ParsedExerciseContent["questions"] {
  const parts = block
    .split(/\n(?=\s*\d{1,2}\s*[\).\u2013\-:]\s+)/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const items: ParsedExerciseContent["questions"] = [];

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

    items.push({
      id: qNumber,
      label: `${qNumber}.`,
      text: displayStem,
      points: pts,
      subquestions: subParsed.map(({ id, label, text }) => ({ id: `${qNumber}${id}`, label, text })),
    });
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

function parseQuestions(block: string): ParsedExerciseContent["questions"] {
  if (!block) return [];

  const normalized = block.replace(/\r/g, "\n");
  const questionMatches = [...normalized.matchAll(/^\s*(\d{1,2})\s*[\).\u2013\-:]\s+/gm)];
  if (questionMatches.length === 0) return [];

  const items: ParsedExerciseContent["questions"] = [];

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

    items.push({
      id: qNumber,
      label: `${qNumber}.`,
      text: displayStem,
      points: pts,
      subquestions: subParsed.map(({ id, label, text }) => ({ id: `${qNumber}${id}`, label, text })),
    });
  }

  return items;
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

function splitExercises(rawText: string): { status: ParsingStatus; items: Array<{ number: number | null; title: string | null; raw_text: string }> } {
  const text = rawText.trim();
  if (text.length === 0) {
    return { status: "failed", items: [{ number: null, title: null, raw_text: "" }] };
  }

  const matches = [...text.matchAll(/\b(?:Exercice|EXERCICE)\s+(\d{1,2})\b[^\n\r]*/g)];
  if (matches.length === 0) {
    return { status: "failed", items: [{ number: null, title: null, raw_text: text }] };
  }

  const items = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;
    const raw_text = text.slice(start, end).trim();
    return {
      number: Number.parseInt(match[1] ?? String(index + 1), 10),
      title: match[0]?.trim() ?? null,
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
  return text.replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
