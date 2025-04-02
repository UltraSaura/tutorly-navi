
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
    
    if (!data.success) {
      console.error('Invalid response from document processor:', data);
      toast.error(data.error || 'Failed to extract exercises from document');
      return null;
    }
    
    if (!data.exercises || data.exercises.length === 0) {
      console.warn('No exercises found in document');
      toast.warning('No exercises found in your document');
      return { exercises: [], rawText: data.rawText || '' };
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
    
    console.log(`Processed ${exercises.length} exercises from document`);
    return { exercises, rawText: data.rawText || '' };
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
    if (exercises.length === 0) {
      return exercises;
    }
    
    console.log(`Grading ${exercises.length} exercises from document`);
    
    // Grade each exercise
    const gradingPromises = exercises.map(exercise => evaluateHomework(exercise));
    const gradedExercises = await Promise.all(gradingPromises);
    
    // Check if any exercises were graded (have isCorrect property)
    const anyGraded = gradedExercises.some(ex => ex.isCorrect !== undefined);
    
    if (!anyGraded) {
      console.warn('No exercises were successfully graded');
      toast.warning('Could not grade exercises. Please check your OpenAI API key configuration.');
    }
    
    return gradedExercises;
  } catch (error) {
    console.error('Error grading exercises:', error);
    toast.error('Error grading exercises');
    return exercises;
  }
};
