import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Exercise } from "@/types/chat";
import { evaluateHomework } from "@/services/homeworkGrading";
import { hasMultipleExercises, parseMultipleExercises } from "@/utils/homework/multiExerciseParser";
import { extractHomeworkFromMessage } from "@/utils/homework";

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
    console.log('=== FRONTEND DOCUMENT PROCESSING START ===', { fileName: file.name, fileType: file.type });
    
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
    
    if (error) {
      console.error('Error calling document processor:', error);
      toast.error('Could not process document. Please try uploading again.');
      return null;
    }
    
    console.log('=== EDGE FUNCTION RESPONSE ===', data);
    console.log('Raw text length:', data.rawText?.length || 0);
    console.log('Exercises found by edge function:', data.exercises?.length || 0);
    
    // Log each exercise received from edge function
    if (data.exercises && data.exercises.length > 0) {
      data.exercises.forEach((ex: any, idx: number) => {
        console.log(`Edge Function Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
      });
    }
    
    if (!data.success) {
      console.error('Invalid response from document processor:', data);
      toast.error(data.error || 'Failed to extract exercises from document');
      return null;
    }
    
    if (!data.exercises || data.exercises.length === 0) {
      console.warn('No exercises found by edge function, trying frontend fallback...');
      
      // Frontend fallback extraction
      if (data.rawText) {
        console.log('=== FRONTEND FALLBACK EXTRACTION ===');
        console.log('Raw text for fallback:', data.rawText.substring(0, 300));
        
        let extractedExercises: Array<{ question: string, answer: string }> = [];
        
        // Try multi-exercise parser first
        if (hasMultipleExercises(data.rawText)) {
          console.log('Frontend detected multiple exercises');
          const parsedExercises = parseMultipleExercises(data.rawText);
          extractedExercises = parsedExercises.map(ex => ({
            question: ex.question,
            answer: ex.answer || ""
          }));
          console.log(`Frontend multi-exercise parser found ${extractedExercises.length} exercises`);
        } else {
          // Enhanced frontend extraction
          extractedExercises = extractAllFractionsFromText(data.rawText);
          console.log(`Frontend fraction extraction found ${extractedExercises.length} exercises`);
        }
        
        if (extractedExercises.length > 0) {
          console.log('=== FRONTEND FALLBACK SUCCESS ===');
          extractedExercises.forEach((ex, idx) => {
            console.log(`Frontend Exercise ${idx + 1}: "${ex.question}" -> "${ex.answer}"`);
          });
          
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
    console.log('=== CONVERTING EDGE FUNCTION EXERCISES ===');
    const exercises: Exercise[] = data.exercises.map((ex: any, index: number) => {
      console.log(`Converting exercise ${index + 1}: "${ex.question}" -> "${ex.answer}"`);
      return {
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
      };
    });
    
    console.log(`=== FRONTEND PROCESSING COMPLETE: ${exercises.length} exercises ready ===`);
    exercises.forEach((ex, idx) => {
      console.log(`Final Frontend Exercise ${idx + 1}: "${ex.question}"`);
    });
    
    return { exercises, rawText: data.rawText || '' };
  } catch (error) {
    console.error('=== FRONTEND PROCESSING ERROR ===', error);
    toast.error('Failed to process document. Please try a different format or upload as text.');
    return null;
  }
};

// Enhanced frontend fraction extraction function
const extractAllFractionsFromText = (text: string): Array<{ question: string, answer: string }> => {
  console.log('=== FRONTEND ALL FRACTIONS EXTRACTION ===');
  const exercises = [];
  
  // Find all fractions
  const fractionPattern = /(\d+)\s*\/\s*(\d+)/g;
  const foundFractions = new Set();
  let match;
  
  while ((match = fractionPattern.exec(text)) !== null) {
    const fraction = `${match[1]}/${match[2]}`;
    foundFractions.add(fraction);
    console.log(`Frontend found fraction: ${fraction}`);
  }
  
  // Create exercises from all found fractions
  Array.from(foundFractions).forEach((fraction, index) => {
    const letter = String.fromCharCode(97 + index); // a, b, c, etc.
    exercises.push({
      question: `${letter}. Simplifiez la fraction ${fraction}`,
      answer: fraction
    });
    console.log(`Frontend created exercise: ${letter}. Simplifiez la fraction ${fraction}`);
  });
  
  console.log(`=== FRONTEND FRACTION EXTRACTION RESULT: ${exercises.length} exercises ===`);
  return exercises;
};

export const gradeDocumentExercises = async (exercises: Exercise[], selectedModelId: string): Promise<Exercise[]> => {
  try {
    if (exercises.length === 0) {
      return exercises;
    }
    
    console.log(`Grading ${exercises.length} exercises from document`);
    
    // Grade each exercise
    const gradingPromises = exercises.map(exercise => evaluateHomework(exercise, 1, 'en', selectedModelId));
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

// Enhanced exercise extraction function for documents
const extractEnhancedSimpleExercises = (text: string): Array<{ question: string, answer: string }> => {
  const exercises = [];
  
  // Enhanced patterns for French math worksheets
  const patterns = [
    // Lettered exercises: a. b. c. d. e.
    /(?:^|\n)\s*([a-z])[\.\)]\s*([^\n]+(?:\n(?!\s*[a-z][\.\)]).*)*)/gm,
    // Numbered exercises: 1. 2. 3.
    /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+(?:\n(?!\s*\d+[\.\)]).*)*)/gm,
    // Exercise keywords
    /(?:^|\n)\s*(exercice|problème|calcule[z]?)\s*(\d+|[a-z])?[\.\:]?\s*([^\n]+(?:\n(?!exercice|problème|calcule).*)*)/gim,
    // Math expressions with fractions
    /(?:^|\n)\s*([^\n]*(?:\d+\/\d+|fraction)[^\n]*)/gm
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length >= 2) {
      console.log(`Found ${matches.length} exercises using pattern: ${pattern}`);
      
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
        if (line.match(/\d+\/\d+|[a-z][\.\)]\s*|exercice|fraction|simplif|calcule/i)) {
          const parsed = extractHomeworkFromMessage(line.trim());
          exercises.push({
            question: parsed.question || line.trim(),
            answer: parsed.answer || ""
          });
        }
      }
    }
  }
  
  console.log(`Enhanced extraction found ${exercises.length} exercises`);
  return exercises;
};
