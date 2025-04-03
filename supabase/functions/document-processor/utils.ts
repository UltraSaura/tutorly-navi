
// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get API keys from environment variables
export const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
export const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
