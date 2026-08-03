
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/types/chat';
import { toast } from 'sonner';

/**
 * Formats message history for API calls
 */
export const getMessageHistory = (messages: Message[]) => {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system')
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
};

/**
 * Sends a message to the AI service and returns the response
 */
export const sendMessageToAI = async (
  inputMessage: string,
  messages: Message[],
  selectedModelId: string,
  language: string = 'en',
  customPrompt?: string,
  userContext?: Record<string, unknown>
) => {
  try {
    const messageHistory = getMessageHistory(messages);

    const requestBody = {
      message: inputMessage,
      modelId: selectedModelId,
      history: messageHistory,
      language,
      customPrompt,
      userContext: {
        ...userContext,
        response_language: language === 'fr' ? 'French' : 'English'
      }
    };

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: requestBody
    });

    if (error) {
      return { data: null, error };
    }

    if (!data) {
      return { data: null, error: new Error('AI function returned no data') };
    }
    
    // Show activated model as a toast with actual model used from response
    const actualModel = data?.modelUsed || selectedModelId;
    const provider = data?.provider ? `${data.provider} • ` : '';
    
    // Normalize model names for comparison to avoid false positives
    const normalizeModelName = (model: string): string => {
      return model.replace(/-2025-\d{2}-\d{2}$/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
    };
    
    const normalizedSelected = normalizeModelName(selectedModelId);
    const normalizedActual = normalizeModelName(actualModel);
    
    // Only warn if the base model names are truly different
    if (normalizedSelected !== normalizedActual && data?.modelId !== selectedModelId) {
      toast.error(`Model mismatch! Selected ${selectedModelId} but backend used ${actualModel}. Please check admin settings.`);
    } else {
      toast.success(`Response generated using ${provider}${actualModel}`);
    }
    
    return { data, error: null };

  } catch (error: unknown) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    return { data: null, error: typedError };
  }
};
