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

export interface QuizGenerationProgress {
  requested: number;
  generated: number;
  remaining: number;
  providerCalls: number;
  retryCount: number;
  failedBatch?: number;
  failureCategory?: string;
  questions?: Question[];
}

export class QuizGenerationError extends Error {
  constructor(message: string, readonly progress?: QuizGenerationProgress) {
    super(message);
    this.name = 'QuizGenerationError';
  }
}

export function useGenerateQuizFromTopics() {
  return useMutation({
    mutationFn: async (request: GenerateRequest): Promise<GenerateResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-quiz-from-topics', {
        body: request,
      });

      if (error) {
        let message = error.message || 'Failed to generate questions';
        let progress: QuizGenerationProgress | undefined;
        const response = (error as { context?: Response }).context;
        if (response instanceof Response) {
          try {
            const payload = await response.clone().json();
            message = payload?.error || payload?.message || message;
            progress = payload?.progress;
          } catch {
            // Keep the Functions client message when the response is not JSON.
          }
        }
        throw new QuizGenerationError(message, progress);
      }

      if (data?.error) {
        throw new QuizGenerationError(data.error, data.progress);
      }

      return data as GenerateResponse;
    },
  });
}
