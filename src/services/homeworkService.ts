
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/admin";
import { toast } from 'sonner';

/**
 * Classifies a message as homework and identifies the subject
 */
export const classifyHomework = async (
  message: string,
  subjects: Subject[] = [],
  modelId?: string // Add modelId parameter
) => {
  try {
    // Call the Supabase Edge Function for classification
    const { data, error } = await supabase.functions.invoke('classify-homework', {
      body: {
        message,
        subjects,
        modelId, // Pass the modelId to the edge function
      },
    });
    
    if (error) {
      console.error('Error calling homework classification function:', error);
      throw new Error(error.message || 'Failed to classify homework');
    }
    
    // If classification was successful, return the result
    console.log('Homework classification result:', data);
    return data;
  } catch (error) {
    console.error('Error in homework classification:', error);
    
    // Fallback to regex-based detection if AI classification fails
    const isMathProblem = /\d+\s*[\+\-\*\/]\s*\d+/.test(message);
    const hasExerciseKeywords = /\b(solve|calculate|find|compute|homework|problem)\b/i.test(message);
    const mathSubject = subjects.find(s => 
      s.name.toLowerCase() === "mathematics" || 
      s.name.toLowerCase() === "math"
    );
    
    return {
      isHomework: isMathProblem || hasExerciseKeywords,
      confidence: 0.6,
      subject: mathSubject?.name || "Mathematics",
      subjectId: mathSubject?.id || null,
      question: message,
      answer: ""
    };
  }
};
