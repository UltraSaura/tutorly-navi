import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QuizBank } from '@/types/quiz-bank';
import { ensureQuizBank } from '@/types/quiz-bank';
import { useActiveSchoolLevel } from './useActiveSchoolLevel';
import { useLanguage } from '@/context/SimpleLanguageContext';

type AllBankRow = {
  id: string;
  bankId: string;
  language: string;
  isUnlocked: boolean;
  progressMessage: string;
  completedCount: number;
  requiredCount: number;
  videoIds: string[];
  topicId: string | null;
  triggerVideoId: string | null;
  displayContext: 'practice' | 'lesson' | 'both';
};

function normalizeLevel(level?: string | null): string | null {
  if (!level) return null;
  return level
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[:_\s-]+/g, '');
}

function matchesLevel(userLevel: string | null | undefined, schoolLevels?: string[] | null) {
  if (!schoolLevels || schoolLevels.length === 0) return true;
  const normalizedUserLevel = normalizeLevel(userLevel);
  if (!normalizedUserLevel) return true;
  return schoolLevels.some((level) => normalizeLevel(level) === normalizedUserLevel);
}

async function fetchAllBanksDirectFallback({
  topicId,
  videoId,
  completedVideoIds,
  context,
  userLevel,
  language,
}: {
  topicId: string;
  videoId: string;
  completedVideoIds: string[];
  context: 'practice' | 'lesson' | 'both';
  userLevel?: string | null;
  language: string;
}): Promise<{ banks: AllBankRow[] }> {
  if (!topicId && !videoId) return { banks: [] };

  const { data: assignments, error: assignmentError } = await supabase
    .from('quiz_bank_assignments')
    .select('*')
    .eq('is_active', true);

  if (assignmentError) throw assignmentError;

  const contextFiltered = (assignments || []).filter((assignment: any) => {
    const displayContext = assignment.display_context ?? 'both';
    if (context === 'practice') return displayContext === 'practice' || displayContext === 'both';
    if (context === 'lesson') return displayContext === 'lesson' || displayContext === 'both';
    return true;
  });

  const relevant = contextFiltered.filter((assignment: any) => {
    if (topicId && assignment.topic_id === topicId) return true;
    if (videoId && Array.isArray(assignment.video_ids) && assignment.video_ids.includes(videoId)) return true;
    if (videoId && assignment.trigger_video_id === videoId) return true;
    return false;
  });

  const bankIds = [...new Set(relevant.map((assignment: any) => assignment.bank_id).filter(Boolean))];
  const topicIds = [...new Set(relevant.map((assignment: any) => assignment.topic_id).filter(Boolean))];

  const [{ data: banks }, { data: topics }] = await Promise.all([
    bankIds.length
      ? supabase.from('quiz_banks').select('*').in('id', bankIds)
      : Promise.resolve({ data: [] as any[] }),
    topicIds.length
      ? supabase.from('topics').select('id, curriculum_level_code').in('id', topicIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const bankMap = new Map((banks || []).map((bank: any) => [bank.id, bank]));
  const topicLevelMap = new Map((topics || []).map((topic: any) => [topic.id, topic.curriculum_level_code]));
  const completedIds = Array.isArray(completedVideoIds) ? completedVideoIds : [];
  const doneCount = completedIds.length;

  return {
    banks: relevant.map((assignment: any) => {
      const bank = bankMap.get(assignment.bank_id);
      const displayContext = assignment.display_context ?? 'both';
      const fallbackLevel = assignment.topic_id ? topicLevelMap.get(assignment.topic_id) : null;
      const effectiveSchoolLevels = Array.isArray(bank?.school_levels) && bank.school_levels.length > 0
        ? bank.school_levels
        : (fallbackLevel ? [fallbackLevel] : []);

      if (!matchesLevel(userLevel, effectiveSchoolLevels)) return null;

      let isUnlocked = false;
      let progressMessage = '';
      let completedCount = 0;
      let requiredCount = 0;

      if (displayContext === 'practice' || (displayContext === 'both' && context === 'practice')) {
        isUnlocked = true;
      } else if (assignment.trigger_video_id) {
        isUnlocked = completedIds.includes(assignment.trigger_video_id);
        completedCount = isUnlocked ? 1 : 0;
        requiredCount = 1;
        if (!isUnlocked) progressMessage = 'Complete this video to unlock';
      } else if (assignment.trigger_after_n_videos != null) {
        completedCount = doneCount;
        requiredCount = assignment.trigger_after_n_videos;
        isUnlocked = doneCount >= assignment.trigger_after_n_videos;
        if (!isUnlocked) {
          const remaining = assignment.trigger_after_n_videos - doneCount;
          progressMessage = `Complete ${remaining} more video${remaining === 1 ? '' : 's'} to unlock`;
        }
      }

      return {
        id: assignment.id,
        bankId: assignment.bank_id,
        language,
        isUnlocked,
        progressMessage,
        completedCount,
        requiredCount,
        videoIds: assignment.video_ids || [],
        topicId: assignment.topic_id || null,
        triggerVideoId: assignment.trigger_video_id || null,
        displayContext,
      } as AllBankRow;
    }).filter(Boolean) as AllBankRow[],
  };
}

export function useQuizBank(bankId?: string) {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ['quiz-bank', bankId, language],
    queryFn: async (): Promise<QuizBank> => {
      if (!bankId) return ensureQuizBank(null);

      const { data, error } = await supabase.functions.invoke('quiz-bank', {
        body: { bankId, language },
        method: 'POST'
      });

      if (error) throw error;
      return ensureQuizBank(data);
    },
    enabled: !!bankId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVisibleBanks(topicId: string, completedVideoIds: string[], userId: string) {
  const activeSchoolLevel = useActiveSchoolLevel();
  const { language } = useLanguage();
  return useQuery({
    queryKey: ['visible-banks', topicId, completedVideoIds.join(','), activeSchoolLevel.normalizedLevel, language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('quiz-bank-visible', {
        body: {
          topicId,
          completedVideoIds,
          userId,
          userLevel: activeSchoolLevel.normalizedLevel,
          language,
        },
        method: 'POST'
      });

      if (error) throw error;
      return data as { visible: { id: string; bankId: string }[] };
    },
    enabled: !!topicId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllBanks(topicId: string, videoId: string, completedVideoIds: string[], userId: string, context: 'practice' | 'lesson' | 'both' = 'both') {
  const activeSchoolLevel = useActiveSchoolLevel();
  const { language } = useLanguage();
  return useQuery({
    queryKey: ['quiz-banks-all', topicId, videoId, completedVideoIds.join(','), context, activeSchoolLevel.normalizedLevel, language],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('quiz-bank-all', {
          body: {
            topicId,
            videoId,
            completedVideoIds,
            userId,
            context,
            userLevel: activeSchoolLevel.normalizedLevel,
            language,
          },
          method: 'POST'
        });

        if (error) throw error;
        const result = data as { banks: AllBankRow[] };
        if ((result.banks || []).length > 0) return result;
      } catch (error) {
        console.warn('[useAllBanks] edge function failed, falling back to direct query', error);
      }

      return fetchAllBanksDirectFallback({
        topicId,
        videoId,
        completedVideoIds,
        context,
        userLevel: activeSchoolLevel.normalizedLevel,
        language,
      });
    },
    enabled: !!userId && (!!topicId || !!videoId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBankAttemptStatus(bankId?: string, userId?: string) {
  return useQuery({
    queryKey: ['bank-attempt-status', bankId, userId],
    queryFn: async () => {
      if (!bankId || !userId) return null;
      
      const { data, error } = await supabase
        .from('quiz_bank_attempts')
        .select('score, max_score')
        .eq('bank_id', bankId)
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      return { bestScore: data[0].score, maxScore: data[0].max_score };
    },
    enabled: !!bankId && !!userId,
    staleTime: 60 * 1000,
  });
}

export function useSubmitBankAttempt() {
  const queryClient = useQueryClient();
  const activeSchoolLevel = useActiveSchoolLevel();
  
  return useMutation({
    mutationFn: async (payload: {
      bankId: string;
      userId: string;
      score: number;
      maxScore: number;
      tookSeconds?: number;
    }) => {
      if (activeSchoolLevel.isPreviewing) {
        return { success: true, preview: true };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('quiz-bank-attempt', {
        body: payload,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-attempt-status', variables.bankId] });
    },
  });
}
