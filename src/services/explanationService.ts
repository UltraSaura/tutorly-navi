/**
 * Lazy AI explanation fetcher — called only when the user clicks "Show explanation".
 */

import { supabase } from '@/integrations/supabase/client';

const cache = new Map<string, string>();

const isLocalSupabase = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:|\/|$)/i.test(
  import.meta.env.VITE_SUPABASE_URL ?? '',
);

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

  // The isolated local environment intentionally has no provider credentials.
  // Keep explanation verification usable without weakening hosted behavior.
  if (isLocalSupabase) {
    const explanation = language === 'fr'
      ? (isCorrect
        ? 'Bonne réponse. Vérifie chaque étape du calcul pour comprendre pourquoi elle fonctionne.'
        : 'Relis la question, identifie les données utiles et avance étape par étape. Essaie encore !')
      : (isCorrect
        ? 'Correct. Check each step of the calculation to understand why it works.'
        : 'Read the question again, identify the useful data, and work step by step. Try again!');
    cache.set(cacheKey, explanation);
    return explanation;
  }

  const langInstructions = language === 'fr' ? 'Respond in French.' : 'Respond in English.';
  
  let prompt: string;
  if (isCorrect) {
    const successMsg = language === 'fr'
      ? `L'élève a répondu correctement. Question: "${question}". Réponse: "${userAnswer}". Expliquez pourquoi cette réponse est correcte, étape par étape, dans un style de tuteur bienveillant.`
      : `The student answered correctly. Question: "${question}". Answer: "${userAnswer}". Explain step-by-step why this answer is correct, in a supportive tutoring style.`;
    prompt = `${langInstructions} ${successMsg}`;
  } else {
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

    prompt = `${langInstructions} The student answered incorrectly (attempt ${attemptNumber}). Question: "${question}". Their answer: "${userAnswer}". Do not state the correct answer, even if you can infer it. ${guidanceLevel}`;
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
