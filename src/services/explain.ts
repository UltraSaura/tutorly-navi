import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types/chat";

type ExplainPayload = {
  exercise_content: string;
  exercise_normalized: string;
  response_language?: "fr" | "en";
  grade_level?: string;
  country?: string;
  learning_style?: string;
  mode: "coach" | "explain";
  reveal_final_answer: "true" | "false";
};

export async function callExplanationFromServer(p: ExplainPayload) {
  try {
    // Calls your "explanation" usage_type prompt (Teaching v2) through your existing ai-chat endpoint
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: p.exercise_content,
        modelId: 'gpt-4o', // Default explanation model
        history: [],
        language: p.response_language || 'en',
        customPrompt: 'explanation', // This should trigger the explanation template
        userContext: {
          gradeLevel: p.grade_level,
          country: p.country,
          learning_style: p.learning_style
        },
        // Include the new prompt variables
        exercise_content: p.exercise_content,
        exercise_normalized: p.exercise_normalized,
        mode: p.mode,
        reveal_final_answer: p.reveal_final_answer
      },
    });

    if (error) {
      console.error('Explanation error:', error);
      throw new Error(error.message || 'Failed to generate explanation');
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in explanation service:', error);
    return { data: null, error };
  }
}