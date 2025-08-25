
import { Exercise, Message } from '@/types/chat';
import { toast } from 'sonner';
import { evaluateHomework } from '@/services/homeworkGrading';
import { extractHomeworkFromMessage } from '@/utils/homework';
import { hasMultipleExercises, parseMultipleExercises } from '@/utils/homework/multiExerciseParser';

export const processNewExercise = async (
  message: string,
  existingExercises: Exercise[],
  processedContent: Set<string>,
  language: string = 'en'
): Promise<{ exercise: Exercise; isUpdate: boolean } | null> => {
  // Check if we've processed this exact content before
  if (processedContent.has(message)) {
    console.log("[exerciseProcessor] Skipping duplicate homework submission for:", message);
    return null;
  }

  // Check if this is a file upload message
  const isFileUpload = message.startsWith('Problem:') && message.includes('Answer: Document submitted for review') ||
                       message.includes('Answer: Image submitted for review');

  let question, answer;

  if (isFileUpload) {
    const parts = message.split('\n');
    question = parts[0].replace('Problem:', '').trim();
    answer = parts[1].replace('Answer:', '').trim();
    console.log("[exerciseProcessor] Detected file upload. Parsed question and answer:", { question, answer });
  } else {
    const extracted = extractHomeworkFromMessage(message);
    question = extracted.question;
    answer = extracted.answer;
    console.log("[exerciseProcessor] Extracted from message. Question/Answer:", { question, answer });
  }

  if (!question || !answer) {
    console.log("[exerciseProcessor] Couldn't extract homework components from the message:", { message, question, answer });
    return null;
  }

  // Check for exact duplicates (same question + same answer)
  const exactDuplicate = existingExercises.find(
    ex => ex.question === question && ex.userAnswer === answer
  );

  if (exactDuplicate) {
    console.log("[exerciseProcessor] Exact duplicate found, ignoring:", { question, answer });
    return null;
  }

  // Check for retry attempts (same question + different answer)
  const existingExercise = existingExercises.find(ex => ex.question === question);

  if (existingExercise) {
    console.log("[exerciseProcessor] Found retry attempt for existing question:", { question, answer });
    
    // Create new attempt
    const attemptNumber = existingExercise.attemptCount + 1;
    const newAttempt = {
      id: `${existingExercise.id}-attempt-${attemptNumber}`,
      answer,
      timestamp: new Date(),
      attemptNumber,
    };

    // Update existing exercise
    const updatedExercise: Exercise = {
      ...existingExercise,
      userAnswer: answer, // Update to latest answer
      attemptCount: attemptNumber,
      attempts: [...existingExercise.attempts, newAttempt],
      lastAttemptDate: new Date(),
      needsRetry: false, // Will be set based on grading result
    };

    try {
      const gradedExercise = await evaluateHomework(updatedExercise, attemptNumber, language);
      console.log("[exerciseProcessor] Graded retry exercise:", gradedExercise);
      return { exercise: gradedExercise, isUpdate: true };
    } catch (error) {
      console.error('[exerciseProcessor] Error evaluating homework retry:', error);
      toast.error('There was an issue grading your homework. Please try again.');
      return null;
    }
  }

  // Create new exercise
  const newAttempt = {
    id: `${Date.now()}-attempt-1`,
    answer,
    timestamp: new Date(),
    attemptNumber: 1,
  };

  const newEx: Exercise = {
    id: Date.now().toString(),
    question,
    userAnswer: answer,
    expanded: false,
    relatedMessages: [],
    attemptCount: 1,
    attempts: [newAttempt],
    lastAttemptDate: new Date(),
    needsRetry: false,
  };

  console.log("[exerciseProcessor] Created new exercise object before grading:", newEx);

  try {
    const gradedExercise = await evaluateHomework(newEx, 1, language);
    console.log("[exerciseProcessor] Graded new exercise:", gradedExercise);
    return { exercise: gradedExercise, isUpdate: false };
  } catch (error) {
    console.error('[exerciseProcessor] Error evaluating homework:', error);
    toast.error('There was an issue grading your homework. Please try again.');
    return null;
  }
};

