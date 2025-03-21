
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI API key from environment variable
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request
    const { message, modelId, history = [] } = await req.json();
    
    console.log(`Processing request with model: ${modelId}`);
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Prepare the chat messages
    const messages = [
      {
        role: 'system',
        content: 'You are StudyWhiz, an educational AI tutor. You help students understand concepts, solve problems, and learn new subjects. Be friendly, concise, and educational in your responses. Prioritize explaining concepts clearly rather than just giving answers.'
      },
      ...history,
      {
        role: 'user',
        content: message
      }
    ];
    
    // Determine which model to use based on the modelId
    const modelMap = {
      'gpt4o': 'gpt-4o',
      'gemini-pro': 'gpt-4-turbo', // Fallback since we can't directly use Gemini
      'claude-3': 'gpt-4-turbo',    // Fallback
      'mistral-large': 'gpt-3.5-turbo',
      'chat': 'gpt-3.5-turbo',
      // Default to GPT-3.5 for any other models
      'default': 'gpt-3.5-turbo'
    };
    
    const model = modelMap[modelId] || modelMap.default;
    console.log(`Using OpenAI model: ${model}`);
    
    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      })
    });
    
    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await openAIResponse.json();
    const aiResponse = data.choices[0].message.content;
    
    // Return the AI's response
    return new Response(
      JSON.stringify({ 
        content: aiResponse,
        modelId: modelId,
        modelUsed: model,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in AI chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
