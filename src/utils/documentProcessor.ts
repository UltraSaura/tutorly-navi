
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
 * Determines if an exercise is likely a math problem
 */
const isMathProblem = (exercise: Exercise): boolean => {
  // Check if the question contains math operators or equations
  const mathPatterns = [
    /\d+\s*[\+\-\*\/]\s*\d+/, // Basic operations with numbers
    /[0-9]+\s*[×÷\+\-=]\s*[0-9]+/, // More math symbols
    /\(\s*\d+(\s*[\+\-\*\/]\s*\d+)+\s*\)/, // Parentheses expressions
    /sqrt|square root|cube|exponent|log|sin|cos|tan|∫|∑|∏|π|θ|∞|≠|≤|≥|±/, // Math terms and symbols
    /equation|formula|calculate|solve for|simplify|factor|expand/, // Math instruction words
    /algebra|geometry|calculus|trigonometry|statistics/ // Math subject areas
  ];
  
  if (!exercise.question) return false;
  
  // Check if any math pattern matches
  return mathPatterns.some(pattern => pattern.test(exercise.question.toLowerCase()));
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
    
    // Partition exercises into math and non-math problems
    const mathExercises: Exercise[] = [];
    const nonMathExercises: Exercise[] = [];
    
    exercises.forEach(exercise => {
      if (isMathProblem(exercise)) {
        mathExercises.push(exercise);
      } else {
        nonMathExercises.push(exercise);
      }
    });
    
    console.log(`Identified ${mathExercises.length} math exercises and ${nonMathExercises.length} non-math exercises`);
    
    // Grade each type of exercise with the appropriate model
    const gradingPromises = [
      ...mathExercises.map(exercise => evaluateHomework(exercise, 'math')),
      ...nonMathExercises.map(exercise => evaluateHomework(exercise, 'general'))
    ];
    
    const gradedExercises = await Promise.all(gradingPromises);
    
    // Check if any exercises were graded (have isCorrect property)
    const anyGraded = gradedExercises.some(ex => ex.isCorrect !== undefined);
    
    if (!anyGraded) {
      console.warn('No exercises were successfully graded');
      toast.warning('Could not grade exercises. Please check your API key configuration.');
    }
    
    return gradedExercises;
  } catch (error) {
    console.error('Error grading exercises:', error);
    toast.error('Error grading exercises');
    return exercises;
  }
};
