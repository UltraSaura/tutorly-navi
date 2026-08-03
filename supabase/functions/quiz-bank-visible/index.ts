import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  parseJsonBody,
} from "../_shared/security.ts";

type VisibleBanksBody = {
  topicId?: unknown;
  completedVideoIds?: unknown;
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const auth = await authenticateRequest(req);
    if (auth.response || !auth.context) {
      return auth.response!;
    }

    const { adminClient } = auth.context;

    const bodyResult = await parseJsonBody<VisibleBanksBody>(req, 25_000);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const { topicId, completedVideoIds } = bodyResult.data;

    if (typeof topicId !== "string" || topicId.trim().length === 0) {
      return jsonResponse(req, { error: "Topic ID required" }, 400);
    }

    let query = adminClient
      .from('quiz_bank_assignments')
      .select('*')
      .eq('is_active', true);

    // Filter by topic_id or video_ids
    query = query.or(`topic_id.eq.${topicId},video_ids.not.is.null`);

    const { data: assigns, error } = await query;

    if (error) {
      console.error('[quiz-bank-visible] query failed', { message: error.message });
      return jsonResponse(req, { error: 'Unable to load quiz banks' }, 500);
    }

    const doneCount = Array.isArray(completedVideoIds) ? completedVideoIds.length : 0;
    const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];

    const visible = (assigns || []).filter((a: Record<string, unknown>) => {
      // Check topic-based assignment
      if (a.topic_id && a.trigger_after_n_videos != null) {
        return doneCount >= Number(a.trigger_after_n_videos);
      }
      // Check video set-based assignment
      if (Array.isArray(a.video_ids) && a.min_completed_in_set != null) {
        const hits = a.video_ids.filter((id: unknown) => typeof id === "string" && completedIds.includes(id)).length;
        return hits >= Number(a.min_completed_in_set);
      }
      return false;
    }).map((a: Record<string, unknown>) => ({ id: a.id, bankId: a.bank_id }));

    return jsonResponse(req, { visible }, 200);
  } catch (error) {
    console.error('[quiz-bank-visible] request failed', {
      message: (error as Error).message || String(error),
    });
    return jsonResponse(req, { error: 'Unable to load quiz banks' }, 500);
  }
});
