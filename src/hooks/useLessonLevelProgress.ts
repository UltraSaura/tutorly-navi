import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackLearningInteraction } from '@/services/learningAnalytics';

/**
 * Tracks how many progressif levels of a topic the student has completed, for the
 * Brilliant-style level path (`LessonLevelPath`). Gives sequential gating
 * (level i unlocks once level i-1 is done) and persists across reloads/devices.
 *
 * Persistence mirrors useLessonResume:
 * - localStorage for instant / offline (`stuwy:lesson-levels:{topicId}`)
 * - one `user_learning_progress` row per (user, topic) with
 *   `progress_type = 'lesson_level_completed'`, storing the completed-level COUNT
 *   in `last_watched_position_seconds` (reused numeric field — no schema change).
 *
 * When every level is finished, it writes the authoritative
 * `progress_type = 'lesson_completed'` row (deduped) so XP/streak in useStudentStats
 * stay correct — per-level state only drives the path UI.
 *
 * Note: no unique constraint on (user_id, topic_id, progress_type), so we avoid
 * upsert/onConflict and keep the row id in a ref (update-by-id or insert).
 */
const storageKey = (topicId: string) => `stuwy:lesson-levels:${topicId}`;

export function useLessonLevelProgress(
  topicId: string,
  userId: string | undefined,
  totalLevels: number,
  subjectId?: string | null,
) {
  const queryClient = useQueryClient();
  const [completedCount, setCompletedCount] = useState(0);
  const [ready, setReady] = useState(false);
  const completedRef = useRef(0);
  const rowIdRef = useRef<string | null>(null);

  const setCount = useCallback((n: number) => {
    completedRef.current = n;
    setCompletedCount(n);
  }, []);

  // Restore once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let count = 0;
      try {
        const ls = localStorage.getItem(storageKey(topicId));
        if (ls != null) {
          const n = parseInt(ls, 10);
          if (!Number.isNaN(n)) count = n;
        }
      } catch { /* ignore */ }

      if (userId) {
        try {
          const { data } = await supabase
            .from('user_learning_progress')
            .select('id, last_watched_position_seconds')
            .eq('user_id', userId)
            .eq('topic_id', topicId)
            .eq('progress_type', 'lesson_level_completed')
            .maybeSingle();
          if (data) {
            rowIdRef.current = data.id;
            const dbCount = Math.round(data.last_watched_position_seconds ?? 0);
            if (!Number.isNaN(dbCount)) count = dbCount; // DB wins when present
          }
        } catch { /* ignore */ }
      }

      if (cancelled) return;
      setCount(Math.max(0, Math.min(count, totalLevels)));
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, userId, totalLevels]);

  const persistCount = useCallback((n: number) => {
    const pct = totalLevels > 0 ? Math.round((n / totalLevels) * 100) : 0;
    try { localStorage.setItem(storageKey(topicId), String(n)); } catch { /* ignore */ }
    if (!userId) return;
    void (async () => {
      try {
        if (rowIdRef.current) {
          await supabase
            .from('user_learning_progress')
            .update({ last_watched_position_seconds: n, progress_percentage: pct })
            .eq('id', rowIdRef.current);
        } else {
          const { data } = await supabase
            .from('user_learning_progress')
            .insert({
              user_id: userId,
              topic_id: topicId,
              subject_id: subjectId ?? null,
              progress_type: 'lesson_level_completed',
              last_watched_position_seconds: n,
              progress_percentage: pct,
            })
            .select('id')
            .maybeSingle();
          if (data) rowIdRef.current = data.id;
        }
      } catch { /* ignore */ }
    })();
  }, [topicId, userId, subjectId, totalLevels]);

  // Write the authoritative lesson_completed row (deduped) for XP/streak.
  const writeLessonCompleted = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from('user_learning_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .eq('progress_type', 'lesson_completed')
        .maybeSingle();
      if (!existing) {
        await supabase.from('user_learning_progress').insert({
          user_id: userId,
          topic_id: topicId,
          subject_id: subjectId ?? null,
          progress_type: 'lesson_completed',
          progress_percentage: 100,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['student-stats'] });
      trackLearningInteraction({ studentId: userId, eventType: 'lesson_completed', topicId });
    } catch (err) {
      console.warn('[useLessonLevelProgress] lesson_completed write error:', err);
    }
  }, [userId, topicId, subjectId, queryClient]);

  /**
   * Mark level `i` complete. Returns whether THIS call finished the whole lesson
   * (so the caller can fire the final celebration exactly once).
   */
  const markLevelComplete = useCallback(async (i: number): Promise<{ justFinishedLesson: boolean }> => {
    const prev = completedRef.current;
    const next = Math.max(prev, i + 1);
    const wasComplete = prev >= totalLevels;
    const nowComplete = next >= totalLevels;
    if (next !== prev) {
      setCount(next);
      persistCount(next);
    }
    const justFinishedLesson = !wasComplete && nowComplete;
    if (justFinishedLesson) await writeLessonCompleted();
    return { justFinishedLesson };
  }, [totalLevels, setCount, persistCount, writeLessonCompleted]);

  const isUnlocked = useCallback((i: number) => i <= completedCount, [completedCount]);
  const activeLevel = Math.min(completedCount, Math.max(0, totalLevels - 1));

  return { completedCount, activeLevel, ready, isUnlocked, markLevelComplete };
}
