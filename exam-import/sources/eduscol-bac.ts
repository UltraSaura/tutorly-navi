/**
 * eduscol-bac — Scraper for BAC annales on Eduscol
 *
 * Source page:
 *   https://eduscol.education.gouv.fr/5199/annales-des-epreuves-du-baccalaureat-des-voies-generale-et-technologique
 *
 * The page embeds a <script id="complex-table-data"> JSON array with fields:
 *   spécialité, voie, session, description, links[]
 *
 * Each row may have pipe-separated values in session/voie (when a paper covers
 * multiple sessions or series). We expand those into individual entries.
 */

import type { CollectedPaper, ExamSeries, ExamVariant } from "../parsers/pdf-to-exam.ts";
import { cleanText, decodeHtmlEntities } from "../utils/cleanText.ts";

export const EDUSCOL_BAC_URL =
  "https://eduscol.education.gouv.fr/5199/annales-des-epreuves-du-baccalaureat-des-voies-generale-et-technologique";

interface BacRow {
  "spécialité"?: string;
  voie?: string;
  session?: string;
  description?: string;
  links?: Array<{ label?: string; url?: string }>;
}

export interface EduscolBacCollectOptions {
  year?: number;
  specialite?: string;     // e.g. "Mathématiques", "Physique-Chimie"
  voie?: string;           // e.g. "generale", "stmg", "sti2d"
}

export async function collectEduscolBac(
  options: EduscolBacCollectOptions = {},
): Promise<CollectedPaper[]> {
  const fetched_at = new Date().toISOString();
  const html = await fetchText(EDUSCOL_BAC_URL);
  const rows = extractTableData(html);

  // Expand pipe-separated voie/session rows into individual entries
  const expanded = rows.flatMap(expandRow);

  return expanded
    .flatMap((row) => mapRow(row, fetched_at))
    .filter((paper) => {
      if (options.year !== undefined && paper.session_year !== options.year) return false;
      if (
        options.specialite !== undefined &&
        normalize(paper.discipline) !== normalize(options.specialite)
      )
        return false;
      if (options.voie !== undefined && !paper.series?.includes(normalize(options.voie)))
        return false;
      return true;
    });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function extractTableData(html: string): BacRow[] {
  const match = html.match(/<script[^>]+id=["']complex-table-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) {
    throw new Error("Unable to find Eduscol BAC complex-table-data JSON payload");
  }
  const decoded = decodeHtmlEntities(match[1].trim());
  const parsed: unknown = JSON.parse(decoded);
  if (!Array.isArray(parsed)) throw new Error("Unexpected BAC table payload: expected array");
  return parsed as BacRow[];
}

/** Some rows have pipe-separated voie/session values; expand them. */
function expandRow(row: BacRow): BacRow[] {
  const voies = (row.voie ?? "").split("|").map((v) => v.trim()).filter(Boolean);
  const sessions = (row.session ?? "").split("|").map((s) => s.trim()).filter(Boolean);

  if (voies.length <= 1 && sessions.length <= 1) return [row];

  const result: BacRow[] = [];
  for (const voie of voies.length > 0 ? voies : [""]) {
    for (const session of sessions.length > 0 ? sessions : [""]) {
      result.push({ ...row, voie, session });
    }
  }
  return result;
}

function mapRow(row: BacRow, fetched_at: string): CollectedPaper[] {
  const session_year = extractYear(row.session ?? "");
  if (session_year === null) return [];

  const specialite = cleanText(row["spécialité"]) || "inconnue";
  const discipline = normalizeDiscipline(specialite);
  const series = normalizeVoie(row.voie ?? "");
  const description = row.description ?? "";
  const location = normalizeLocation(description);
  const links = row.links ?? [];

  return links
    .filter((link) => link.url !== undefined && /\.pdf(?:[?#].*)?$/i.test(link.url))
    .map((link) => ({
      source_name: "eduscol",
      source_url: EDUSCOL_BAC_URL,
      fetched_at,
      exam: "bac",
      session_year,
      discipline,
      series,
      location,
      variant: normalizeVariant(link.label ?? "", link.url ?? ""),
      pdf_url: link.url ?? "",
      title: [
        cleanText(row.session),
        specialite,
        cleanText(row.voie),
        location,
        cleanText(link.label),
      ]
        .filter(Boolean)
        .join(" - "),
    }));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-navi)",
    },
  });
  if (!response.ok) throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  return response.text();
}

function extractYear(value: string): number | null {
  const match = value.match(/\b(20\d{2})\b/);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

/**
 * Normalize voie to a compact series string.
 * "Baccalauréat général"               → "bac_general"
 * "Baccalauréat technologique - STMG"  → "bac_stmg"
 * "Baccalauréat technologique - STI2D" → "bac_sti2d"
 */
function normalizeVoie(voie: string): ExamSeries {
  const n = normalize(voie);
  if (n.includes("general")) return "bac_general";
  if (n.includes("stmg")) return "bac_stmg";
  if (n.includes("sti2d")) return "bac_sti2d";
  if (n.includes("std2a")) return "bac_std2a";
  if (n.includes("st2s")) return "bac_st2s";
  if (n.includes("stl")) return "bac_stl";
  if (n.includes("sthr")) return "bac_sthr";
  if (n.includes("s2tmd")) return "bac_s2tmd";
  if (n.includes("technologique")) return "bac_technologique";
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

function normalizeLocation(description: string): string {
  // Description format: <em>Métropole, Mayotte, La Réunion, Antilles Guyane</em><br>...
  const emMatch = description.match(/<em>([^<]+)<\/em>/i);
  const raw = emMatch ? emMatch[1] : description.replace(/<[^>]+>/g, " ");
  const n = normalize(raw);
  if (n.includes("metropole")) return "metropole";
  if (n.includes("amerique du nord")) return "amerique_du_nord";
  if (n.includes("amerique du sud")) return "amerique_du_sud";
  if (n.includes("antilles") || n.includes("guyane")) return "antilles_guyane";
  if (n.includes("pondichery")) return "pondichery";
  if (n.includes("asie")) return "asie";
  if (n.includes("nouvelle-caledonie") || n.includes("nouvelle caledonie")) return "nouvelle_caledonie";
  if (n.includes("polynesie")) return "polynesie_francaise";
  if (n.includes("liban")) return "liban";
  if (n.includes("mayotte")) return "mayotte";
  if (n.includes("reunion")) return "reunion";
  const safe = n.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return safe || "inconnue";
}

function normalizeDiscipline(specialite: string): string {
  const n = normalize(specialite);
  if (n.startsWith("mathematique")) return "mathematiques";
  if (n.startsWith("physique")) return "physique_chimie";
  if (n.startsWith("sciences de la vie")) return "svt";
  if (n.startsWith("histoire") && n.includes("geo")) return "histoire_geographie";
  if (n.startsWith("francais")) return "francais";
  if (n.startsWith("philosophie")) return "philosophie";
  if (n.startsWith("anglais") || n.startsWith("langues vivantes")) return "anglais";
  if (n.startsWith("sciences economiques")) return "ses";
  if (n.startsWith("numerique") || n.startsWith("nsi")) return "nsi";
  return n.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "inconnue";
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
