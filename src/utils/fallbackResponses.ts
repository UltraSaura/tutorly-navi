
import { Message } from '@/types/chat';

/**
 * Generates fallback response when AI service fails
 */
export const generateFallbackResponse = (inputMessage: string): Message => {
  // Check if this looks like an exercise submission
  const isExerciseSubmission = inputMessage.toLowerCase().includes('answer') || 
    inputMessage.includes('=') || 
    inputMessage.toLowerCase().includes('solution') ||
    inputMessage.toLowerCase().includes('solve');
  
  const baseResponse = isExerciseSubmission 
    ? `I see you're submitting an exercise. The AI service is temporarily unavailable, but I can still help process your submission.`
    : `I understand your question about "${inputMessage.substring(0, 30)}...". The AI service encountered an issue, but I'm here to help.`;
  
  return {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: `${baseResponse} If you'd like to submit this as an exercise for grading, click the "Submit as Exercise" button below.`,
    timestamp: new Date(),
  };
};
