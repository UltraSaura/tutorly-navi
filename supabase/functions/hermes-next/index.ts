/**
 * hermes-next — Curriculum ingestion orchestrator (single-step)
 *
 * Finds the oldest pending curriculum edition (ingested_at IS NULL, source_pdf_url NOT NULL)
 * that isn't already tracked as running in hermes_jobs, then delegates to
 * ingest-curriculum-edition and records the result.
 *
 * Call this endpoint repeatedly (cron, CI, admin button) to drain the queue.
 * Returns { done: true } when no pending editions remain.
 *
 * POST /functions/v1/hermes-next
 * Authorization: Bearer <service_role_key>
 *
 * Optional body: { edition_id: "<uuid>" }  — process a specific edition instead of auto-picking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Only service role can trigger Hermes
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return json({ error: "Forbidden: service role key required" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const body = await req.json().catch(() => ({}));
    let editionId: string | null = body?.edition_id ?? null;

    if (!editionId) {
      // Auto-pick: find the oldest uningested edition not already running
      const { data: pending, error: pendingErr } = await admin
        .from("curriculum_edition")
        .select("id, subject, cycle, bo_reference")
        .is("ingested_at", null)
        .not("source_pdf_url", "is", null)
        .not(
          "id",
          "in",
          // exclude editions that already have a running job
          `(SELECT edition_id FROM hermes_jobs WHERE status IN ('pending','running'))`,
        )
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (pendingErr) return json({ error: pendingErr.message }, 500);
      if (!pending) return json({ done: true, message: "No pending editions to ingest." });

      editionId = pending.id as string;
      console.log(`[hermes] Auto-selected edition: ${pending.subject} ${pending.cycle} (${editionId})`);
    }

    // Create a job record
    const { data: job, error: jobErr } = await admin
      .from("hermes_jobs")
      .insert({ edition_id: editionId, status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();

    if (jobErr) {
      // Unique index violation = already running
      if (jobErr.code === "23505") {
        return json({ error: "Edition is already being ingested", edition_id: editionId }, 409);
      }
      return json({ error: jobErr.message }, 500);
    }

    const jobId = job.id as string;
    console.log(`[hermes] Job ${jobId} started for edition ${editionId}`);

    // Call the ingest function
    const ingestUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ingest-curriculum-edition`;
    const ingestRes = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ edition_id: editionId }),
    });

    const ingestBody = await ingestRes.json().catch(() => ({ error: "Non-JSON response" }));

    if (!ingestRes.ok || ingestBody.error) {
      const errMsg = ingestBody.error ?? `HTTP ${ingestRes.status}`;
      await admin
        .from("hermes_jobs")
        .update({ status: "failed", finished_at: new Date().toISOString(), error: errMsg })
        .eq("id", jobId);
      console.error(`[hermes] Job ${jobId} FAILED: ${errMsg}`);
      return json({ success: false, job_id: jobId, edition_id: editionId, error: errMsg }, 500);
    }

    // Success
    await admin
      .from("hermes_jobs")
      .update({
        status: "done",
        finished_at: new Date().toISOString(),
        stats: ingestBody.stats ?? null,
      })
      .eq("id", jobId);

    console.log(`[hermes] Job ${jobId} DONE`, ingestBody.stats);

    // Count remaining
    const { count } = await admin
      .from("curriculum_edition")
      .select("id", { count: "exact", head: true })
      .is("ingested_at", null)
      .not("source_pdf_url", "is", null);

    return json({
      success: true,
      job_id: jobId,
      edition_id: editionId,
      stats: ingestBody.stats,
      remaining: count ?? 0,
    });
  } catch (err) {
    console.error("[hermes] Unexpected error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
