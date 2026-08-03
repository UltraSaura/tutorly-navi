import { Message } from '@/types/chat';
import { supabase } from "@/integrations/supabase/client";
import { saveGradedWorkToHistory } from './gradedWorkHistory';

/**
 * Extract answer from user input (e.g., "2+2=4" -> "4")
 */
function extractAnswer(message: string): string | null {
  const answerMatch = message.match(/=\s*([^=]+)$/);
  if (answerMatch) {
    return answerMatch[1].trim();
  }
  return null;
}

/**
 * Remove answer portion from question
 */
function extractQuestion(message: string): string {
  return message.replace(/=\s*[^=]+$/, '').trim();
}

/**
 * Detect subject from question content
 */
function detectSubject(message: string): string | null {
  const msg = message.toLowerCase();
  
  if (msg.includes('integral') || msg.includes('derivative') || msg.includes('calculus')) {
    return 'calculus';
  }
  if (msg.includes('algebra') || msg.includes('equation') || msg.includes('solve for')) {
    return 'algebra';
  }
  if (msg.includes('geometry') || msg.includes('triangle') || msg.includes('circle')) {
    return 'geometry';
  }
  
  return 'mathematics';
}

/**
 * Extract the correct answer from the solution text
 */
function extractCorrectAnswerFromSolution(solutionText: string): string | null {
  if (!solutionText) return null;
  
  // Look for common answer patterns
  const patterns = [
    /=\s*([0-9]+(?:[.,][0-9]+)?)/,              // = 42 or = 3.14
    /Answer:\s*([^\n]+)/i,                       // Answer: 42
    /Result:\s*([^\n]+)/i,                       // Result: 42
    /Quotient\s*=\s*([0-9]+)/i,                  // Quotient = 12
    /Solution:\s*([^\n]+)/i,                     // Solution: 42
  ];
  
  for (const pattern of patterns) {
    const match = solutionText.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

export interface UnifiedChatResponse {
  content: string;
  isMath: boolean;
  isCorrect?: boolean;
  needsRetry?: boolean;
  hasAnswer: boolean;
  confidence: number;
}

/**
 * Unified chat service - simplified to just forward to AI
 * AI now handles all math detection, grading, and formatting
 */
export async function sendUnifiedMessage(
  inputMessage: string,
  messages: Message[],
  selectedModelId: string,
  language: string = 'en',
  customPrompt?: string,
  userContext?: Record<string, unknown>
): Promise<{ data: UnifiedChatResponse | null; error: unknown }> {
  try {
    // Format message history for AI
    const messageHistory = messages
      .filter(msg => ['user', 'assistant', 'system'].includes(msg.role))
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // Just forward to AI - it handles everything
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: inputMessage,
        modelId: selectedModelId,
        history: messageHistory,
        language,
        customPrompt,
        userContext: {
          ...userContext,
          response_language: language === 'fr' ? 'French' : 'English'
        },
        isUnified: true
      },
    });

    if (error) {
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: 'No data received from AI service' };
    }

    if (!data?.content) {
      return { data: null, error: 'No content received from AI service' };
    }

    // Use server-parsed structured fields instead of unreliable regex
    const response: UnifiedChatResponse = {
      content: data.content,
      isMath: data.isMath ?? !data.content.includes('NOT_MATH'),
      isCorrect: data.isCorrect ?? undefined,
      needsRetry: data.isCorrect === false,
      hasAnswer: /=\s*[^=]*$/.test(inputMessage),
      confidence: data.content.includes('NOT_MATH') ? 95 : 85
    };

    // Auto-save math exercises to history for guardian tracking
    if (response.isMath && response.hasAnswer) {
      const question = extractQuestion(inputMessage);
      const answer = extractAnswer(inputMessage);
      const subject = detectSubject(question);
      
      // Save asynchronously without blocking response
      saveGradedWorkToHistory({
        exerciseContent: question,
        userAnswer: answer,
        isCorrect: response.isCorrect ?? null,
        subjectId: subject,
      }).catch(err => console.error('[UnifiedChatService] Failed to auto-save exercise:', err));
    }
    
    return { data: response, error: null };

  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Generate fallback response when service fails
 */
export function generateUnifiedFallback(message: string, language: string = 'en'): UnifiedChatResponse {
  const fallbackContent = language === 'fr'
    ? "Je ne peux pas traiter votre demande en ce moment. Veuillez réessayer plus tard."
    : "I'm unable to process your request at the moment. Please try again later.";

  return {
    content: fallbackContent,
    isMath: false,
    confidence: 0,
    hasAnswer: false
  };
}
