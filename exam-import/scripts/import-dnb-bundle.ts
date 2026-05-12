import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

type ImportMode = "upsert" | "replace";
const EXAM_ASSETS_BUCKET = "exam-assets";

interface CliOptions {
  bundle: string;
  mode: ImportMode;
}

async function main(): Promise<void> {
  await loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl === undefined || serviceKey === undefined) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const rawBundle = await readFile(options.bundle, "utf8");
  const bundle: unknown = JSON.parse(rawBundle);
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const enrichedBundle = isRecord(bundle) ? await uploadLocalExamAssets(bundle, supabaseAdmin) : {};
  const body = JSON.stringify({ ...enrichedBundle, mode: options.mode });
  const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/import-exam-bundle`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body,
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { success: false, error: text };
  }

  console.log(JSON.stringify(payload, null, 2));

  if (!isRecord(payload) || payload.success !== true) {
    process.exitCode = 1;
  }
}

async function uploadLocalExamAssets(bundle: Record<string, unknown>, supabaseAdmin: ReturnType<typeof createClient>): Promise<Record<string, unknown>> {
  const exercises = Array.isArray(bundle.exercises) ? bundle.exercises : [];
  const exam_assets: Array<Record<string, unknown>> = [];
  let bucketReady = false;

  for (const exercise of exercises) {
    if (!isRecord(exercise) || !isRecord(exercise.parsed_content)) continue;
    const documents = Array.isArray(exercise.parsed_content.documents) ? exercise.parsed_content.documents : [];
    for (const [index, document] of documents.entries()) {
      const isImageOrImageTable = document.type === "image" || (document.type === "table" && document.render_mode === "image_first");
      if (!isRecord(document) || !isImageOrImageTable || typeof document.local_path !== "string") continue;
      if (!bucketReady) {
        await ensureAssetsBucket(supabaseAdmin);
        bucketReady = true;
      }
      const storage_path = [
        safePathSegment(String(exercise.paper_id ?? "paper")),
        safePathSegment(String(exercise.id ?? "exercise")),
        basename(document.local_path),
      ].join("/");
      const bytes = await readFile(document.local_path);
      const { error } = await supabaseAdmin.storage
        .from(EXAM_ASSETS_BUCKET)
        .upload(storage_path, bytes, { contentType: "image/png", upsert: true });
      if (error) throw new Error(`Unable to upload exam asset ${document.local_path}: ${error.message}`);

      const publicUrl = supabaseAdmin.storage.from(EXAM_ASSETS_BUCKET).getPublicUrl(storage_path).data.publicUrl;
      document.storage_path = storage_path;
      document.public_url = publicUrl;

      exam_assets.push({
        exercise_id: exercise.id,
        paper_id: exercise.paper_id,
        type: document.type,
        label: document.label ?? `Document ${index + 1}`,
        storage_path,
        public_url: publicUrl,
        alt: document.alt ?? null,
        page_number: typeof document.page_number === "number" ? document.page_number : null,
        sort_order: typeof document.sort_order === "number" ? document.sort_order : index,
      });
    }
  }

  return { ...bundle, exam_assets };
}

async function ensureAssetsBucket(supabaseAdmin: ReturnType<typeof createClient>): Promise<void> {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(`Unable to list storage buckets: ${listError.message}`);
  if ((buckets ?? []).some((bucket) => bucket.name === EXAM_ASSETS_BUCKET)) return;
  const { error } = await supabaseAdmin.storage.createBucket(EXAM_ASSETS_BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error) throw new Error(`Unable to create ${EXAM_ASSETS_BUCKET} bucket: ${error.message}`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    bundle: "exam-import/bundles/dnb-maths.json",
    mode: "upsert",
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
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${arg ?? ""}`);
    }
  }

  return options;
}

function isImportMode(value: string | undefined): value is ImportMode {
  return value === "upsert" || value === "replace";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function printHelp(): void {
  console.log(`Usage: npm run import:dnb-annales -- [options]

Options:
  --bundle exam-import/bundles/test-dnb-2021.json
  --mode upsert|replace

Environment:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
