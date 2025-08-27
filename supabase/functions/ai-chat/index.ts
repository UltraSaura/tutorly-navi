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

// Import system prompt utilities
import {
  generateSystemMessage,
  enhanceSystemMessageForMath
} from './utils/systemPrompts.ts';

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
    const { 
      message, 
      modelId, 
      history = [], 
      isGradingRequest = false, 
      language = 'en',
      customPrompt,
      userContext
    } = await req.json();
    
    console.log(`Processing request with model: ${modelId}`);
    console.log('Is grading request:', isGradingRequest);
    
    // Detect if this is a homework/exercise question
    const isExercise = !isGradingRequest && detectExercise(message);
    console.log('Is exercise:', isExercise);
    
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
    
    // Generate the appropriate system message based on context (now async)
    let systemMessage = await generateSystemMessage(isExercise, isGradingRequest, language, customPrompt, userContext);
    
    // Enhance system message for math problems if needed
    if (!isGradingRequest && modelConfig.provider === 'OpenAI') {
      systemMessage = enhanceSystemMessageForMath(systemMessage, message);
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
        throw new Error(`Provider not implemented: ${modelConfig.provider}`);
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
