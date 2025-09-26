import { Message } from '@/types/chat';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

export interface UnifiedChatResponse {
  content: string;
  isMath: boolean;
  isCorrect?: boolean;
  needsRetry?: boolean;
  hasAnswer: boolean;
  confidence: number;
}

/**
 * Unified chat service that handles math detection, education, and grading in one AI call
 */
export async function sendUnifiedMessage(
  inputMessage: string,
  messages: Message[],
  selectedModelId: string,
  language: string = 'en',
  customPrompt?: string,
  userContext?: any
): Promise<{ data: UnifiedChatResponse | null; error: any }> {
  try {
    console.log('[UnifiedChatService] Sending unified message:', { inputMessage, selectedModelId });

    // Format message history for AI
    const messageHistory = messages
      .filter(msg => ['user', 'assistant', 'system'].includes(msg.role))
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // Call the AI with unified prompt template (unified_math_chat usage type)
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: inputMessage,
        modelId: selectedModelId,
        history: messageHistory,
        language,
        customPrompt,
        userContext,
        isUnified: true // Flag to use unified_math_chat template
      },
    });

    if (error) {
      console.error('[UnifiedChatService] AI service error:', error);
      return { data: null, error };
    }

    if (!data?.content) {
      console.error('[UnifiedChatService] No content in response:', data);
      return { data: null, error: 'No content received from AI service' };
    }

    // Parse the unified response
    const unifiedResponse = parseUnifiedResponse(data.content, inputMessage);
    
    console.log('[UnifiedChatService] Parsed unified response:', unifiedResponse);
    
    return { data: unifiedResponse, error: null };

  } catch (error) {
    console.error('[UnifiedChatService] Error in unified chat:', error);
    return { data: null, error };
  }
}

/**
 * Parse the unified AI response to extract all necessary information
 */
function parseUnifiedResponse(content: string, originalMessage: string): UnifiedChatResponse {
  console.log('[UnifiedChatService] Parsing response:', content);

  // Check if it's not math
  const isNotMath = content.includes('NOT_MATH');
  
  // Check for grading markers in the response
  const hasGradeMarker = /\b(CORRECT|INCORRECT)\b/i.test(content);
  const isCorrect = /\bCORRECT\b/i.test(content);
  const isIncorrect = /\bINCORRECT\b/i.test(content);
  
  // Check if user provided an answer (looking for = or answer patterns)
  const hasAnswer = /=\s*[^=]*$/.test(originalMessage) || 
                   /answer[:\s]+/i.test(originalMessage) ||
                   /solution[:\s]+/i.test(originalMessage) ||
                   /result[:\s]+/i.test(originalMessage);

  // Determine confidence based on content analysis
  let confidence = 50;
  if (isNotMath) {
    confidence = 95;
  } else if (hasGradeMarker) {
    confidence = 90;
  } else {
    // Math content without grading
    confidence = 85;
  }

  const result: UnifiedChatResponse = {
    content,
    isMath: !isNotMath,
    isCorrect: hasGradeMarker ? isCorrect : undefined,
    needsRetry: hasGradeMarker ? isIncorrect : false,
    hasAnswer,
    confidence
  };

  console.log('[UnifiedChatService] Unified response result:', result);
  return result;
}

/**
 * Generate fallback response when unified service fails
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