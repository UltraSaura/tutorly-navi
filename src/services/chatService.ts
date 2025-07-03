
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
  selectedModelId: string
) => {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: inputMessage,
        modelId: selectedModelId,
        history: getMessageHistory(messages),
      },
    });
    
    if (error) {
      console.error('Error calling AI chat function:', error);
      throw new Error(error.message || 'Failed to get AI response');
    }
    
    // Show model used as a toast
    toast.success(`Response generated using ${data.provider} ${data.modelUsed}`);
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in AI chat:', error);
    
    // Check if the error is related to missing API keys
    if (error.message?.includes('API key not configured')) {
      toast.error(`API key missing for the selected model. Please configure the API key in Supabase secrets.`);
    } else if (error.message?.includes('Failed to get AI response')) {
      toast.error('AI service temporarily unavailable. Please try again.');
    } else {
      toast.error(`AI service error: ${error.message || 'Unknown error'}. Using fallback response.`);
    }
    
    return { data: null, error };
  }
};
