
import { Exercise, Message } from '@/types/chat';
import { toast } from 'sonner';
import { evaluateHomework } from '@/services/homeworkGrading';
import { extractHomeworkFromMessage } from '@/utils/homeworkExtraction';

export const processNewExercise = async (
  message: string,
  existingExercises: Exercise[],
  processedContent: Set<string>
): Promise<Exercise | null> => {
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
  } else {
    const extracted = extractHomeworkFromMessage(message);
    question = extracted.question;
    answer = extracted.answer;
  }

  if (!question || !answer) {
    console.log("[exerciseProcessor] Couldn't extract homework components from the message:", { message, question, answer });
    return null;
  }

  // Check for duplicates
  const existingExercise = existingExercises.find(
    ex => ex.question === question && ex.userAnswer === answer
  );

  if (existingExercise) {
    console.log("[exerciseProcessor] This question-answer pair already exists:", question, answer);
    return null;
  }

  // Create and evaluate new exercise
  const newEx: Exercise = {
    id: Date.now().toString(),
    question,
    userAnswer: answer,
    expanded: false,
    relatedMessages: [],
  };

  console.log("[exerciseProcessor] Created new exercise:", newEx);

  try {
    const gradedExercise = await evaluateHomework(newEx);
    console.log("[exerciseProcessor] Graded exercise returned:", gradedExercise);
    return gradedExercise;
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
