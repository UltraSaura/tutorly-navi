
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
    console.log("Skipping duplicate homework submission");
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
    console.log("Couldn't extract homework components from the message");
    return null;
  }

  // Check for duplicates
  const existingExercise = existingExercises.find(
    ex => ex.question === question && ex.userAnswer === answer
  );

  if (existingExercise) {
    console.log("This question-answer pair already exists");
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

  try {
    return await evaluateHomework(newEx);
  } catch (error) {
    console.error('Error evaluating homework:', error);
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
    console.log("Couldn't extract question from user message");
    return exercises;
  }

  const exerciseIndex = exercises.findIndex(ex => ex.question === question);

  if (exerciseIndex === -1) {
    console.log("Couldn't find exercise for this message");
    return exercises;
  }

  const updatedExercises = [...exercises];
  const exercise = updatedExercises[exerciseIndex];

  if (!exercise.relatedMessages) {
    exercise.relatedMessages = [];
  }

  if (!exercise.relatedMessages.some(msg => msg.id === aiMessage.id)) {
    exercise.relatedMessages.push(aiMessage);
  }

  console.log(`Linked AI message ${aiMessage.id} to exercise with question "${question}"`);
  return updatedExercises;
};
