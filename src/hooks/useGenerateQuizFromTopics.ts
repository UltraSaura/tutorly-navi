import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/types/quiz-bank';

interface GenerateRequest {
  topicIds: string[];
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  mix?: boolean;
  language: string;
  // Optional progressif-level focus (batch "per level" mode).
  focusLabel?: string;
  focusContext?: string;
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
        let message = error.message || 'Failed to generate questions';
        const response = (error as { context?: Response }).context;
        if (response instanceof Response) {
          try {
            const payload = await response.clone().json();
            message = payload?.error || payload?.message || message;
          } catch {
            // Keep the Functions client message when the response is not JSON.
          }
        }
        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as GenerateResponse;
    },
  });
}
