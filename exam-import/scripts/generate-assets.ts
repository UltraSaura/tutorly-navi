/**
 * generate-assets — Asset pipeline utility
 *
 * This script handles all FILE I/O for the asset generation pipeline:
 *   • Rendering PDF page regions to PNG (pdftoppm)
 *   • Converting SVG → PNG for QA comparison (resvg-js)
 *   • Saving generated SVG/HTML content to disk
 *   • Updating the training-items bundle JSON with results
 *   • Uploading crop fallbacks to Supabase Storage
 *
 * THE INTELLIGENCE (SVG generation, visual QA) runs in Claude Code
 * as subagents spawned by the orchestrating session — not here.
 *
 * Commands:
 *   --render-crop   --pdf <path> --page <n> --bbox "x,y,mx,my" --out <path>
 *   --render-svg    --svg <path> --out <path>
 *   --save-asset    --id <id> --type svg|html --content-file <path> --bundle <path>
 *   --crop-fallback --pdf <path> --page <n> --bbox "x,y,mx,my" --id <id> \
 *                   --bundle <path> --assets-root <path>
 *   --list-assets   --crop-config <path>
 */

import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { Resvg } from "@resvg/resvg-js";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);

// ─── Strategy map: which assets get SVG/HTML vs immediate crop ────────────────

