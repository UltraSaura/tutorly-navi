
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
  userContext?: any
) => {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: inputMessage,
        modelId: selectedModelId,
        history: getMessageHistory(messages),
        language,
        customPrompt,
        userContext,
      },
    });
    
    if (error) {
      console.error('Error calling AI chat function:', error);
      throw new Error(error.message || 'Failed to get AI response');
    }
    
    // Show activated model as a toast with actual model used from response
    const actualModel = data?.metadata?.modelUsed || selectedModelId;
    console.log('[DEBUG] Using activated model:', selectedModelId, 'Actual model used:', actualModel);
    toast.success(`Response generated using ${actualModel}`);
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in AI chat:', error);
    
    // Provide more specific error handling
    if (error.message?.includes('API key not configured') || error.message?.includes('OpenAI API error')) {
      toast.error(`OpenAI API key issue detected. The key has been updated and should work now. Please try again.`);
    } else if (error.message?.includes('Failed to get AI response')) {
      toast.error('AI service temporarily unavailable. Please try again in a moment.');
    } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
      toast.error('Network issue detected. Please check your connection and try again.');
    } else {
      toast.error(`AI service error: ${error.message || 'Unknown error'}. Please try again.`);
    }
    
    return { data: null, error };
  }
};
