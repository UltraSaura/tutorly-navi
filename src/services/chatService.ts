
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
      
      // Handle specific API key errors
      if (error.message?.includes('Missing API key')) {
        toast.error(`API Key Missing`, {
          description: `The selected model requires an API key. Please configure it in Admin Settings.`,
          action: {
            label: "Open Admin",
            onClick: () => window.location.href = "/admin"
          }
        });
      } else {
        toast.error('Failed to get AI response', {
          description: error.message || 'Unknown error occurred'
        });
      }
      
      throw new Error(error.message || 'Failed to get AI response');
    }
    
    if (!data || data.error) {
      console.error('Error from ai-chat function:', data?.error, data);
      
      // Check for missing API key errors
      if (data?.error?.includes('Missing API key')) {
        toast.error(`${data.error}`, {
          description: data.details || `Please configure the API key for ${data.provider || 'the selected provider'} in Admin Settings.`,
          action: {
            label: "Open Admin",
            onClick: () => window.location.href = "/admin"
          }
        });
      } else if (data?.error?.includes('model') && data?.error?.includes('not available')) {
        toast.error(`Model not available: ${selectedModelId}`, {
          description: `The selected model may not be available. Check your API key configuration.`,
          action: {
            label: "Open Admin",
            onClick: () => window.location.href = "/admin"
          }
        });
      } else {
        toast.error('Failed to get AI response', {
          description: data?.error || 'Unknown error occurred'
        });
      }
      
      throw new Error(data?.error || 'Failed to get AI response');
    }
    
    // Show activated model as a toast with actual model used from response
    const actualModel = data?.modelUsed || selectedModelId;
    const provider = data?.provider ? `${data.provider} • ` : '';
    console.log('[DEBUG] Using activated model:', selectedModelId, 'Actual model used:', `${provider}${actualModel}`);
    
    // Normalize model names for comparison to avoid false positives
    const normalizeModelName = (model: string): string => {
      return model.replace(/-2025-\d{2}-\d{2}$/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
    };
    
    const normalizedSelected = normalizeModelName(selectedModelId);
    const normalizedActual = normalizeModelName(actualModel);
    
    // Only warn if the base model names are truly different
    if (normalizedSelected !== normalizedActual && data?.modelId !== selectedModelId) {
      console.warn('[MODEL MISMATCH] Selected:', selectedModelId, 'Actually used:', actualModel);
      toast.error(`Model mismatch! Selected ${selectedModelId} but backend used ${actualModel}. Please check admin settings.`);
    } else {
      toast.success(`Response generated using ${provider}${actualModel}`);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in AI chat:', error);
    
    // Provide more specific error handling
    if (error.message?.includes('API key not configured')) {
      toast.error('API key not configured for the selected provider. Please add the key in Admin > Model Selection.');
    } else if (error.message?.includes('Provider not implemented')) {
      toast.error('Selected provider is not yet implemented. Please choose another model.');
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