export const linkMessageToExercise = (
  exercises: Exercise[],
  userMessage: string,
  aiMessage: Message
): Exercise[] => {
  const { question } = extractHomeworkFromMessage(userMessage);

  if (!question) {
    console.log("[exerciseProcessor] Couldn't extract question from user message:", userMessage);
    return exercises;
  }

  const exerciseIndex = exercises.findIndex(ex => ex.question === question);

  if (exerciseIndex === -1) {
    console.log("[exerciseProcessor] Couldn't find exercise for this message:", question);
    return exercises;
  }

  const updatedExercises = [...exercises];
  const exercise = updatedExercises[exerciseIndex];

  if (!exercise.relatedMessages) {
    exercise.relatedMessages = [];
  }

  if (!exercise.relatedMessages.some(msg => msg.id === aiMessage.id)) {
    exercise.relatedMessages.push(aiMessage);
    console.log(`[exerciseProcessor] Linked AI message ${aiMessage.id} to exercise with question "${question}"`);
  } else {
    console.log(`[exerciseProcessor] AI message ${aiMessage.id} already linked to exercise`, question);
  }

  return updatedExercises;
};

/**
 * Process multiple exercises from a single message
 */
export const processMultipleExercises = async (
  message: string,
  existingExercises: Exercise[],
  processedContent: Set<string>,
  language: string = 'en'
): Promise<Exercise[]> => {
  console.log("[exerciseProcessor] Processing multiple exercises from message:", message);
  
  // Check if we've processed this exact content before
  if (processedContent.has(message)) {
    console.log("[exerciseProcessor] Skipping duplicate multi-exercise submission");
    return [];
  }

  // Parse the message into multiple exercises
  const parsedExercises = parseMultipleExercises(message);
  
  if (parsedExercises.length === 0) {
    console.log("[exerciseProcessor] No exercises found in multi-exercise message");
    return [];
  }

  console.log(`[exerciseProcessor] Found ${parsedExercises.length} exercises in message`);

  const processedExercises: Exercise[] = [];

  for (const parsedEx of parsedExercises) {
    if (!parsedEx.question) continue;

    // Check for exact duplicates
    const exactDuplicate = existingExercises.find(
      ex => ex.question === parsedEx.question && ex.userAnswer === parsedEx.answer
    );

    if (exactDuplicate) {
      console.log("[exerciseProcessor] Skipping duplicate exercise:", parsedEx.question);
      continue;
    }

    // Check for retry attempts
    const existingExercise = existingExercises.find(ex => ex.question === parsedEx.question);

    if (existingExercise && parsedEx.answer) {
      // This is a retry attempt
      const attemptNumber = existingExercise.attemptCount + 1;
      const newAttempt = {
        id: `${existingExercise.id}-attempt-${attemptNumber}`,
        answer: parsedEx.answer,
        timestamp: new Date(),
        attemptNumber,
      };

      const updatedExercise: Exercise = {
        ...existingExercise,
        userAnswer: parsedEx.answer,
        attemptCount: attemptNumber,
        attempts: [...existingExercise.attempts, newAttempt],
        lastAttemptDate: new Date(),
        needsRetry: false,
      };

      try {
        const gradedExercise = await evaluateHomework(updatedExercise, attemptNumber, language);
        processedExercises.push(gradedExercise);
        console.log("[exerciseProcessor] Processed retry exercise:", gradedExercise.question);
      } catch (error) {
        console.error('[exerciseProcessor] Error grading retry exercise:', error);
        continue;
      }
    } else if (parsedEx.answer) {
      // This is a new exercise with answer
      const newAttempt = {
        id: `${Date.now()}-${parsedEx.index}-attempt-1`,
        answer: parsedEx.answer,
        timestamp: new Date(),
        attemptNumber: 1,
      };

      const newEx: Exercise = {
        id: `${Date.now()}-${parsedEx.index}`,
        question: parsedEx.question,
        userAnswer: parsedEx.answer,
        expanded: false,
        relatedMessages: [],
        attemptCount: 1,
        attempts: [newAttempt],
        lastAttemptDate: new Date(),
        needsRetry: false,
      };

      try {
        const gradedExercise = await evaluateHomework(newEx, 1, language);
        processedExercises.push(gradedExercise);
        console.log("[exerciseProcessor] Processed new exercise:", gradedExercise.question);
      } catch (error) {
        console.error('[exerciseProcessor] Error grading new exercise:', error);
        continue;
      }
    } else {
      // Exercise without answer (question only)
      const newEx: Exercise = {
        id: `${Date.now()}-${parsedEx.index}`,
        question: parsedEx.question,
        userAnswer: "",
        expanded: false,
        relatedMessages: [],
        attemptCount: 0,
        attempts: [],
        lastAttemptDate: new Date(),
        needsRetry: true,
      };

      processedExercises.push(newEx);
      console.log("[exerciseProcessor] Added exercise without answer:", newEx.question);
    }
  }

  return processedExercises;
};
