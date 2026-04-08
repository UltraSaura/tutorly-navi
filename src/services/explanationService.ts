/**
 * Lazy AI explanation fetcher — called only when the user clicks "Show explanation".
 */

import { supabase } from '@/integrations/supabase/client';

const cache = new Map<string, string>();

export async function fetchExplanation(
  exerciseId: string,
  question: string,
  userAnswer: string,
  isCorrect: boolean,
  correctAnswer: string | undefined,
  language: string,
  modelId: string,
  attemptNumber: number = 1
): Promise<string> {
  // Check cache first
  const cacheKey = `${exerciseId}-${attemptNumber}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const langInstructions = language === 'fr' ? 'Respond in French.' : 'Respond in English.';
  
  let prompt: string;
  if (isCorrect) {
    const successMsg = language === 'fr'
      ? `L'élève a répondu correctement. Question: "${question}". Réponse: "${userAnswer}". Expliquez pourquoi cette réponse est correcte, étape par étape, dans un style de tuteur bienveillant.`
      : `The student answered correctly. Question: "${question}". Answer: "${userAnswer}". Explain step-by-step why this answer is correct, in a supportive tutoring style.`;
    prompt = `${langInstructions} ${successMsg}`;
  } else {
    const hiddenAnswer = correctAnswer ? ` The correct answer is ${correctAnswer}.` : '';
    
    let guidanceLevel: string;
    if (attemptNumber === 1) {
      guidanceLevel = language === 'fr'
        ? `Donnez des indications utiles sans donner directement la réponse. Terminez par "Essayez encore !"`
        : `Provide helpful guidance without giving away the answer directly. End with "Try again!"`;
    } else if (attemptNumber === 2) {
      guidanceLevel = language === 'fr'
        ? `Donnez des indications plus détaillées avec des indices sur l'approche spécifique. Terminez par "Vous vous rapprochez !"`
        : `Provide more detailed hints about the specific approach needed. End with "You're getting closer!"`;
    } else {
      guidanceLevel = language === 'fr'
        ? `Donnez une explication étape par étape qui montre presque comment résoudre, mais laissez l'élève faire le calcul final. Terminez par "Vous pouvez le faire !"`
        : `Provide step-by-step guidance that almost shows how to solve it, but let them do the final calculation. End with "You can do this!"`;
    }

    prompt = `${langInstructions} The student answered incorrectly (attempt ${attemptNumber}). Question: "${question}". Their answer: "${userAnswer}".${hiddenAnswer} ${guidanceLevel}`;
  }

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: prompt,
      modelId,
      history: [],
      isExercise: true,
    },
  });

  if (error || !data?.content) {
    throw new Error('Failed to fetch explanation');
  }

  const explanation = data.content;
  cache.set(cacheKey, explanation);
  return explanation;
}
