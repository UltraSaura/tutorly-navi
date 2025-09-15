import { supabase } from "@/integrations/supabase/client";

export async function callChatFromServer(payload: {
  text: string;
  response_language?: "fr" | "en";
}) {
  // This calls your existing chat endpoint: supabase/functions/ai-chat/index.ts
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: payload.text,
      modelId: 'gpt-4o', // Default model, should be passed from context
      history: [],
      language: payload.response_language || 'en',
    },
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to get AI response');
  }
  
  return { data, error: null };
}