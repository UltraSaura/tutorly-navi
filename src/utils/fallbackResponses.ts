
import { Message } from '@/types/chat';

/**
 * Generates fallback response when AI service fails
 */
export const generateFallbackResponse = (inputMessage: string): Message => {
  return {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: `I understand you're asking about ${inputMessage.substring(0, 20)}... Let me help with that! If you'd like to submit this as an exercise or homework to work on, click the "Submit as Exercise" button below.`,
    timestamp: new Date(),
  };
};
