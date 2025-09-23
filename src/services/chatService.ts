
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
  console.log('🚀 Starting AI request:', {
    modelId: selectedModelId,
    messageLength: inputMessage.length,
    historyLength: messages.length,
    timestamp: new Date().toISOString()
  });

  try {
    const messageHistory = getMessageHistory(messages);
    
    console.log('📤 Formatted message history:', {
      count: messageHistory.length,
      roles: messageHistory.map(m => m.role)
    });

    // First attempt: Use Supabase client
    console.log('🔄 Attempting Supabase client request...');
    
    const requestBody = {
      message: inputMessage,
      modelId: selectedModelId,
      history: messageHistory,
      language,
      customPrompt,
      userContext
    };

    console.log('📋 Request payload preview:', {
      modelId: requestBody.modelId,
      messageLength: requestBody.message.length,
      historyCount: requestBody.history.length
    });

    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: requestBody
    });

    if (error) {
      console.error('❌ Supabase function error:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Try direct fallback
      console.log('🔄 Attempting direct HTTP fallback...');
      return await attemptDirectFallback(requestBody);
    }

    if (!data) {
      console.error('❌ No data received from Supabase client');
      return await attemptDirectFallback(requestBody);
    }

    console.log('✅ Supabase client success:', data);
    
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

  } catch (error: any) {
    console.error('❌ Supabase client failed:', {
      error,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Fallback to direct HTTP
    console.log('🔄 Attempting direct HTTP fallback due to client error...');
    const requestBody = {
      message: inputMessage,
      modelId: selectedModelId,
      history: getMessageHistory(messages),
      language,
      customPrompt,
      userContext
    };
    
    return await attemptDirectFallback(requestBody);
  }
};

// Direct HTTP fallback function
const attemptDirectFallback = async (requestBody: any) => {
  try {
    console.log('🌐 Making direct HTTP request...');
    
    const response = await fetch('https://sibprjxhbxahouejygeu.supabase.co/functions/v1/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYnByanhoYnhhaG91ZWp5Z2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Njk3NzcsImV4cCI6MjA1ODE0NTc3N30.EeWA7wiqiSsZF_WXO_GDELanejenEeqg6MRZpToNnWM`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Direct HTTP response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Direct HTTP error response:', errorText);
      
      // Handle specific error types with enhanced error messages
      if (response.status === 500 && errorText.includes('API key')) {
        toast.error(`API Key Missing`, {
          description: `The selected model requires an API key. Please configure it in Supabase secrets.`,
          action: {
            label: "Open Secrets",
            onClick: () => window.open('https://supabase.com/dashboard/project/sibprjxhbxahouejygeu/settings/functions', '_blank')
          }
        });
      } else if (response.status === 400 && errorText.includes('model')) {
        toast.error(`Model Unavailable`, {
          description: `The selected model is not available. Please choose a different model.`,
          action: {
            label: "Select Model",
            onClick: () => window.location.href = "/admin"
          }
        });
      } else {
        toast.error(`Service Error (${response.status})`, {
          description: `${response.statusText}. Please try again or select a different model.`
        });
      }
      
      return { data: null, error: new Error(`HTTP ${response.status}: ${errorText}`) };
    }

    const data = await response.json();
    console.log('✅ Direct HTTP success:', data);
    
    // Show success toast for direct fallback
    const actualModel = data?.modelUsed || requestBody.modelId;
    const provider = data?.provider ? `${data.provider} • ` : '';
    toast.success(`Response generated using ${provider}${actualModel} (direct connection)`);
    
    return { data, error: null };

  } catch (directError: any) {
    console.error('❌ Direct HTTP fallback failed:', {
      error: directError,
      message: directError.message,
      stack: directError.stack
    });
    
    // Final error handling with specific guidance
    if (directError.message?.includes('Failed to fetch') || directError.message?.includes('NetworkError')) {
      toast.error('Connection Failed', {
        description: 'Unable to reach AI service. Check your internet connection and firewall settings.',
        action: {
          label: "Test Connection",
          onClick: () => window.location.href = "/admin/diagnostics"
        }
      });
    } else if (directError.message?.includes('timeout')) {
      toast.error('Request Timed Out', {
        description: 'The AI service is taking too long to respond. Please try again.'
      });
    } else {
      toast.error('Service Unavailable', {
        description: 'AI service is currently unavailable. Please try again later.'
      });
    }
    
    return { data: null, error: directError };
  }
};
