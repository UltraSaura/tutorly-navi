
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Import provider-specific implementations
import { callOpenAI } from './providers/openai.ts';
import { callAnthropic } from './providers/anthropic.ts';
import { callMistral } from './providers/mistral.ts';
import { callGoogle } from './providers/google.ts';
import { callDeepSeek } from './providers/deepseek.ts';
import { callXAI } from './providers/xai.ts';

// Import utility functions
import { 
  detectExercise, 
  getModelConfig, 
  getApiKeyForProvider,
  formatHistoryForProvider,
  formatSystemMessageForProvider
} from './utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request
    const { message, modelId, history = [] } = await req.json();
    
    console.log(`Processing request with model: ${modelId}`);
    
    // Detect if this is a homework/exercise question
    const isExercise = detectExercise(message);
    
    // Check if this is a grading request
    const isGradingRequest = message.includes("I need you to grade this");
    
    // Determine which model to use and which API to call
    const modelConfig = getModelConfig(modelId);
    
    if (!modelConfig) {
      throw new Error(`Unsupported model ID: ${modelId}`);
    }
    
    console.log(`Using provider: ${modelConfig.provider}, model: ${modelConfig.model}`);
    
    // Check if we have the API key for the selected provider
    const apiKey = getApiKeyForProvider(modelConfig.provider);
    
    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${modelConfig.provider}`);
    }
    
    // Prepare the chat messages
    let systemMessage = {
      role: 'system',
      content: 'You are StudyWhiz, an educational AI tutor. You help students understand concepts, solve problems, and learn new subjects. Be friendly, concise, and educational in your responses. Prioritize explaining concepts clearly rather than just giving answers.'
    };
    
    // If this is an exercise, enhance the system prompt
    if (isExercise) {
      systemMessage = {
        role: 'system',
        content: 'You are StudyWhiz, an educational AI tutor specializing in exercises and homework. When a student submits a homework question or exercise, format your response clearly, presenting the problem at the beginning followed by guidance on how to solve it without giving away the full answer. If you are evaluating a student\'s answer, clearly indicate whether it is correct or incorrect and provide a detailed explanation why.'
      };
    }
    
    // If this is a grading request, use a specific system prompt
    if (isGradingRequest) {
      systemMessage = {
        role: 'system',
        content: 'You are StudyWhiz, an educational AI tutor specializing in grading homework and exercises. Format your response with "**Problem:**" at the beginning followed by the problem statement, and then "**Guidance:**" followed by your detailed explanation. Clearly state CORRECT or INCORRECT at the beginning of your guidance. Be thorough but concise in your explanation.'
      };
    }
    
    // Format history messages based on provider
    const formattedHistory = formatHistoryForProvider(history, modelConfig.provider);
    const formattedSystemMessage = formatSystemMessageForProvider(systemMessage, modelConfig.provider);
    
    // Call the appropriate API based on the provider
    let responseContent;
    switch (modelConfig.provider) {
      case 'OpenAI':
        responseContent = await callOpenAI(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          modelConfig.model, 
          isExercise
        );
        break;
      case 'Anthropic':
        responseContent = await callAnthropic(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          modelConfig.model, 
          isExercise
        );
        break;
      case 'Mistral AI':
        responseContent = await callMistral(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          modelConfig.model, 
          isExercise
        );
        break;
      case 'Google':
        responseContent = await callGoogle(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          modelConfig.model, 
          isExercise
        );
        break;
      case 'DeepSeek':
        responseContent = await callDeepSeek(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          modelConfig.model, 
          isExercise
        );
        break;
      case 'xAI':
        responseContent = await callXAI(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          modelConfig.model, 
          isExercise
        );
        break;
      default:
        // Fallback to OpenAI if provider is not implemented
        console.log(`Fallback to OpenAI for provider: ${modelConfig.provider}`);
        responseContent = await callOpenAI(
          formattedSystemMessage, 
          formattedHistory, 
          message, 
          'gpt-3.5-turbo', 
          isExercise
        );
        break;
    }
    
    // Return the AI's response
    return new Response(
      JSON.stringify({ 
        content: responseContent,
        modelId: modelId,
        modelUsed: modelConfig.model,
        provider: modelConfig.provider,
        isExercise: isExercise,
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
