import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🚀 ${req.method} request to ai-chat function at ${new Date().toISOString()}`);
  console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));

  try {
    // Parse request body with detailed logging
    const requestText = await req.text();
    console.log('📥 Raw request received, length:', requestText.length);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(requestText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { 
      message, 
      modelId, 
      history = [], 
      isGradingRequest = false, 
      isUnified = false,
      language = 'en',
      customPrompt,
      userContext
    } = parsedBody;
    
    console.log('📊 Request analysis:', { 
      modelId, 
      messageLength: message?.length,
      historyLength: history?.length,
      isExercise,
      isGradingRequest,
      isUnified,
      language,
      hasCustomPrompt: !!customPrompt,
      hasUserContext: !!userContext
    });

    // Validate required parameters
    if (!message || !modelId) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: message or modelId',
          received: { hasMessage: !!message, hasModelId: !!modelId }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Detect if this is an exercise request (only if not using unified approach)
    let isExercise = false;
    if (!isUnified) {
      isExercise = !isGradingRequest && detectExercise(message);
    }
    console.log('🧮 Exercise detection:', { isGradingRequest, isExercise, isUnified });

    // Get model configuration
    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      console.error('❌ Unsupported model:', modelId);
      return new Response(
        JSON.stringify({ 
          error: `Unsupported model: ${modelId}`,
          supportedModels: ['gpt-5', 'gpt-4.1', 'deepseek-chat', 'claude-3-5-sonnet-20241022']
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('⚙️ Model configuration:', modelConfig);

    // Get API key for the provider
    const apiKey = getApiKeyForProvider(modelConfig.provider);
    if (!apiKey) {
      console.error('❌ API key not found for provider:', modelConfig.provider);
      const availableKeys = [
        'OPENAI_API_KEY', 
        'DEEPSEEK_API_KEY', 
        'ANTHROPIC_API_KEY', 
        'GOOGLE_API_KEY'
      ].filter(key => Deno.env.get(key));
      
      console.log('🔑 Available API keys:', availableKeys);
      
      return new Response(
        JSON.stringify({ 
          error: `Missing API key for ${modelConfig.provider}`,
          details: `The model "${modelId}" requires a ${modelConfig.provider} API key to be configured in Supabase Secrets. Please add the ${modelConfig.provider.toUpperCase().replace(' ', '_')}_API_KEY to your project secrets.`,
          provider: modelConfig.provider,
          modelId: modelId,
          availableProviders: availableKeys.map(key => key.replace('_API_KEY', ''))
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔑 API key found for provider:', modelConfig.provider);
    
    // Generate system message - use unified template if requested
    let usageType = 'chat';
    if (isUnified) {
      usageType = 'unified_math_chat';
    } else if (isGradingRequest) {
      usageType = 'grading';
    } else if (isExercise) {
      usageType = 'chat';
    }

    let systemMessage = await generateSystemMessage(
      isExercise, 
      isGradingRequest, 
      language, 
      customPrompt,
      userContext,
      usageType
    );
    
    // Enhance system message for math problems if needed
    if (!isGradingRequest && modelConfig.provider === 'OpenAI') {
      systemMessage = enhanceSystemMessageForMath(systemMessage, message);
    }
    
    console.log('📝 System message generated, length:', systemMessage.content?.length || 0);
    
    // Format history messages based on provider
    const formattedHistory = formatHistoryForProvider(history, modelConfig.provider);
    const formattedSystemMessage = formatSystemMessageForProvider(systemMessage, modelConfig.provider);
    
    console.log('📚 Formatted history count:', formattedHistory.length);
    
    // Call the appropriate API based on the provider
    console.log(`🔄 Calling ${modelConfig.provider} API with model: ${modelConfig.model}`);
    let responseContent;
    
    const apiStartTime = Date.now();
    try {
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
      
      const apiEndTime = Date.now();
      console.log(`✅ ${modelConfig.provider} API success, response time: ${apiEndTime - apiStartTime}ms`);
      
    } catch (providerError) {
      const apiEndTime = Date.now();
      console.error(`❌ ${modelConfig.provider} API failed after ${apiEndTime - apiStartTime}ms:`, providerError);
      throw providerError;
    }
    
    console.log('📤 Returning successful response, content length:', responseContent?.length || 0);
    
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
    console.error('❌ Error in AI chat function:', {
      error: (error as Error).message || String(error),
      stack: (error as Error).stack,
      name: (error as Error).name,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced error response with more details
    let errorMessage = (error as Error).message || String(error);
    let statusCode = 500;
    
    // Categorize errors for better user experience
    if (errorMessage.includes('API key')) {
      statusCode = 401;
    } else if (errorMessage.includes('model') || errorMessage.includes('Unsupported')) {
      statusCode = 400;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        statusCode
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
