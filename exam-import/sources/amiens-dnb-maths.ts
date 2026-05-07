import type { CollectedPaper } from "../parsers/pdf-to-exam.ts";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const AMIENS_DNB_MATHS_URL = "https://maths.ac-amiens.fr/065-annales-de-sujets-dnb.html";
const execFileAsync = promisify(execFile);

export interface AmiensCollectOptions {
  year?: number;
}

export async function collectAmiensDnbMaths(options: AmiensCollectOptions = {}): Promise<CollectedPaper[]> {
  const fetched_at = new Date().toISOString();
  const html = await fetchText(AMIENS_DNB_MATHS_URL);
  const sectionPattern = /<h2[^>]*id=["']sujet_de_([^"']+)["'][^>]*>([\s\S]*?)(?=<h2[^>]*id=["']sujet_de_|<\/article>|<\/div>\s*<\/main>)/gi;
  const papers: CollectedPaper[] = [];

  for (const section of html.matchAll(sectionPattern)) {
    const sectionKey = section[1] ?? "";
    const sectionHtml = section[0] ?? "";
    const year = extractYear(sectionKey);
    if (year === null) continue;
    if (options.year !== undefined && options.year !== year) continue;

    for (const link of extractPdfLinks(sectionHtml)) {
      papers.push({
        source_name: "ac-amiens-maths",
        source_url: AMIENS_DNB_MATHS_URL,
        fetched_at,
        exam: "dnb",
        session_year: year,
        discipline: "mathematiques",
        series: "generale",
        location: "metropole",
        variant: "standard",
        pdf_url: new URL(link.href, AMIENS_DNB_MATHS_URL).toString(),
        title: link.label || `DNB mathematiques metropole ${year}`,
      });
    }
  }

  return dedupeByPdfUrl(papers);
}

async function fetchText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "TutorlyExamImport/1.0 (+https://github.com/UltraSaura/tutorly-schoolprg)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } catch (error) {
    const fallback = await tryCurlText(url);
    if (fallback !== null) return fallback;
    throw new Error(`Unable to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function tryCurlText(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("curl", ["-L", "--compressed", "-s", "-A", "TutorlyExamImport/1.0", url], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30_000,
    });
    return stdout;
  } catch {
    return null;
  }
}

function extractPdfLinks(html: string): Array<{ href: string; label: string }> {
  const links: Array<{ href: string; label: string }> = [];
  const pattern = /<a\b[^>]*href=["']([^"']+\.pdf)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    links.push({
      href: decodeHtml(match[1] ?? ""),
      label: stripHtml(match[2] ?? ""),
    });
  }

  return links;
}

function extractYear(value: string): number | null {
  const match = value.match(/(20\d{2}|19\d{2})/);
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

function dedupeByPdfUrl(papers: CollectedPaper[]): CollectedPaper[] {
  const seen = new Set<string>();
  return papers.filter((paper) => {
    if (seen.has(paper.pdf_url)) return false;
    seen.add(paper.pdf_url);
    return true;
  });
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
