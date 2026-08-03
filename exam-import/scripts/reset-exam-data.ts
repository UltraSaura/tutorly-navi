import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const EXAM_ASSETS_BUCKET = "exam-assets";
const STORAGE_PAGE_SIZE = 100;

async function main(): Promise<void> {
  await loadDotEnv();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("DRY RUN — no changes will be made.\n");
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── 1. Count rows before deletion ───────────────────────────────────────────
  const tables = [
    "training_item_answers",
    "exam_exercise_answers",
    "exam_question_corrections",
    "exam_training_items",
    "exam_assets",
    "exam_attempts",
    "exam_exercise_program_links",
    "exam_exercises",
    "exam_papers",
    "exam_sources",
  ] as const;

  console.log("Current row counts:");
  for (const table of tables) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    console.log(`  ${table}: ${count ?? "?"}`);
  }

  // ── 2. Count storage objects ─────────────────────────────────────────────────
  const storageFiles = await listAllStorageFiles(supabase);
  console.log(`  ${EXAM_ASSETS_BUCKET} (storage): ${storageFiles.length} file(s)\n`);

  if (dryRun) {
    console.log("Nothing deleted (--dry-run). Re-run without --dry-run to proceed.");
    return;
  }

  // ── 3. Confirm ───────────────────────────────────────────────────────────────
  if (!process.argv.includes("--yes")) {
    console.log(
      "This will permanently delete ALL exam data (papers, exercises, training items, answers, corrections, storage assets).\n" +
      "Re-run with --yes to confirm, or add --dry-run to preview only.\n",
    );
    process.exitCode = 1;
    return;
  }

  // ── 4. Delete rows (order matters — FK constraints) ──────────────────────────
  for (const table of tables) {
    process.stdout.write(`Deleting ${table}…`);
    const { error } = await supabase.from(table).delete().gte("created_at", "2000-01-01");
    if (error) {
      if (error.message.includes("does not exist") || error.code === "42P01") {
        console.log(" (table not found, skipping)");
      } else {
        throw new Error(`Failed to delete ${table}: ${error.message}`);
      }
    } else {
      console.log(" done.");
    }
  }

  // ── 5. Delete storage files ──────────────────────────────────────────────────
  if (storageFiles.length > 0) {
    process.stdout.write(`Deleting ${storageFiles.length} storage file(s) from ${EXAM_ASSETS_BUCKET}…`);
    for (let i = 0; i < storageFiles.length; i += STORAGE_PAGE_SIZE) {
      const batch = storageFiles.slice(i, i + STORAGE_PAGE_SIZE).map((f) => f.name);
      const { error } = await supabase.storage.from(EXAM_ASSETS_BUCKET).remove(batch);
      if (error) throw new Error(`Storage deletion failed: ${error.message}`);
    }
    console.log(" done.");
  } else {
    console.log("Storage bucket already empty.");
  }

  console.log("\nAll exam data cleared. Ready for a fresh import.");
  console.log("\nNext steps:");
  console.log("  1. npm run build:dnb-annales -- --source amiens --year 2021 --with-assets --out exam-import/bundles/dnb-2021.json");
  console.log("  2. npm run import:dnb-annales -- --bundle exam-import/bundles/dnb-2021.json --mode replace");
  console.log("  3. npm run generate:training-items -- --bundle exam-import/bundles/dnb-2021.json --out exam-import/bundles/dnb-2021-training.json");
  console.log("  4. npm run import:training-items -- --bundle exam-import/bundles/dnb-2021-training.json --mode replace");
}

async function listAllStorageFiles(
  supabase: ReturnType<typeof createClient>,
): Promise<Array<{ name: string }>> {
  const all: Array<{ name: string }> = [];
  // Storage list only goes one level deep — list root folders first, then recurse
  const { data: rootItems, error: rootError } = await supabase.storage
    .from(EXAM_ASSETS_BUCKET)
    .list("", { limit: STORAGE_PAGE_SIZE });

  if (rootError || !rootItems) return all;

  for (const item of rootItems) {
    if (item.id === null) {
      // Folder — list contents
      const { data: children } = await supabase.storage
        .from(EXAM_ASSETS_BUCKET)
        .list(item.name, { limit: 1000 });
      for (const child of children ?? []) {
        if (child.id === null) {
          // Nested folder — go one level deeper
          const { data: grandchildren } = await supabase.storage
            .from(EXAM_ASSETS_BUCKET)
            .list(`${item.name}/${child.name}`, { limit: 1000 });
          for (const gc of grandchildren ?? []) {
            all.push({ name: `${item.name}/${child.name}/${gc.name}` });
          }
        } else {
          all.push({ name: `${item.name}/${child.name}` });
        }
      }
    } else {
      all.push({ name: item.name });
    }
  }

  return all;
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
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
