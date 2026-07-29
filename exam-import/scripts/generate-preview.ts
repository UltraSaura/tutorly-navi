/**
 * generate-preview.ts
 *
 * Generates a self-contained HTML preview from any training items bundle JSON.
 * One exercise per "screen"; bottom nav to move between exercises.
 *
 * Usage:
 *   node --experimental-strip-types exam-import/scripts/generate-preview.ts \
 *     --bundle exam-import/bundles/dnb-2024-training.json \
 *     --out public/preview.html
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// ─── Types (minimal, matching generate-training-items output) ────────────────

interface TrainingDocument {
  id?: string;
  label?: string;
  type: "image" | "table" | "text";
  content?: string;
  public_url?: string;
  local_path?: string;
  alt?: string;
  render_mode?: "image_first" | "text_first";
  fallback?: boolean;
  table?: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
}

interface Hint {
  level: number;
  text: string;
}

interface Question {
  id: string;
  label?: string;
  prompt: string;
  answer_type: string;
  choices?: string[] | null;
  expected_answer?: string | null;
  guidance?: {
    hints?: Hint[];
    correct_feedback?: string;
    incorrect_feedback?: string;
  };
}

interface TrainingItem {
  id: string;
  source_label?: string;
  context?: string;
  documents?: TrainingDocument[];
  questions?: Question[];
  difficulty?: string;
  source_year?: number;
  exam_style?: string;
  status?: string;
}

interface TrainingBundle {
  training_items: TrainingItem[];
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDocument(doc: TrainingDocument, docIdx: number, exIdx: number): string {
  const parts: string[] = [];

  if (doc.label) {
    parts.push(`<p class="doc-label">${esc(doc.label)}</p>`);
  }

  if (doc.type === "image" && (doc.public_url || doc.local_path)) {
    const src = doc.public_url ?? doc.local_path ?? "";
    parts.push(`<img src="${esc(src)}" alt="${esc(doc.alt ?? doc.label ?? "Document")}" class="doc-img">`);
  }

  if (doc.type === "table" && doc.table) {
    const { headers, rows, caption } = doc.table;
    const thead = `<thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    const cap = caption ? `<caption>${esc(caption)}</caption>` : "";
    parts.push(`<div class="table-wrap"><table>${cap}${thead}${tbody}</table></div>`);
  }

  if (doc.content && doc.type === "text") {
    parts.push(`<p class="doc-content">${esc(doc.content)}</p>`);
  }

  if (doc.fallback) {
    return `<details class="fallback-details"><summary>Source visuelle</summary>${parts.join("")}</details>`;
  }

  return parts.join("");
}

function renderQuestion(q: Question, qIdx: number, exIdx: number): string {
  const hints = q.guidance?.hints ?? [];
  const answer = q.expected_answer ?? "";
  const hintsHtml = hints.length > 0
    ? `<div class="hints-box" style="display:none">${hints.map((h) => `<div class="hint"><b>Indice ${h.level} :</b> ${esc(h.text)}</div>`).join("")}</div>`
    : "";
  const answerHtml = answer
    ? `<div class="answer-box" style="display:none">${esc(answer)}</div>`
    : "";
  const hintBtn = hints.length > 0
    ? `<button class="btn-hint" onclick="toggleHint(this)">💡 Indice</button>`
    : "";
  const checkBtn = answer
    ? `<button class="btn-check" onclick="toggleAnswer(this)">✓ Vérifier</button>`
    : "";

  const labelHtml = q.label ? `<span class="q-label">${esc(q.label)}</span> ` : "";

  let inputHtml: string;
  if (q.choices && q.choices.length > 0) {
    const letters = ["A", "B", "C", "D", "E"];
    const opts = q.choices.map((c, i) =>
      `<label class="choice-label"><input type="radio" name="ex${exIdx}q${qIdx}" value="${esc(c)}"><span class="choice-letter">${letters[i] ?? String(i + 1)}.</span> ${esc(c)}</label>`
    ).join("");
    inputHtml = `<div class="choices">${opts}</div>`;
  } else {
    inputHtml = `<textarea placeholder="Votre réponse…" rows="3"></textarea>`;
  }

  return `
<div class="question" id="ex${exIdx}q${qIdx}">
  <p class="q-prompt">${labelHtml}${esc(q.prompt)}</p>
  ${inputHtml}
  <div class="q-actions">${hintBtn}${checkBtn}</div>
  ${hintsHtml}
  ${answerHtml}
</div>`;
}

function renderExercise(items: TrainingItem[], exIdx: number, total: number): string {
  const first = items[0];
  const title = first.source_label ?? `Exercice ${exIdx + 1}`;
  const context = first.context ?? "";

  // Shared docs: documents that are the same on the first item AND every other item
  // (e.g. roulette image applies to all questions in Exercise 1).
  // Per-item docs: when items have *different* documents (e.g. QCM diagrams),
  // render each item's docs just above its question instead of at the exercise level.
  const firstDocIds = (first.documents ?? []).map((d) => (d as Record<string, unknown>).id ?? (d as Record<string, unknown>).label).join("|");
  const allShareSameDocs = items.every((item) => {
    const ids = (item.documents ?? []).map((d) => (d as Record<string, unknown>).id ?? (d as Record<string, unknown>).label).join("|");
    return ids === firstDocIds;
  });

  const sharedDocs = allShareSameDocs ? (first.documents ?? []) : [];
  const visibleDocs = sharedDocs.filter((d) => !d.fallback);
  const fallbackDocs = sharedDocs.filter((d) => d.fallback);

  const contextHtml = context
    ? `<div class="context"><p>${esc(context)}</p></div>`
    : "";

  const docsHtml = (visibleDocs.length > 0 || fallbackDocs.length > 0)
    ? `<div class="docs-zone">${visibleDocs.map((d, i) => renderDocument(d, i, exIdx)).join("")}${fallbackDocs.map((d, i) => renderDocument(d, i, exIdx)).join("")}</div>`
    : "";

  // Render each item's questions, preceding with that item's own docs when docs differ per item
  let qGlobalIdx = 0;
  const questionsHtml = items.flatMap((item) => {
    const itemDocs = allShareSameDocs ? [] : (item.documents ?? []).filter((d) => !d.fallback);
    const itemDocsHtml = itemDocs.length > 0
      ? `<div class="item-docs-zone">${itemDocs.map((d, i) => renderDocument(d, i, exIdx)).join("")}</div>`
      : "";
    return (item.questions ?? []).map((q) => {
      const qi = qGlobalIdx++;
      return (qi > 0 ? `<hr class="q-sep">` : "") + itemDocsHtml + renderQuestion(q, qi, exIdx);
    });
  }).join("");

  const metaBadges = [
    first.source_year ? `<span class="badge">${first.source_year}</span>` : "",
    first.difficulty ? `<span class="badge">${esc(first.difficulty)}</span>` : "",
    first.status ? `<span class="badge badge-status badge-${first.status}">${esc(first.status)}</span>` : "",
  ].filter(Boolean).join(" ");

  return `
<div class="exercise" id="exercise-${exIdx}" style="display:${exIdx === 0 ? "block" : "none"}">
  <div class="ex-header">
    <h2>${esc(title)}</h2>
    <div class="ex-meta">${metaBadges}</div>
  </div>
  ${contextHtml}
  ${docsHtml}
  <div class="questions-zone">${questionsHtml}</div>
</div>`;
}

function buildHtml(groups: TrainingItem[][], title: string): string {
  const exercisesHtml = groups.map((g, i) => renderExercise(g, i, groups.length)).join("\n");
  const total = groups.length;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f0f0f0; color: #111; min-height: 100vh; padding-bottom: 80px; }

  .top-bar { background: white; border-bottom: 1px solid #e0e0e0; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
  .top-bar h1 { font-size: 15px; font-weight: 600; }
  .badge { background: #f0f0f0; border: 1px solid #ddd; border-radius: 12px; padding: 3px 10px; font-size: 11px; color: #555; }
  .badge-draft { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
  .badge-published { background: #f0fdf4; border-color: #86efac; color: #166534; }

  .content { max-width: 680px; margin: 0 auto; padding: 16px; }

  .exercise { background: white; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; }

  .ex-header { padding: 16px 20px 12px; border-bottom: 1px solid #e8e8e8; }
  .ex-header h2 { font-size: 16px; font-weight: 700; line-height: 1.4; }
  .ex-meta { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }

  .context { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; }
  .context p { font-size: 14px; line-height: 1.6; color: #444; white-space: pre-wrap; }

  .docs-zone { border-top: 1px solid #e8e8e8; border-bottom: 1px solid #e8e8e8; }
  .doc-label { padding: 8px 16px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
  .doc-content { padding: 8px 16px 12px; font-size: 14px; line-height: 1.6; color: #444; white-space: pre-wrap; }
  .doc-img { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  .table-wrap { overflow-x: auto; padding: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  caption { padding: 8px 12px; text-align: left; font-size: 13px; font-weight: 600; }
  th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
  td { padding: 7px 12px; border-bottom: 1px solid #efefef; }
  tr:last-child td { border-bottom: none; }
  .fallback-details { border-top: 1px dashed #ddd; padding: 8px 16px; }
  .fallback-details summary { cursor: pointer; font-size: 13px; color: #666; }

  .questions-zone { padding: 16px 20px 20px; }
  .q-sep { border: none; border-top: 1px dashed #ddd; margin: 16px 0; }
  .q-prompt { font-size: 14px; font-weight: 500; line-height: 1.5; margin-bottom: 10px; }
  .q-label { color: #888; margin-right: 6px; }
  textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-size: 14px; font-family: inherit; resize: vertical; outline: none; transition: border-color .2s; }
  textarea:focus { border-color: #4C97FF; }
  .choices { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
  .choice-label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
  .choice-letter { font-weight: 700; min-width: 1.6em; color: #555; }
  .item-docs-zone { margin: 10px 0 6px; }
  .q-actions { display: flex; gap: 8px; margin-top: 8px; }
  .btn-hint, .btn-check { border: 1px solid #ddd; background: white; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; font-family: inherit; transition: background .15s; }
  .btn-hint:hover { background: #fffbe6; border-color: #f0c040; }
  .btn-check:hover { background: #f0f8ff; border-color: #4C97FF; }
  .hints-box { margin-top: 10px; background: #fffbe6; border: 1px solid #f0c040; border-radius: 8px; padding: 10px 14px; }
  .hint { font-size: 13px; line-height: 1.5; margin-bottom: 4px; }
  .hint:last-child { margin-bottom: 0; }
  .answer-box { margin-top: 10px; background: #f0f8ef; border: 1px solid #6cc070; border-radius: 8px; padding: 10px 14px; font-size: 13px; line-height: 1.6; }

  .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e0e0e0; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
  .nav-btn { border: 1px solid #ddd; background: white; border-radius: 8px; padding: 9px 18px; font-size: 14px; cursor: pointer; font-family: inherit; }
  .nav-btn:disabled { opacity: 0.35; cursor: default; }
  .nav-btn:not(:disabled):hover { background: #f5f5f5; }
  .nav-counter { font-size: 14px; font-weight: 600; color: #555; }

  @media (max-width: 480px) {
    .content { padding: 10px; }
    .ex-header { padding: 14px 16px 10px; }
    .context { padding: 12px 16px; }
    .questions-zone { padding: 14px 16px 18px; }
  }
</style>
</head>
<body>

<div class="top-bar">
  <h1>${esc(title)}</h1>
  <span class="badge">${total} exercices</span>
</div>

<div class="content">
${exercisesHtml}
</div>

<div class="bottom-nav">
  <button class="nav-btn" id="btn-prev" onclick="navigate(-1)" disabled>← Précédent</button>
  <span class="nav-counter" id="nav-counter">1 / ${total}</span>
  <button class="nav-btn" id="btn-next" onclick="navigate(1)"${total <= 1 ? " disabled" : ""}>Suivant →</button>
</div>

<script>
let current = 0;
const total = ${total};

function navigate(dir) {
  const next = current + dir;
  if (next < 0 || next >= total) return;
  document.getElementById('exercise-' + current).style.display = 'none';
  current = next;
  document.getElementById('exercise-' + current).style.display = 'block';
  document.getElementById('nav-counter').textContent = (current + 1) + ' / ' + total;
  document.getElementById('btn-prev').disabled = current === 0;
  document.getElementById('btn-next').disabled = current === total - 1;
  window.scrollTo(0, 0);
}

function toggleHint(btn) {
  const box = btn.closest('.question').querySelector('.hints-box');
  if (!box) return;
  const shown = box.style.display !== 'none';
  box.style.display = shown ? 'none' : 'block';
  btn.textContent = shown ? '💡 Indice' : '💡 Cacher';
}

function toggleAnswer(btn) {
  const box = btn.closest('.question').querySelector('.answer-box');
  if (!box) return;
  const shown = box.style.display !== 'none';
  box.style.display = shown ? 'none' : 'block';
  btn.textContent = shown ? '✓ Vérifier' : '✓ Cacher';
}
</script>
</body>
</html>`;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

interface CliOptions {
  bundle: string;
  out: string;
  title?: string;
}

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = {
    bundle: "",
    out: "public/preview.html",
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--bundle" && args[i + 1]) { opts.bundle = args[++i]; }
    else if (args[i] === "--out" && args[i + 1]) { opts.out = args[++i]; }
    else if (args[i] === "--title" && args[i + 1]) { opts.title = args[++i]; }
  }
  if (!opts.bundle) throw new Error("--bundle <path> is required");
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const raw = await readFile(opts.bundle, "utf8");
  const bundle: TrainingBundle = JSON.parse(raw);
  const items = bundle.training_items;

  if (!items || items.length === 0) {
    throw new Error("No training_items found in bundle");
  }

  // Group by source_label
  const groupMap = new Map<string, TrainingItem[]>();
  for (const item of items) {
    const key = item.source_label ?? item.id;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(item);
  }
  const groups = [...groupMap.values()];

  // Derive title from bundle filename or first item
  const title = opts.title ?? (() => {
    const first = groups[0]?.[0];
    const year = first?.source_year ?? "";
    const exam = first?.exam_style ?? "DNB";
    return `${exam} ${year} — Aperçu`.trim();
  })();

  const html = buildHtml(groups, title);
  await mkdir(dirname(opts.out), { recursive: true });
  await writeFile(opts.out, html, "utf8");
  console.log(`Wrote ${opts.out} — ${groups.length} exercises, ${items.length} items`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
