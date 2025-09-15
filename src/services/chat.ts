import { supabase } from "@/integrations/supabase/client";

export async function callChatFromServer(payload: {
  text: string;
  response_language?: "fr" | "en";
  modelId: string;
}) {
  // This calls your existing chat endpoint: supabase/functions/ai-chat/index.ts
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: payload.text,
      modelId: payload.modelId,
      history: [],
      language: payload.response_language || 'en',
    },
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to get AI response');
  }
  
  return { data, error: null };
}