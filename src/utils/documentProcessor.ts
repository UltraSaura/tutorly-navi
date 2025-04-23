import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Exercise } from "@/types/chat";
import { evaluateHomework } from "@/services/homeworkGrading";

const convertBlobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const processUploadedDocument = async (
  file: File, 
  fileUrl: string,
  subjectId?: string
): Promise<{ exercises: Exercise[], rawText: string } | null> => {
  try {
    console.log('Starting document processing:', { fileName: file.name, fileType: file.type });
    
    // Convert blob to base64
    const base64Data = await convertBlobToBase64(file);
    
    // Call the document processor edge function with base64 data
    const { data, error } = await supabase.functions.invoke('document-processor', {
      body: {
        fileData: base64Data,
        fileType: file.type,
        fileName: file.name,
        subjectId: subjectId
      },
    });
    
    if (error) {
      console.error('Error calling document processor:', error);
      toast.error('Could not process document. Please try uploading again.');
      return null;
    }
    
    if (!data.success) {
      console.error('Invalid response from document processor:', data);
      toast.error(data.error || 'Failed to extract exercises from document');
      return null;
    }
    
    if (!data.exercises || data.exercises.length === 0) {
      console.warn('No exercises found in document');
      toast.warning('No exercises found in your document. Trying alternative extraction method...');
      
      // Attempt alternative extraction with just the raw text
      if (data.rawText) {
        const simpleExercises = extractSimpleExercises(data.rawText);
        if (simpleExercises.length > 0) {
          console.log('Found exercises using simple extraction:', simpleExercises);
          return {
            exercises: simpleExercises.map(ex => ({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              question: ex.question,
              userAnswer: ex.answer,
              expanded: false,
              isCorrect: undefined,
              explanation: undefined,
              subjectId: subjectId
            })),
            rawText: data.rawText
          };
        }
      }
      
      // Create a single exercise from the entire content if no exercises found
      return {
        exercises: [{
          id: Date.now() + Math.random().toString(36).substring(2, 9),
          question: `Document Content: ${file.name}`,
          userAnswer: data.rawText || 'Content extraction failed',
          expanded: false,
          isCorrect: undefined,
          explanation: undefined,
          subjectId: subjectId
        }],
        rawText: data.rawText || ''
      };
    }
    
    // Convert the raw exercises to our Exercise type
    const exercises: Exercise[] = data.exercises.map((ex: any) => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      question: ex.question,
      userAnswer: ex.answer,
      expanded: false,
      isCorrect: undefined,
      explanation: undefined,
      subjectId: subjectId
    }));
    
    console.log(`Processed ${exercises.length} exercises from document`);
    return { exercises, rawText: data.rawText || '' };
  } catch (error) {
    console.error('Error processing document:', error);
    toast.error('Failed to process document. Please try a different format or upload as text.');
    return null;
  }
};

// Simple exercise extraction function as fallback
const extractSimpleExercises = (text: string): Array<{ question: string, answer: string }> => {
  const exercises = [];
  const lines = text.split('\n');
  
  let currentQuestion = '';
  let currentAnswer = '';
  
  for (const line of lines) {
    // Look for common math exercise patterns
    if (line.match(/^\d+[\.\)]|\([0-9a-z]\)|\b(exercice|problème|calcule)\b/i)) {
      if (currentQuestion && currentAnswer) {
        exercises.push({ question: currentQuestion.trim(), answer: currentAnswer.trim() });
      }
      currentQuestion = line;
      currentAnswer = '';
    } else if (currentQuestion && line.trim()) {
      if (line.toLowerCase().includes('réponse') || line.toLowerCase().includes('solution')) {
        currentAnswer = line.replace(/^(réponse|solution)\s*:\s*/i, '');
      } else if (!currentAnswer) {
        currentQuestion += ' ' + line;
      } else {
        currentAnswer += ' ' + line;
      }
    }
  }
  
  // Add the last exercise if exists
  if (currentQuestion && currentAnswer) {
    exercises.push({ question: currentQuestion.trim(), answer: currentAnswer.trim() });
  }
  
  return exercises;
};

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
