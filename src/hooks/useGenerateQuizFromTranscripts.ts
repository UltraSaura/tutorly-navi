import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/types/quiz-bank';

interface GenerateRequest {
  videoIds: string[];
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface GenerateResponse {
  questions: Question[];
  aggregatedWordCount: number;
  aggregatedTranscript: string;
  videoTitles: string[];
}

export function useGenerateQuizFromTranscripts() {
  return useMutation({
    mutationFn: async (request: GenerateRequest): Promise<GenerateResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-quiz-from-transcripts', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate questions');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as GenerateResponse;
    },
  });
}
