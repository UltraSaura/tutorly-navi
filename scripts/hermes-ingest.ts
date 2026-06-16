#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Hermes Curriculum Ingestion Runner
 *
 * Drains the curriculum ingestion queue by calling hermes-next repeatedly
 * until no pending editions remain, or a fatal error is hit.
 *
 * Usage:
 *   deno run --allow-net --allow-env --allow-read scripts/hermes-ingest.ts
 *
 * Environment variables (or .env file):
 *   SUPABASE_URL          e.g. https://sibprjxhbxahouejygeu.supabase.co
 *   SUPABASE_SERVICE_KEY  service role key (secret)
 *
 * Optional flags:
 *   --edition <uuid>   process a single specific edition then exit
 *   --dry-run          list pending editions without processing
 */

import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

const env = await load({ envPath: ".env", allowEmptyValues: true }).catch(() => ({}));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? env["SUPABASE_URL"] ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY") ?? env["SUPABASE_SERVICE_KEY"] ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.");
  Deno.exit(1);
}

const args = Deno.args;
const specificEdition = args.includes("--edition") ? args[args.indexOf("--edition") + 1] : null;
const dryRun = args.includes("--dry-run");
const HERMES_URL = `${SUPABASE_URL}/functions/v1/hermes-next`;
const INGEST_URL = `${SUPABASE_URL}/functions/v1/ingest-curriculum-edition`;

function fmt(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

async function listPending(): Promise<Array<{ id: string; subject: string; cycle: string; bo_reference: string }>> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/curriculum_edition?select=id,subject,cycle,bo_reference&ingested_at=is.null&source_pdf_url=not.is.null&order=created_at.asc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!res.ok) throw new Error(`Failed to list editions: ${res.status}`);
  return res.json();
}

async function callHermes(editionId?: string): Promise<{
  done?: boolean;
  success?: boolean;
  error?: string;
  job_id?: string;
  edition_id?: string;
  stats?: Record<string, number>;
  remaining?: number;
  message?: string;
}> {
  const body = editionId ? { edition_id: editionId } : {};
  const res = await fetch(HERMES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Dry run ───────────────────────────────────────────────────────────────────
if (dryRun) {
  console.log("=== DRY RUN — Pending editions ===");
  const pending = await listPending();
  if (pending.length === 0) {
    console.log("  (no pending editions)");
  } else {
    for (const e of pending) {
      console.log(`  • [${e.id}] ${e.subject} / ${e.cycle} — ${e.bo_reference}`);
    }
    console.log(`\nTotal: ${pending.length} edition(s) to ingest.`);
  }
  Deno.exit(0);
}

// ── Single edition mode ───────────────────────────────────────────────────────
if (specificEdition) {
  console.log(`\n[${fmt(new Date())}] Processing edition ${specificEdition}...`);
  const result = await callHermes(specificEdition);
  if (result.success) {
    const s = result.stats ?? {};
    console.log(`  ✓ Done — ${s.domains ?? 0} domains, ${s.subdomains ?? 0} subdomains, ${s.objectives ?? 0} objectives, ${s.success_criteria ?? 0} criteria`);
  } else {
    console.error(`  ✗ Failed: ${result.error}`);
    Deno.exit(1);
  }
  Deno.exit(0);
}

// ── Full queue drain ──────────────────────────────────────────────────────────
console.log("=== Hermes Curriculum Ingestion ===");
const pending = await listPending();
console.log(`Found ${pending.length} pending edition(s).\n`);

if (pending.length === 0) {
  console.log("Nothing to do.");
  Deno.exit(0);
}

let processed = 0;
let failed = 0;

while (true) {
  const ts = fmt(new Date());
  console.log(`[${ts}] Calling hermes-next...`);

  const result = await callHermes();

  if (result.done) {
    console.log(`\n[${fmt(new Date())}] Queue empty — all done.`);
    break;
  }

  if (result.success) {
    const s = result.stats ?? {};
    console.log(
      `  ✓ Edition ${result.edition_id} ingested` +
        ` — ${s.domains ?? 0}D / ${s.subdomains ?? 0}S / ${s.objectives ?? 0}O / ${s.success_criteria ?? 0}criteria` +
        ` (${result.remaining ?? "?"} remaining)`,
    );
    processed++;
  } else {
    console.error(`  ✗ Edition ${result.edition_id ?? "?"} FAILED: ${result.error}`);
    failed++;
    // Continue to next edition rather than aborting the whole run
  }

  // Brief pause between editions to avoid hammering APIs
  await new Promise((r) => setTimeout(r, 3000));
}

console.log(`\n=== Summary ===`);
console.log(`  Processed: ${processed}`);
console.log(`  Failed:    ${failed}`);
if (failed > 0) Deno.exit(1);
