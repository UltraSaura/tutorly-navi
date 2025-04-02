
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Exercise } from "@/types/chat";
import { evaluateHomework } from "@/services/homeworkGrading";

/**
 * Processes an uploaded file to extract exercises
 */
export const processUploadedDocument = async (
  file: File, 
  fileUrl: string
): Promise<{ exercises: Exercise[], rawText: string } | null> => {
  try {
    // Call the document processor edge function
    const { data, error } = await supabase.functions.invoke('document-processor', {
      body: {
        fileUrl: fileUrl,
        fileType: file.type,
        fileName: file.name
      },
    });
    
    if (error) {
      console.error('Error calling document processor:', error);
      toast.error('Could not process document');
      return null;
    }
    
    if (!data.success || !data.exercises) {
      console.error('Invalid response from document processor:', data);
      toast.error('Failed to extract exercises from document');
      return null;
    }
    
    // Convert the raw exercises to our Exercise type
    const exercises: Exercise[] = data.exercises.map((ex: any) => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      question: ex.question,
      userAnswer: ex.answer,
      expanded: false,
      isCorrect: undefined,
      explanation: undefined
    }));
    
    return { exercises, rawText: data.rawText };
  } catch (error) {
    console.error('Error processing document:', error);
    toast.error('Failed to process document');
    return null;
  }
};

/**
 * Grades all exercises extracted from a document
 */
export const gradeDocumentExercises = async (exercises: Exercise[]): Promise<Exercise[]> => {
  try {
    // Grade each exercise
    const gradingPromises = exercises.map(exercise => evaluateHomework(exercise));
    const gradedExercises = await Promise.all(gradingPromises);
    
    return gradedExercises;
  } catch (error) {
    console.error('Error grading exercises:', error);
    toast.error('Error grading some exercises');
    return exercises;
  }
};
