import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  parseJsonBody,
} from "../_shared/security.ts";

type AllBanksBody = {
  topicId?: unknown;
  videoId?: unknown;
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

    const bodyResult = await parseJsonBody<AllBanksBody>(req, 25_000);
    if (bodyResult.response || !bodyResult.data) {
      return bodyResult.response!;
    }

    const { topicId, videoId, completedVideoIds } = bodyResult.data;

    if (
      (topicId != null && typeof topicId !== "string") ||
      (videoId != null && typeof videoId !== "string")
    ) {
      return jsonResponse(req, { error: "Invalid request body" }, 400);
    }

    if (!topicId && !videoId) {
      return jsonResponse(req, { error: "Topic ID or Video ID required" }, 400);
    }

    const { data: assigns, error } = await adminClient
      .from('quiz_bank_assignments')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('[quiz-bank-all] query failed', { message: error.message });
      return jsonResponse(req, { error: 'Unable to load quiz banks' }, 500);
    }

    const doneCount = Array.isArray(completedVideoIds) ? completedVideoIds.length : 0;
    const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];

    const relevantAssignments = (assigns || []).filter((a: Record<string, unknown>) => {
      if (a.topic_id === topicId) return true;
      if (videoId && Array.isArray(a.video_ids) && a.video_ids.includes(videoId)) return true;
      return false;
    });

    const allBanks = relevantAssignments.map((a: Record<string, unknown>) => {
      let isUnlocked = false;
      let progressMessage = '';
      let completedCount = 0;
      let requiredCount = 0;

      if (a.topic_id && a.trigger_after_n_videos != null) {
        requiredCount = Number(a.trigger_after_n_videos);
        completedCount = doneCount;
        isUnlocked = doneCount >= Number(a.trigger_after_n_videos);
        if (!isUnlocked) {
          const remaining = Number(a.trigger_after_n_videos) - doneCount;
          progressMessage = `Complete ${remaining} more video${remaining === 1 ? '' : 's'} to unlock`;
        }
      }

      if (Array.isArray(a.video_ids) && a.min_completed_in_set != null) {
        requiredCount = Number(a.min_completed_in_set);
        completedCount = a.video_ids.filter((id: unknown) => typeof id === "string" && completedIds.includes(id)).length;
        isUnlocked = completedCount >= Number(a.min_completed_in_set);
        if (!isUnlocked) {
          const remaining = Number(a.min_completed_in_set) - completedCount;
          progressMessage = `Complete ${remaining} more video${remaining === 1 ? '' : 's'} from this set to unlock`;
        }
      }

      return {
        id: a.id,
        bankId: a.bank_id,
        isUnlocked,
        progressMessage,
        completedCount,
        requiredCount,
        videoIds: a.video_ids || [],
        topicId: a.topic_id || null
      };
    });

    return jsonResponse(req, { banks: allBanks }, 200);
  } catch (error) {
    console.error('[quiz-bank-all] request failed', {
      message: (error as Error).message || String(error),
    });
    return jsonResponse(req, { error: 'Unable to load quiz banks' }, 500);
  }
});
