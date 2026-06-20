import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Persists the student's position within a lesson so they resume where they left off.
 *
 * - localStorage is written synchronously for instant / offline resume on the same device.
 * - A `lesson_in_progress` row in `user_learning_progress` mirrors it for cross-device resume.
 *   We reuse `last_watched_position_seconds` to store the card index (no schema change).
 * - The row is deleted on completion (and on replay) so a finished lesson restarts from card 0.
 *
 * Note: there is no unique constraint on (user_id, topic_id, progress_type), so we avoid
 * upsert/onConflict (unreliable in supabase-js for non-PK columns) and keep the row id in a ref.
 */
const storageKey = (topicId: string, suffix = '') => `stuwy:lesson-pos:${topicId}${suffix}`;

/**
 * @param opts.keySuffix  namespaces the localStorage key (e.g. per level `:lvl2`).
 * @param opts.dbEnabled  when false, resume is localStorage-only — used for per-level
 *   sessions so multiple levels of one topic don't collide on the single
 *   `lesson_in_progress` DB row (the path's useLessonLevelProgress owns DB state).
 */
export function useLessonResume(
  topicId: string,
  userId: string | undefined,
  maxIndex: number,
  opts?: { keySuffix?: string; dbEnabled?: boolean },
) {
  const keySuffix = opts?.keySuffix ?? '';
  const dbEnabled = opts?.dbEnabled !== false;
  const [restoredIndex, setRestoredIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const rowIdRef = useRef<string | null>(null);

  // Restore once, when the topic/user are known.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let idx: number | null = null;

      try {
        const ls = localStorage.getItem(storageKey(topicId, keySuffix));
        if (ls != null) {
          const n = parseInt(ls, 10);
          if (!Number.isNaN(n)) idx = n;
        }
      } catch { /* ignore */ }

      if (userId && dbEnabled) {
        try {
          const { data } = await supabase
            .from('user_learning_progress')
            .select('id, last_watched_position_seconds')
            .eq('user_id', userId)
            .eq('topic_id', topicId)
            .eq('progress_type', 'lesson_in_progress')
            .maybeSingle();
          if (data) {
            rowIdRef.current = data.id;
            const dbIdx = Math.round(data.last_watched_position_seconds ?? 0);
            if (!Number.isNaN(dbIdx)) idx = dbIdx; // DB is source of truth when present
          }
        } catch { /* ignore */ }
      }

      if (cancelled) return;
      if (idx != null && idx > 0 && idx <= maxIndex) setRestoredIndex(idx);
      setReady(true);
    })();
    return () => { cancelled = true; };
    // maxIndex intentionally excluded: we restore once on mount, then clamp at apply time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, userId]);

  const save = useCallback((index: number, percentage: number) => {
    try { localStorage.setItem(storageKey(topicId, keySuffix), String(index)); } catch { /* ignore */ }
    if (!userId || !dbEnabled) return;
    void (async () => {
      try {
        if (rowIdRef.current) {
          await supabase
            .from('user_learning_progress')
            .update({ last_watched_position_seconds: index, progress_percentage: percentage })
            .eq('id', rowIdRef.current);
        } else {
          const { data } = await supabase
            .from('user_learning_progress')
            .insert({
              user_id: userId,
              topic_id: topicId,
              progress_type: 'lesson_in_progress',
              last_watched_position_seconds: index,
              progress_percentage: percentage,
            })
            .select('id')
            .maybeSingle();
          if (data) rowIdRef.current = data.id;
        }
      } catch { /* ignore */ }
    })();
  }, [topicId, userId, keySuffix, dbEnabled]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(storageKey(topicId, keySuffix)); } catch { /* ignore */ }
    if (userId && dbEnabled && rowIdRef.current) {
      const id = rowIdRef.current;
      rowIdRef.current = null;
      void supabase.from('user_learning_progress').delete().eq('id', id);
    }
  }, [topicId, userId, keySuffix, dbEnabled]);

  return { restoredIndex, ready, save, clear };
}
