import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Exercise } from "@/types/chat";
import { evaluateHomework } from "@/services/homeworkGrading";
import { hasMultipleExercises, parseMultipleExercises } from "@/utils/homework/multiExerciseParser";
import { extractHomeworkFromMessage } from "@/utils/homework";
import {
  buildJustificationDocumentRequest,
  normalizeJustificationOcrPayload,
  type JustificationOcrResult,
} from "@/utils/justificationOcr";

type ExtractedExercise = {
  question: string;
  answer: string;
  responseType?: Exercise["responseType"];
  choices?: Exercise["choices"];
};

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
    // Show processing toast
    const processingToastId = toast.loading('Processing photo with OCR...');
    
    // Convert blob to base64
    const base64Data = await convertBlobToBase64(file);
    
    // Call the document processor edge function
    const { data, error } = await supabase.functions.invoke('document-processor', {
      body: {
        fileData: base64Data,
        fileType: file.type,
        fileName: file.name,
        subjectId: subjectId
      },
    });
    
    // Dismiss the processing toast
    toast.dismiss(processingToastId);
    
    if (error) {
      toast.error(`OCR processing failed: ${error.message || 'Unknown error'}`);
      return null;
    }
    
    if (!data.success) {
      toast.error(data.error || 'Failed to extract exercises from document');
      return null;
    }
    
    if (!data.exercises || data.exercises.length === 0) {
      // Frontend fallback extraction
      if (data.rawText) {
        let extractedExercises: ExtractedExercise[] = [];
        
        // Try multi-exercise parser first
        if (hasMultipleExercises(data.rawText)) {
          const parsedExercises = parseMultipleExercises(data.rawText);
          extractedExercises = parsedExercises.map(ex => ({
            question: ex.question,
            answer: ex.answer || ""
          }));
        } else {
          // Enhanced frontend extraction
          extractedExercises = extractAllFractionsFromText(data.rawText);
        }
        
        if (extractedExercises.length > 0) {
          toast.success(`Found ${extractedExercises.length} exercises using frontend extraction!`);
          
          return {
            exercises: extractedExercises.map(ex => ({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              question: ex.question,
              userAnswer: ex.answer,
              expanded: false,
              isCorrect: undefined,
              explanation: undefined,
              subjectId: subjectId,
              attemptCount: 1,
              attempts: [{
                id: `${Date.now()}-attempt-1`,
                answer: ex.answer,
                timestamp: new Date(),
                attemptNumber: 1,
              }],
              lastAttemptDate: new Date(),
              needsRetry: false,
              responseType: ex.responseType,
              choices: ex.choices,
            })),
            rawText: data.rawText
          };
        }
      }
      
      // Final fallback
      return {
        exercises: [{
          id: Date.now() + Math.random().toString(36).substring(2, 9),
          question: `Document Content: ${file.name}`,
          userAnswer: data.rawText || 'Content extraction failed',
          expanded: false,
          isCorrect: undefined,
          explanation: undefined,
          attemptCount: 1,
          attempts: [{
            id: `${Date.now()}-attempt-1`,
            answer: data.rawText || 'Content extraction failed',
            timestamp: new Date(),
            attemptNumber: 1,
          }],
          lastAttemptDate: new Date(),
          needsRetry: false,
          subjectId: subjectId
        }],
        rawText: data.rawText || ''
      };
    }
    
    // Convert edge function exercises to Exercise type
    const exercises: Exercise[] = (data.exercises as ExtractedExercise[]).map((ex, index: number) => ({
        id: Date.now() + index + Math.random().toString(36).substring(2, 9),
        question: ex.question,
        userAnswer: ex.answer,
        expanded: false,
        isCorrect: undefined,
        explanation: undefined,
        subjectId: subjectId,
        attemptCount: 1,
        attempts: [{
          id: `${Date.now()}-${index}-attempt-1`,
          answer: ex.answer,
          timestamp: new Date(),
          attemptNumber: 1,
        }],
        lastAttemptDate: new Date(),
        needsRetry: false,
        responseType: ex.responseType,
        choices: ex.choices,
      }));
    
    return { exercises, rawText: data.rawText || '' };
  } catch (error) {
    toast.error('Failed to process document. Please try a different format or upload as text.');
    return null;
  }
};