export const ASSET_STRATEGIES: Record<string, "svg" | "html" | "crop"> = {
  "ex1-globe":          "crop",   // photograph
  "ex1-mappemonde":     "crop",   // world map photo
  "ex1-cylindre":       "svg",    // geometric 3-D sketch
  "ex2-lyon-stats":     "html",   // stats table rendered as image
  "ex2-grenoble-table": "html",   // PM10 data table
  "ex4-geometrie":      "svg",    // triangles ABCDEF geometry
  "ex5-programme":      "svg",    // calculation flowchart
  "ex6-scratch":        "svg",    // Scratch block diagram
  "ex6-figure":         "svg",    // geometric output (squares + triangles)
  "ex7-handspinner":    "crop",   // photograph
  "ex7-graphique":      "svg",    // speed/time line chart
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function loadEnv(): Promise<void> {
  try {
    const raw = await readFile(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch { /* no .env */ }
}

async function readPngDimensions(path: string): Promise<{ width: number; height: number } | null> {
  try {
    const buf = Buffer.alloc(24);
    const fh = await import("node:fs/promises").then((m) => m.open(path, "r"));
    await fh.read(buf, 0, 24, 0);
    await fh.close();
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    return null;
  } catch { return null; }
}

function safeSegment(v: string): string {
  return v.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ─── Command: --render-crop ───────────────────────────────────────────────────
// Renders a specific bounding-box region of a PDF page to PNG at 300 DPI.

async function cmdRenderCrop(opts: Record<string, string>): Promise<void> {
  const { pdf, page, bbox, out } = opts;
  if (!pdf || !page || !bbox || !out) throw new Error("--render-crop requires --pdf --page --bbox --out");

  const [pctX, pctY, pctMaxX, pctMaxY] = bbox.split(",").map(Number);
  const pageNum = parseInt(page, 10);
  const DPI = "300";

  const workDir = await mkdtemp(join(tmpdir(), "render-crop-"));
  try {
    // Full-page render to get pixel dimensions
    const fullPrefix = join(workDir, "page");
    await execFileAsync("pdftoppm", ["-png", "-r", DPI, "-f", String(pageNum), "-l", String(pageNum), pdf, fullPrefix], { timeout: 30_000 });
    const fullPath = join(workDir, `page-${pageNum}.png`);
    const dims = await readPngDimensions(fullPath);
    if (!dims) throw new Error("Could not read PNG dimensions");

    const x = Math.round(pctX * dims.width);
    const y = Math.round(pctY * dims.height);
    const w = Math.round((pctMaxX - pctX) * dims.width);
    const h = Math.round((pctMaxY - pctY) * dims.height);

    // Crop render
    const cropPrefix = join(workDir, "crop");
    await execFileAsync("pdftoppm", [
      "-png", "-r", DPI,
      "-f", String(pageNum), "-l", String(pageNum),
      "-x", String(x), "-y", String(y), "-W", String(w), "-H", String(h),
      pdf, cropPrefix,
    ], { timeout: 30_000 });

    const cropPath = join(workDir, `crop-${pageNum}.png`);
    await mkdir(join(out, ".."), { recursive: true }).catch(() => {});
    await copyFile(cropPath, out);
    console.log(JSON.stringify({ success: true, out, width: w, height: h }));
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}

// ─── Command: --render-svg ────────────────────────────────────────────────────
// Renders an SVG file to PNG using resvg-js (no browser needed).

async function cmdRenderSvg(opts: Record<string, string>): Promise<void> {
  const { svg, out } = opts;
  if (!svg || !out) throw new Error("--render-svg requires --svg --out");

  const svgContent = await readFile(svg, "utf8");
  const resvg = new Resvg(svgContent, { background: "white", fitTo: { mode: "width", value: 800 } });
  const png = Buffer.from(resvg.render().asPng());
  await mkdir(join(out, ".."), { recursive: true }).catch(() => {});
  await writeFile(out, png);
  console.log(JSON.stringify({ success: true, out, bytes: png.length }));
}

// ─── Command: --save-asset ────────────────────────────────────────────────────
// Writes the generated SVG/HTML content into the bundle JSON documents array.

async function cmdSaveAsset(opts: Record<string, string>): Promise<void> {
  const { id, type, contentFile, bundle, label, alt } = opts;
  if (!id || !type || !contentFile || !bundle) {
    throw new Error("--save-asset requires --id --type --content-file --bundle");
  }

  const content = await readFile(contentFile, "utf8");
  const raw = await readFile(bundle, "utf8");
  const b = JSON.parse(raw) as Record<string, unknown>;
  const items = Array.isArray(b.training_items) ? b.training_items : [];

  let updated = 0;
  for (const item of items) {
    if (!isRecord(item)) continue;
    const docs: unknown[] = Array.isArray(item.documents) ? item.documents as unknown[] : [];
    const idx = docs.findIndex((d) => isRecord(d) && d.id === id);

    const newDoc: Record<string, unknown> =
      type === "svg"
        ? { id, type: "svg", label: label ?? id, alt: alt ?? "", svg_content: content }
        : { id, type: "table", label: label ?? id, alt: alt ?? "", html_content: content, render_mode: "html_first" };

    if (idx >= 0) {
      docs[idx] = newDoc;
    } else {
      docs.push(newDoc);
    }
    item.documents = docs;
    updated++;
  }

  await writeFile(bundle, JSON.stringify(b, null, 2), "utf8");
  console.log(JSON.stringify({ success: true, asset_id: id, type, items_updated: updated }));
}

// ─── Command: --crop-fallback ─────────────────────────────────────────────────
// Crops a PDF region to WebP and uploads to Supabase Storage.
// Updates the bundle JSON with the public_url.

async function cmdCropFallback(opts: Record<string, string>): Promise<void> {
  await loadEnv();
  const { pdf, page, bbox, id, bundle, assetsRoot } = opts;
  if (!pdf || !page || !bbox || !id || !bundle || !assetsRoot) {
    throw new Error("--crop-fallback requires --pdf --page --bbox --id --bundle --assets-root");
  }

  const [pctX, pctY, pctMaxX, pctMaxY] = bbox.split(",").map(Number);
  const pageNum = parseInt(page, 10);
  const DPI = "300";

  // Get paper id from bundle
  const raw = await readFile(bundle, "utf8");
  const b = JSON.parse(raw) as Record<string, unknown>;
  const items = Array.isArray(b.training_items) ? b.training_items : [];
  const firstItem = items.find(isRecord);
  const safePaperId = safeSegment(String(isRecord(firstItem) ? firstItem.paper_id ?? "paper" : "paper"));

  const workDir = await mkdtemp(join(tmpdir(), "crop-fallback-"));
  try {
    // Render full page for dimension calculation
    const fullPrefix = join(workDir, "page");
    await execFileAsync("pdftoppm", ["-png", "-r", DPI, "-f", String(pageNum), "-l", String(pageNum), pdf, fullPrefix], { timeout: 30_000 });
    const dims = await readPngDimensions(join(workDir, `page-${pageNum}.png`));
    if (!dims) throw new Error("Could not read PNG dimensions");

    const x = Math.round(pctX * dims.width);
    const y = Math.round(pctY * dims.height);
    const w = Math.round((pctMaxX - pctX) * dims.width);
    const h = Math.round((pctMaxY - pctY) * dims.height);

    // Crop render
    const cropPrefix = join(workDir, "crop");
    await execFileAsync("pdftoppm", [
      "-png", "-r", DPI,
      "-f", String(pageNum), "-l", String(pageNum),
      "-x", String(x), "-y", String(y), "-W", String(w), "-H", String(h),
      pdf, cropPrefix,
    ], { timeout: 30_000 });

    const cropPng = join(workDir, `crop-${pageNum}.png`);

    // Convert to WebP
    const webpPath = join(workDir, `${id}.webp`);
    let ext = "webp";
    try {
      await execFileAsync("cwebp", ["-q", "90", cropPng, "-o", webpPath], { timeout: 30_000 });
    } catch {
      ext = "png";
    }

    // Copy to assets dir (grouped by first exercise item id)
    const exItems = items.filter((t): t is Record<string, unknown> => isRecord(t));
    const safeExId = exItems.length > 0 ? safeSegment(String(exItems[0].id ?? "item")) : "item";
    const destDir = join(assetsRoot, safePaperId, safeExId);
    await mkdir(destDir, { recursive: true });
    const destFile = join(destDir, `${id}.${ext}`);
    await copyFile(ext === "webp" ? webpPath : cropPng, destFile);

    const localPath = `${assetsRoot}/${safePaperId}/${safeExId}/${id}.${ext}`;

    // Upload to Supabase if configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
    let publicUrl = "";

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const bytes = await readFile(destFile);
      const mime = ext === "webp" ? "image/webp" : "image/png";

      for (const item of items) {
        if (!isRecord(item)) continue;
        const storagePath = `${safePaperId}/${safeSegment(String(item.id ?? "item"))}/${id}.${ext}`;
        const { error } = await supabase.storage.from("exam-assets").upload(storagePath, bytes, { contentType: mime, upsert: true });
        if (error) { console.warn(`Upload failed: ${error.message}`); continue; }
        publicUrl = supabase.storage.from("exam-assets").getPublicUrl(storagePath).data.publicUrl;
      }
    }

    // Write public_url back to bundle documents
    for (const item of items) {
      if (!isRecord(item)) continue;
      const docs: unknown[] = Array.isArray(item.documents) ? item.documents as unknown[] : [];
      const idx = docs.findIndex((d) => isRecord(d) && d.id === id);
      const doc: Record<string, unknown> = { id, type: "image", local_path: localPath, public_url: publicUrl };
      if (idx >= 0) docs[idx] = { ...(isRecord(docs[idx]) ? docs[idx] : {}), ...doc };
      else docs.push(doc);
      item.documents = docs;
    }
    await writeFile(bundle, JSON.stringify(b, null, 2), "utf8");

    console.log(JSON.stringify({ success: true, id, local_path: localPath, public_url: publicUrl, ext }));
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}

// ─── Command: --list-assets ───────────────────────────────────────────────────
// Lists all assets in the crop config with their assigned strategy.

async function cmdListAssets(opts: Record<string, string>): Promise<void> {
  const { cropConfig } = opts;
  if (!cropConfig) throw new Error("--list-assets requires --crop-config");

  const config = JSON.parse(await readFile(cropConfig, "utf8")) as Record<string, Array<{
    id: string; type: string; label: string; page: number; bbox_percent: number[];
  }>>;

  const assets = Object.entries(config).flatMap(([exKey, items]) =>
    items.map((item) => ({
      exercise: exKey,
      id: item.id,
      type: item.type,
      strategy: ASSET_STRATEGIES[item.id] ?? (item.type === "table" ? "html" : "svg"),
      label: item.label,
      page: item.page,
      bbox: item.bbox_percent.join(","),
    }))
  );

  console.log(JSON.stringify({ assets }, null, 2));
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const opts: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    const k = args[i]; const v = args[i + 1];
    if (k.startsWith("--") && v && !v.startsWith("--")) { opts[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v; i++; }
  }

  if (cmd === "--render-crop")   return cmdRenderCrop(opts);
  if (cmd === "--render-svg")    return cmdRenderSvg(opts);
  if (cmd === "--save-asset")    return cmdSaveAsset(opts);
  if (cmd === "--crop-fallback") return cmdCropFallback(opts);
  if (cmd === "--list-assets")   return cmdListAssets(opts);

  console.log(`\
generate-assets — Asset pipeline utility for Claude Code orchestration

Commands:
  --render-crop   --pdf <p> --page <n> --bbox "x,y,mx,my" --out <path>
  --render-svg    --svg <path> --out <path>
  --save-asset    --id <id> --type svg|html --content-file <path> --bundle <path>
  --crop-fallback --pdf <p> --page <n> --bbox "x,y,mx,my" --id <id> --bundle <b> --assets-root <r>
  --list-assets   --crop-config <path>

This utility is called by Claude Code during asset generation.
To start the pipeline, ask Claude: "run the asset pipeline for DNB 2018"
`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
