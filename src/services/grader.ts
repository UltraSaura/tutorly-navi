import { supabase } from "@/integrations/supabase/client";

export async function callGraderFromServer(payload: {
  exercise: string;
  studentAnswer: string;
}): Promise<"CORRECT" | "INCORRECT"> {
  try {
    // Calls the grading path in your existing edge function with isGradingRequest=true
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Exercise: ${payload.exercise}\nStudent Answer: ${payload.studentAnswer}`,
        modelId: 'gpt-4o', // Default grading model
        history: [],
        language: 'en',
        isGradingRequest: true,
        exercise: payload.exercise,
        studentAnswer: payload.studentAnswer
      },
    });

    if (error) {
      console.error('Grading error:', error);
      throw new Error(error.message || 'Failed to grade answer');
    }

    // Extract the grade from the response
    const gradeText = data?.content || data?.grade || '';
    const normalizedGrade = gradeText.toString().trim().toUpperCase();
    
    // The grader must return exactly "CORRECT" or "INCORRECT"
    if (normalizedGrade !== "CORRECT" && normalizedGrade !== "INCORRECT") {
      console.error("Grader returned invalid response:", normalizedGrade);
      throw new Error("Grader returned invalid response: " + normalizedGrade);
    }
    
    return normalizedGrade as "CORRECT" | "INCORRECT";
  } catch (error) {
    console.error('Error in grader service:', error);
    throw error;
  }
}