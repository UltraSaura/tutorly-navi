import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QuizBank } from '@/types/quiz-bank';
import { ensureQuizBank } from '@/types/quiz-bank';

export function useQuizBank(bankId?: string) {
  return useQuery({
    queryKey: ['quiz-bank', bankId],
    queryFn: async (): Promise<QuizBank> => {
      if (!bankId) return ensureQuizBank(null);
      
      // Call the edge function with bankId in the URL path
      const { data, error } = await supabase.functions.invoke(`quiz-bank/${bankId}`, {
        method: 'GET'
      });

      if (error) throw error;
      return ensureQuizBank(data);
    },
    enabled: !!bankId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVisibleBanks(topicId: string, completedVideoIds: string[], userId: string) {
  return useQuery({
    queryKey: ['visible-banks', topicId, completedVideoIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('quiz-bank-visible', {
        body: { topicId, completedVideoIds, userId },
        method: 'POST'
      });

      if (error) throw error;
      return data as { visible: { id: string; bankId: string }[] };
    },
    enabled: !!topicId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllBanks(topicId: string, videoId: string, completedVideoIds: string[], userId: string) {
  return useQuery({
    queryKey: ['quiz-banks-all', topicId, videoId, completedVideoIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('quiz-bank-all', {
        body: { topicId, videoId, completedVideoIds, userId },
        method: 'POST'
      });

      if (error) throw error;
      return data as { 
        banks: { 
          id: string; 
          bankId: string; 
          isUnlocked: boolean; 
          progressMessage: string;
          completedCount: number;
          requiredCount: number;
          videoIds: string[];
          topicId: string | null;
        }[] 
      };
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
  
  return useMutation({
    mutationFn: async (payload: {
      bankId: string;
      userId: string;
      score: number;
      maxScore: number;
      tookSeconds?: number;
    }) => {
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