export const processJustificationAttachment = async (
  file: File,
  subjectId?: string,
  context?: {
    rowPrompt?: string;
    problemContext?: string;
  }
): Promise<JustificationOcrResult> => {
  try {
    const base64Data = await convertBlobToBase64(file);
    const { data, error } = await supabase.functions.invoke('document-processor', {
      body: buildJustificationDocumentRequest({
        fileData: base64Data,
        fileType: file.type,
        fileName: file.name,
        subjectId,
        rowPrompt: context?.rowPrompt,
        problemContext: context?.problemContext,
      }),
    });

    if (error) {
      return { rawText: '', error: error.message || 'OCR processing failed' };
    }

    if (!data?.success) {
      return { rawText: '', error: data?.error || 'OCR processing failed' };
    }

    const ocrResult = normalizeJustificationOcrPayload(data);
    const rawText = ocrResult.rawText.trim();
    if (!rawText) {
      return { rawText: '', error: 'No readable text was found in this attachment' };
    }

    return ocrResult;
  } catch (error) {
    return {
      rawText: '',
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
};

// Enhanced frontend fraction extraction function
const extractAllFractionsFromText = (text: string): ExtractedExercise[] => {
  const exercises = [];
  
  // Find all fractions
  const fractionPattern = /(\d+)\s*\/\s*(\d+)/g;
  const foundFractions = new Set();
  let match;
  
  while ((match = fractionPattern.exec(text)) !== null) {
    const fraction = `${match[1]}/${match[2]}`;
    foundFractions.add(fraction);
  }
  
  // Create exercises from all found fractions
  Array.from(foundFractions).forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    });
  });

  return exercises;
};

export const gradeDocumentExercises = async (exercises: Exercise[], selectedModelId: string): Promise<Exercise[]> => {
  try {
    if (exercises.length === 0) {
      return exercises;
    }
    
    // Separate exercises with answers from those without
    const withAnswers = exercises.filter(ex => ex.userAnswer && ex.userAnswer.trim() !== '');
    const withoutAnswers = exercises.filter(ex => !ex.userAnswer || ex.userAnswer.trim() === '');
    
    // Only grade exercises that have student answers
    let gradedWithAnswers: Exercise[] = [];
    if (withAnswers.length > 0) {
      const gradingPromises = withAnswers.map(exercise => evaluateHomework(exercise, 1, 'en', selectedModelId));
      gradedWithAnswers = await Promise.all(gradingPromises);
    }
    
    // Return graded + ungraded (no false warning for empty answers)
    return [...gradedWithAnswers, ...withoutAnswers];
  } catch (error) {
    console.error('Error grading exercises:', error);
    toast.error('Error grading exercises');
    return exercises;
  }
};

// Enhanced exercise extraction function for documents
const extractEnhancedSimpleExercises = (text: string): ExtractedExercise[] => {
  const exercises = [];
  
  // Enhanced patterns for French math worksheets
  const patterns = [
    // Lettered exercises: a. b. c. d. e.
    /(?:^|\n)\s*([a-z])[.)]\s*([^\n]+(?:\n(?!\s*[a-z][.)]).*)*)/gm,
    // Numbered exercises: 1. 2. 3.
    /(?:^|\n)\s*(\d+)[.)]\s*([^\n]+(?:\n(?!\s*\d+[.)]).*)*)/gm,
    // Exercise keywords
    /(?:^|\n)\s*(exercice|problème|calcule[z]?)\s*(\d+|[a-z])?[.:]?\s*([^\n]+(?:\n(?!exercice|problème|calcule).*)*)/gim,
    // Math expressions with fractions
    /(?:^|\n)\s*([^\n]*(?:\d+\/\d+|fraction)[^\n]*)/gm
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length >= 2) {
      matches.forEach((match, index) => {
        let exerciseText = '';
        
        if (match.length >= 4) {
          // Pattern with 3+ groups (like exercise keywords)
          exerciseText = match[3] || match[2] || match[1];
        } else if (match.length === 3) {
          // Pattern with 2 groups (like lettered/numbered)
          exerciseText = match[2];
        } else {
          // Single group pattern
          exerciseText = match[1];
        }
        
        if (exerciseText && exerciseText.trim().length > 5) {
          // Try to extract question/answer using existing logic
          const parsed = extractHomeworkFromMessage(exerciseText.trim());
          
          exercises.push({
            question: parsed.question || exerciseText.trim(),
            answer: parsed.answer || ""
          });
        }
      });
      
      // If we found exercises with this pattern, return them
      if (exercises.length > 0) {
        break;
      }
    }
  }
  
  // If no pattern worked, try to find any meaningful content
  if (exercises.length === 0) {
    const lines = text.split('\n').filter(line => line.trim().length > 10);
    
    if (lines.length > 0) {
      // Look for math content or meaningful exercises
      for (const line of lines) {
        if (line.match(/\d+\/\d+|[a-z][.)]\s*|exercice|fraction|simplif|calcule/i)) {
          const parsed = extractHomeworkFromMessage(line.trim());
          exercises.push({
            question: parsed.question || line.trim(),
            answer: parsed.answer || ""
          });
        }
      }
    }
  }
  
  return exercises;
};
