import { Message } from '@/types/chat';
import { supabase } from "@/integrations/supabase/client";

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
  userContext?: any
): Promise<{ data: UnifiedChatResponse | null; error: any }> {
  try {
    console.log('[UnifiedChatService] Sending message to AI:', { inputMessage, selectedModelId });

    // Format message history for AI
    const messageHistory = messages
      .filter(msg => ['user', 'assistant', 'system'].includes(msg.role))
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    console.log('[UnifiedChatService] Calling ai-chat with body:', {
      message: inputMessage,
      modelId: selectedModelId,
      historyLength: messageHistory.length,
      language,
      isUnified: true
    });

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

    console.log('[UnifiedChatService] Raw response from ai-chat:', { data, error, hasData: !!data, hasError: !!error });

    if (error) {
      console.error('[UnifiedChatService] AI service error:', error);
      return { data: null, error };
    }

    if (!data) {
      console.error('[UnifiedChatService] No data in response');
      return { data: null, error: 'No data received from AI service' };
    }

    console.log('[UnifiedChatService] Data structure:', {
      hasContent: !!data?.content,
      contentType: typeof data?.content,
      contentLength: data?.content?.length,
      dataKeys: Object.keys(data)
    });

    if (!data?.content) {
      console.error('[UnifiedChatService] No content in response:', data);
      return { data: null, error: 'No content received from AI service' };
    }

    // Simple parsing - AI is smart enough to structure its own response
    const response: UnifiedChatResponse = {
      content: data.content,
      isMath: !data.content.includes('NOT_MATH'),
      isCorrect: /\bCORRECT\b/i.test(data.content) ? true : (/\bINCORRECT\b/i.test(data.content) ? false : undefined),
      needsRetry: /\bINCORRECT\b/i.test(data.content),
      hasAnswer: /=\s*[^=]*$/.test(inputMessage),
      confidence: data.content.includes('NOT_MATH') ? 95 : 85
    };
    
    console.log('[UnifiedChatService] Response parsed successfully:', {
      isMath: response.isMath,
      isCorrect: response.isCorrect,
      hasAnswer: response.hasAnswer,
      contentPreview: response.content.substring(0, 200)
    });
    
    return { data: response, error: null };

  } catch (error) {
    console.error('[UnifiedChatService] Caught error:', error);
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
