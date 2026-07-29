import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CollectedPaper } from "../parsers/pdf-to-exam.ts";

const execFileAsync = promisify(execFile);

const APMEP_BASE = "https://www.apmep.fr";
const yearUrl = (year: number) => `${APMEP_BASE}/Brevet-${year}`;
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = Array.from({ length: CURRENT_YEAR - 2014 }, (_, i) => CURRENT_YEAR - i);

export interface ApmepCollectOptions {
  year?: number;
  years?: number[];
}

export async function collectApmepDnb(options: ApmepCollectOptions = {}): Promise<CollectedPaper[]> {
  const years =
    options.year !== undefined ? [options.year] : options.years ?? DEFAULT_YEARS;

  const results = await Promise.allSettled(years.map((y) => collectYear(y)));
  const papers: CollectedPaper[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      papers.push(...result.value);
    } else {
      console.warn(`APMEP ${years[i]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }
  return papers;
}

async function collectYear(year: number): Promise<CollectedPaper[]> {
  const url = yearUrl(year);
  const html = await fetchText(url);
  const fetched_at = new Date().toISOString();
  const papers: CollectedPaper[] = [];

  // The APMEP page has one or more tables with rows per session.
  // Columns (by order): session label | sujet PDF | corrigé PDF | sujet LaTeX | corrigé LaTeX
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowRe)) {
    const cells = extractCells(rowMatch[1]);
    if (cells.length < 2) continue;

    const label = stripHtml(cells[0]).replace(/\s+/g, " ").trim();
    if (!label || /^\s*(sujet|corrig|annee|année|session)/i.test(label)) continue;

    // PDF in column 1 (sujet PDF)
    const pdfHref = firstHref(cells[1], /\.pdf$/i) ?? firstHref(cells[1], /\//);
    if (!pdfHref) continue;

    // LaTeX ZIP in column 3 (sujet LaTeX) — optional
    const latexHref = cells[3] !== undefined ? firstHref(cells[3], /\.zip$/i) : null;

    const pdfUrl = resolveUrl(pdfHref, url);
    const latexZipUrl = latexHref ? resolveUrl(latexHref, url) : undefined;
    const location = parseLocation(label);
    const variant = parseVariant(label);
    const title = `DNB mathématiques ${label} ${year}`;

    papers.push({
      source_name: "apmep",
      source_url: url,
      fetched_at,
      exam: "dnb",
      session_year: year,
      discipline: "mathematiques",
      series: "generale",
      location,
      variant,
      pdf_url: pdfUrl,
      latex_zip_url: latexZipUrl,
      title,
    });
  }

  return papers;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function extractCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  for (const m of rowHtml.matchAll(cellRe)) cells.push(m[1]);
  return cells;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .trim();
}

function firstHref(html: string, pattern: RegExp): string | null {
  const linkRe = /href=["']([^"']+)["']/gi;
  for (const m of html.matchAll(linkRe)) {
    if (pattern.test(m[1])) return m[1];
  }
  return null;
}

function resolveUrl(href: string, base: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${APMEP_BASE}${href}`;
  const baseDir = base.replace(/\/[^/]*$/, "");
  return `${baseDir}/${href}`;
}

// ── Metadata parsing ──────────────────────────────────────────────────────────

function parseLocation(label: string): string {
  const l = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/amerique.*(nord|nord)/i.test(l)) return "amerique_du_nord";
  if (/asie/i.test(l)) return "asie";
  if (/polynesie|polynesia/i.test(l)) return "polynesie";
  if (/antilles|guyane/i.test(l)) return "antilles_guyane";
  if (/reunion/i.test(l)) return "reunion";
  if (/centres?.*(etrangers?|hors)/i.test(l)) return "centres_etrangers";
  if (/liban/i.test(l)) return "liban";
  if (/pondichery/i.test(l)) return "pondichery";
  return "metropole";
}

function parseVariant(label: string): CollectedPaper["variant"] {
  const l = label.toLowerCase();
  if (/arial\s*24/i.test(l)) return "arial24";
  if (/arial\s*20/i.test(l)) return "arial20";
  if (/arial\s*16/i.test(l)) return "arial16";
  if (/braille.*abr/i.test(l)) return "braille_abrege";
  if (/braille/i.test(l)) return "braille_integral";
  return "standard";
}

// ── Fetching ─────────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-schoolprg)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch {
    return tryCurl(url);
  }
}

async function tryCurl(url: string): Promise<string> {
  const { stdout } = await execFileAsync("curl", ["-sL", "--max-time", "30", url]);
  return stdout;
}
