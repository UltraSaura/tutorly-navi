import type { CollectedPaper, ExamSeries, ExamVariant } from "../parsers/pdf-to-exam.ts";

const EDUSCOL_DNB_URL =
  "https://eduscol.education.gouv.fr/5202/preparer-le-diplome-national-du-brevet-dnb-avec-les-sujets-des-annales";

interface EduscolRow {
  session?: string;
  discipline?: string;
  "série"?: string;
  description?: string;
  links?: Array<{ label?: string; url?: string }>;
}

export interface EduscolCollectOptions {
  year?: number;
  discipline?: string;
  series?: ExamSeries;
}

export async function collectEduscolDnb(options: EduscolCollectOptions = {}): Promise<CollectedPaper[]> {
  const fetched_at = new Date().toISOString();
  const html = await fetchText(EDUSCOL_DNB_URL);
  const rows = extractComplexTableData(html);

  return rows.flatMap((row) => mapRow(row, fetched_at)).filter((paper) => {
    if (options.year !== undefined && paper.session_year !== options.year) return false;
    if (options.discipline !== undefined && normalize(paper.discipline) !== normalize(options.discipline)) return false;
    if (options.series !== undefined && paper.series !== options.series) return false;
    return true;
  });
}

function extractComplexTableData(html: string): EduscolRow[] {
  const match = html.match(/<script[^>]+id=["']complex-table-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) {
    throw new Error("Unable to find Eduscol complex-table-data JSON payload");
  }

  const decoded = decodeHtml(match[1].trim());
  const parsed: unknown = JSON.parse(decoded);
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected Eduscol table payload: expected an array");
  }

  return parsed as EduscolRow[];
}

function mapRow(row: EduscolRow, fetched_at: string): CollectedPaper[] {
  const session_year = extractYear(row.session ?? "");
  if (session_year === null) return [];

  const discipline = row.discipline?.trim() || "inconnue";
  const series = normalizeSeries(row["série"] ?? "");
  const location = normalizeLocation(stripHtml(row.description ?? ""));
  const links = row.links ?? [];

  return links
    .filter((link) => link.url !== undefined && /\.pdf(?:[?#].*)?$/i.test(link.url))
    .map((link) => ({
      source_name: "eduscol",
      source_url: EDUSCOL_DNB_URL,
      fetched_at,
      exam: "dnb",
      session_year,
      discipline: normalizeDiscipline(discipline),
      series,
      location,
      variant: normalizeVariant(link.label ?? "", link.url ?? ""),
      pdf_url: link.url ?? "",
      title: [row.session, discipline, row["série"], stripHtml(row.description ?? ""), link.label].filter(Boolean).join(" - "),
    }));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-schoolprg)" },
  });
  if (!response.ok) throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  return response.text();
}

function extractYear(value: string): number | null {
  const match = value.match(/\b(20\d{2}|19\d{2})\b/);
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

function normalizeSeries(value: string): ExamSeries {
  const normalized = normalize(value);
  if (normalized.includes("professionnelle")) return "professionnelle";
  if (normalized.includes("generale")) return "generale";
  return null;
}

function normalizeVariant(label: string, url: string): ExamVariant {
  const value = normalize(`${label} ${url}`);
  if (value.includes("arial-16") || value.includes("arial 16") || value.includes("a16pdf")) return "arial16";
  if (value.includes("arial-20") || value.includes("arial 20") || value.includes("a20pdf")) return "arial20";
  if (value.includes("arial-24") || value.includes("arial 24") || value.includes("a24pdf")) return "arial24";
  if (value.includes("braille integral") || value.includes("bizip")) return "braille_integral";
  if (value.includes("braille abrege") || value.includes("bazip")) return "braille_abrege";
  return "standard";
}

function normalizeLocation(value: string): string {
  const normalized = normalize(value);
  if (normalized.includes("metropole")) return "metropole";
  if (normalized.includes("amerique du nord")) return "amerique_du_nord";
  if (normalized.includes("amerique du sud")) return "amerique_du_sud";
  if (normalized.includes("antilles") || normalized.includes("guyane")) return "antilles_guyane";
  if (normalized.includes("pondichery")) return "pondichery";
  if (normalized.includes("asie")) return "asie";
  if (normalized.includes("nouvelle-caledonie")) return "nouvelle_caledonie";
  if (normalized.includes("polynesie")) return "polynesie_francaise";
  if (normalized.includes("groupe 1")) return "pays_groupe_1";
  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "inconnue";
}

function normalizeDiscipline(value: string): string {
  const normalized = normalize(value);
  if (normalized === "mathematiques") return "mathematiques";
  if (normalized.startsWith("francais")) return normalized.replace(/[^a-z0-9]+/g, "_");
  if (normalized.includes("histoire") && normalized.includes("emc")) return "histoire_geographie_emc";
  if (normalized.includes("sciences")) return "sciences";
  return normalized.replace(/[^a-z0-9]+/g, "_");
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#160;/g, " ");
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
