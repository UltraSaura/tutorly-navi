
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";
import { toast } from 'sonner';
import { areMathematicallyEquivalent } from "@/utils/mathValidation";
import { localGrade } from "./localMathGrader";

export const evaluateHomework = async (
  exercise: Exercise,
  attemptNumber: number = 1,
  language: string = 'en',
  selectedModelId: string
): Promise<Exercise> => {
  console.log('[homeworkGrading] Using model:', selectedModelId);
  try {
    console.log('[homeworkGrading] evaluateHomework called with:', exercise);
    if (!exercise.question) {
      toast.error('Please provide a question for grading.');
      return { ...exercise, isCorrect: false, explanation: undefined };
    }

    if (!exercise.userAnswer || exercise.userAnswer.trim() === '') {
      return { ...exercise, needsRetry: true, explanation: undefined };
    }

    // ===== PHASE 1: Try local grading first (no AI call) =====
    const localResult = localGrade(exercise.question, exercise.userAnswer);
    if (localResult && localResult.confidence === 'high') {
      console.log('[homeworkGrading] ✅ Local grading succeeded:', localResult);

      const isCorrect = localResult.isCorrect;
      const needsRetry = !isCorrect;

      toast.success(isCorrect
        ? (language === 'fr' ? "Correct ! Bon travail !" : "Correct! Great job!")
        : (language === 'fr' ? "Incorrect." : "Incorrect."));

      const updatedAttempts = exercise.attempts.map(attempt =>
        attempt.attemptNumber === attemptNumber
          ? { ...attempt, isCorrect }
          : attempt
      );

      return {
        ...exercise,
        isCorrect,
        explanation: undefined,
        needsRetry,
        attempts: updatedAttempts,
        gradingMethod: 'local',
        correctAnswer: localResult.correctAnswer,
        explanationLoading: false,
        explanationRequested: false,
      };
    }

    console.log('[homeworkGrading] Local grading not confident, falling back to AI');

    // ===== PHASE 2: AI fallback — grade only, no explanation =====
    const mathematicalEquivalency = areMathematicallyEquivalent(exercise.question, exercise.userAnswer);

    const { data: gradeData, error: gradeError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: 'GRADING_REQUEST',
        modelId: selectedModelId,
        history: [],
        isGradingRequest: true,
        userContext: {
          exercise: exercise.question,
          studentAnswer: exercise.userAnswer,
          exercise_content: exercise.question,
          student_answer: exercise.userAnswer
        }
      },
    });

    console.log('[homeworkGrading] Grade API response:', { gradeData, gradeError });

    if (gradeError || !gradeData?.content) {
      console.error('[homeworkGrading] Grading error:', gradeError || 'No content');
      toast.error(language === 'fr' ? 'Erreur de correction.' : 'Failed to grade your answer.');
      return {
        ...exercise,
        isCorrect: false,
        explanation: undefined,
        gradingMethod: 'ai' as const,
        explanationLoading: false,
        explanationRequested: false,
      };
    }

    if (gradeData.content.includes('NOT_MATH')) {
      toast.error(language === 'fr'
        ? "Cette question ne semble pas être liée aux mathématiques."
        : "This question doesn't appear to be math-related.");
      return {
        ...exercise,
        isCorrect: false,
        explanation: undefined,
        gradingMethod: 'ai' as const,
        explanationLoading: false,
        explanationRequested: false,
      };
    }

    const responseContent = gradeData.content.trim().toUpperCase();

    // Handle invalid format with mathematical fallback
    if (responseContent !== 'CORRECT' && responseContent !== 'INCORRECT') {
      console.error('[homeworkGrading] Invalid grade format:', responseContent);
      const isCorrect = mathematicalEquivalency === true;
      const needsRetry = !isCorrect;
      const updatedAttempts = exercise.attempts.map(attempt =>
        attempt.attemptNumber === attemptNumber ? { ...attempt, isCorrect } : attempt
      );
      toast.success(isCorrect
        ? (language === 'fr' ? "Correct ! Bon travail !" : "Correct! Great job!")
        : (language === 'fr' ? "Incorrect." : "Incorrect."));
      return {
        ...exercise,
        isCorrect,
        explanation: undefined,
        needsRetry,
        attempts: updatedAttempts,
        gradingMethod: 'ai' as const,
        explanationLoading: false,
        explanationRequested: false,
      };
    }

    let isCorrect = responseContent === 'CORRECT';
    if (!isCorrect && mathematicalEquivalency === true) {
      isCorrect = true;
    }

    const needsRetry = !isCorrect;
    const updatedAttempts = exercise.attempts.map(attempt =>
      attempt.attemptNumber === attemptNumber ? { ...attempt, isCorrect } : attempt
    );

    toast.success(isCorrect
      ? (language === 'fr' ? "Correct ! Bon travail !" : "Correct! Great job!")
      : (language === 'fr' ? "Incorrect." : "Incorrect."));

    return {
      ...exercise,
      isCorrect,
      explanation: undefined,
      needsRetry,
      attempts: updatedAttempts,
      gradingMethod: 'ai' as const,
      explanationLoading: false,
      explanationRequested: false,
    };
  } catch (error) {
    console.error('[homeworkGrading] Error evaluating homework:', error);
    toast.error(language === 'fr' ? 'Erreur de correction.' : 'There was an issue grading your homework.');
    return {
      ...exercise,
      isCorrect: false,
      explanation: undefined,
      gradingMethod: 'ai' as const,
      explanationLoading: false,
      explanationRequested: false,
    };
  }
};
