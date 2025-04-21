
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";

export const getAIGuidance = async (exercise: Exercise): Promise<string> => {
  try {
    const { data: guidanceData, error: guidanceError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `The student answered this incorrectly. Question: "${exercise.question}" Their answer: "${exercise.userAnswer}". Please provide guidance without giving away the answer.`,
        modelId: 'gpt4o',
        history: [],
        isExercise: true
      },
    });

    if (guidanceError) {
      console.error("AI Guidance Error:", guidanceError);
      return formatErrorGuidance(exercise);
    }

    return guidanceData.content;
  } catch (error) {
    console.error("AI Guidance Generation Error:", error);
    return formatErrorGuidance(exercise);
  }
};

export const getAIGrading = async (exercise: Exercise): Promise<boolean> => {
  const { data: gradeData, error: gradeError } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: `Grade this answer. Question: "${exercise.question}" Answer: "${exercise.userAnswer}"`,
      modelId: 'gpt4o',
      history: [],
      isGradingRequest: true
    },
  });

  if (gradeError) throw gradeError;
  return gradeData.content.trim().toUpperCase() === 'CORRECT';
};

const formatErrorGuidance = (exercise: Exercise): string => {
  return "**Problem:** " + exercise.question + "\n\n**Guidance:** There was an issue generating guidance.";
};

