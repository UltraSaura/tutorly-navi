import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type ImportMode = "upsert" | "replace";

interface CliOptions {
  bundle: string;
  mode: ImportMode;
  direct: boolean;
}

async function main(): Promise<void> {
  await loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl === undefined || serviceKey === undefined) {
    const missing = [
      supabaseUrl === undefined ? "SUPABASE_URL" : null,
      serviceKey === undefined ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter((name): name is string => name !== null);
    throw new Error(`${missing.join(" and ")} required`);
  }

  const rawBundle = await readFile(options.bundle, "utf8");
  const bundle = JSON.parse(rawBundle) as Record<string, unknown>;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const enrichedBundle = await uploadLocalTrainingAssets(bundle, supabaseAdmin);
  const body = { ...enrichedBundle, mode: options.mode };

  const payload = options.direct
    ? await importDirect(supabaseUrl, serviceKey, body)
    : await importViaFunction(supabaseUrl, serviceKey, body);

  console.log(JSON.stringify(payload, null, 2));

  if (!isRecord(payload) || payload.success !== true) {
    process.exitCode = 1;
  }
}

async function importViaFunction(supabaseUrl: string, serviceKey: string, body: Record<string, unknown>): Promise<unknown> {
  const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/import-training-items`;
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function importDirect(supabaseUrl: string, serviceKey: string, body: Record<string, unknown>): Promise<unknown> {
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const items = Array.isArray(body.training_items) ? body.training_items : [];
  const mode = body.mode === "replace" ? "replace" : "upsert";

  if (mode === "replace" && items.length > 0) {
    const ids = items.map((item) => (isRecord(item) ? item.id : null)).filter((id): id is string => typeof id === "string");
    for (const batch of chunk(ids, 100)) {
      const { error } = await supabaseAdmin.from("exam_training_items").delete().in("id", batch);
      if (error) return { success: false, error: error.message, counts: { training_items: 0 }, diagnostics: [] };
    }
  }

  let count = 0;
  for (const batch of chunk(items, 100)) {
    const { error } = await supabaseAdmin.from("exam_training_items").upsert(batch, { onConflict: "id" });
    if (error) return { success: false, error: error.message, counts: { training_items: count }, diagnostics: [] };
    count += batch.length;
  }

  return { success: true, mode, counts: { training_items: count }, diagnostics: [] };
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text };
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    bundle: "exam-import/bundles/training-items-dnb-2021-maths.json",
    mode: "upsert",
    direct: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--bundle" && value !== undefined) {
      options.bundle = value;
      index += 1;
    } else if (arg === "--mode" && isImportMode(value)) {
      options.mode = value;
      index += 1;
    } else if (arg === "--direct") {
      options.direct = true;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${arg ?? ""}`);
    }
  }

  return options;
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function isImportMode(value: string | undefined): value is ImportMode {
  return value === "upsert" || value === "replace";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadDotEnv(): Promise<void> {
  let contents: string;
  try {
    contents = await readFile(".env", "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function printHelp(): void {
  console.log(`Usage: npm run import:training-items -- [options]

Options:
  --bundle exam-import/bundles/training-items-dnb-2021-maths.json
  --mode upsert|replace
  --direct

Environment:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

async function uploadLocalTrainingAssets(bundle: Record<string, unknown>, supabaseAdmin: ReturnType<typeof createClient>): Promise<Record<string, unknown>> {
  const items = Array.isArray(bundle.training_items) ? bundle.training_items : [];
  const EXAM_ASSETS_BUCKET = "exam-assets";
  let bucketReady = false;

  for (const item of items) {
    if (!isRecord(item) || !Array.isArray(item.documents)) continue;
    for (const document of item.documents) {
      if (!isRecord(document) || typeof document.local_path !== "string") continue;
      const isImageOrImageTable = document.type === "image" || (document.type === "table" && document.render_mode === "image_first");
      if (!isImageOrImageTable) continue;

      if (!bucketReady) {
        await ensureAssetsBucket(supabaseAdmin, EXAM_ASSETS_BUCKET);
        bucketReady = true;
      }

      const storage_path = [
        safePathSegment(String(item.paper_id ?? "paper")),
        safePathSegment(String(item.id ?? "item")),
        basename(document.local_path),
      ].join("/");

      const bytes = await readFile(document.local_path);
      const { error } = await supabaseAdmin.storage
        .from(EXAM_ASSETS_BUCKET)
        .upload(storage_path, bytes, { contentType: "image/png", upsert: true });
      if (error) throw new Error(`Unable to upload training asset ${document.local_path}: ${error.message}`);

      const publicUrl = supabaseAdmin.storage.from(EXAM_ASSETS_BUCKET).getPublicUrl(storage_path).data.publicUrl;
      document.storage_path = storage_path;
      document.public_url = publicUrl;
    }
  }

  return bundle;
}

async function ensureAssetsBucket(supabaseAdmin: ReturnType<typeof createClient>, bucketName: string): Promise<void> {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(`Unable to list storage buckets: ${listError.message}`);
  if ((buckets ?? []).some((bucket) => bucket.name === bucketName)) return;
  const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error) throw new Error(`Unable to create ${bucketName} bucket: ${error.message}`);
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

import { basename } from "node:path";

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
