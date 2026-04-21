import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/types/quiz-bank';

interface GenerateRequest {
  topicIds: string[];
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  mix?: boolean;
}

interface GenerateResponse {
  questions: Question[];
  topicNames: string[];
}

export function useGenerateQuizFromTopics() {
  return useMutation({
    mutationFn: async (request: GenerateRequest): Promise<GenerateResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-quiz-from-topics', {
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
