import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API keys from environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
const xaiApiKey = Deno.env.get('XAI_API_KEY');

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

// Helper function to detect if a message is likely an exercise or homework problem
function detectExercise(message: string): boolean {
  const exerciseKeywords = ['solve', 'calculate', 'find', 'homework', 'exercise', 'problem', 'question', 'assignment'];
  const lowerMessage = message.toLowerCase();
  
  return exerciseKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Helper function to get model configuration based on modelId
function getModelConfig(modelId: string) {
  const modelMap: Record<string, { provider: string; model: string }> = {
    'gpt4o': { provider: 'OpenAI', model: 'gpt-4o' },
    'gemini-pro': { provider: 'Google', model: 'gemini-pro' },
    'claude-3': { provider: 'Anthropic', model: 'claude-3-opus-20240229' },
    'mistral-large': { provider: 'Mistral AI', model: 'mistral-large-latest' },
    'deepseek-coder': { provider: 'DeepSeek', model: 'deepseek-coder' },
    'deepseek-chat': { provider: 'DeepSeek', model: 'deepseek-chat' },
    'grok-1': { provider: 'xAI', model: 'grok-1' },
    'grok-2': { provider: 'xAI', model: 'grok-2' },
    'chat': { provider: 'OpenAI', model: 'gpt-3.5-turbo' },
    // Default to GPT-3.5 Turbo
    'default': { provider: 'OpenAI', model: 'gpt-3.5-turbo' }
  };
  
  return modelMap[modelId] || modelMap.default;
}

// Helper function to get API key for a provider
function getApiKeyForProvider(provider: string): string | null {
  switch (provider) {
    case 'OpenAI':
      return openAIApiKey || null;
    case 'Anthropic':
      return anthropicApiKey || null;
    case 'Mistral AI':
      return mistralApiKey || null;
    case 'Google':
      return googleApiKey || null;
    case 'DeepSeek':
      return deepseekApiKey || null;
    case 'xAI':
      return xaiApiKey || null;
    default:
      return null;
  }
}

// Helper function to format history messages based on provider
function formatHistoryForProvider(history: any[], provider: string) {
  // For now, most providers use the same format as OpenAI
  // But this function allows for customization per provider
  switch (provider) {
    case 'Anthropic':
      // Anthropic uses a different format
      return history.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
    default:
      // Default OpenAI-like format
      return history;
  }
}

// Helper function to format system message based on provider
function formatSystemMessageForProvider(systemMessage: any, provider: string) {
  // Some providers handle system messages differently
  switch (provider) {
    case 'Anthropic':
      // Anthropic doesn't use system messages in the same way
      return {
        role: 'user',
        content: `${systemMessage.content}\n\nPlease remember these instructions for our conversation.`
      };
    default:
      // Default OpenAI-like format
      return systemMessage;
  }
}

// Implementation for OpenAI API
async function callOpenAI(systemMessage: any, history: any[], userMessage: string, model: string, isExercise: boolean = false): Promise<string> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: userMessage
    }
  ];
  
  // If this is likely an exercise, add a formatting instruction
  if (isExercise) {
    messages.push({
      role: 'system',
      content: 'If this is a homework question or exercise, format your response clearly. Start with the problem statement, then provide guidance without giving away the full answer.'
    });
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Implementation for Anthropic API (Claude)
async function callAnthropic(systemMessage: any, history: any[], userMessage: string, model: string, isExercise: boolean = false): Promise<string> {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }
  
  // Build messages array in Anthropic format
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: isExercise 
        ? `${userMessage}\n\nNote: If this is a homework question, please format your response as an exercise with clear steps.`
        : userMessage
    }
  ];
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 800,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

// Implementation for Mistral AI API
async function callMistral(systemMessage: any, history: any[], userMessage: string, model: string, isExercise: boolean = false): Promise<string> {
  if (!mistralApiKey) {
    throw new Error('Mistral AI API key not configured');
  }
  
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: isExercise
        ? `${userMessage}\n\nNote: If this is a homework question, please format your response as an exercise with clear steps.`
        : userMessage
    }
  ];
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Mistral AI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Implementation for Google API (Gemini)
async function callGoogle(systemMessage: any, history: any[], userMessage: string, model: string, isExercise: boolean = false): Promise<string> {
  if (!googleApiKey) {
    throw new Error('Google API key not configured');
  }
  
  // Google has a different API structure
  const combinedHistory = history.map(msg => msg.content).join("\n");
  const exerciseNote = isExercise ? "\n\nNote: Format this as an educational exercise if it's a homework question." : "";
  
  const promptText = `${systemMessage.content}\n\n${combinedHistory}\n\nUser: ${userMessage}${exerciseNote}\nAssistant:`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: promptText
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Google API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Implementation for DeepSeek API
async function callDeepSeek(systemMessage: any, history: any[], userMessage: string, model: string, isExercise: boolean = false): Promise<string> {
  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured');
  }
  
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: isExercise
        ? `${userMessage}\n\nNote: If this is a homework question, please format your response as an exercise with clear steps.`
        : userMessage
    }
  ];
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`DeepSeek API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Implementation for xAI API (Grok)
async function callXAI(systemMessage: any, history: any[], userMessage: string, model: string, isExercise: boolean = false): Promise<string> {
  if (!xaiApiKey) {
    throw new Error('xAI API key not configured');
  }
  
  const messages = [
    systemMessage,
    ...history,
    {
      role: 'user',
      content: isExercise
        ? `${userMessage}\n\nNote: If this is a homework question, please format your response as an exercise with clear steps.`
        : userMessage
    }
  ];
  
  // xAI endpoint is hypothetical since it's not yet widely available
  const response = await fetch('https://api.xai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${xaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`xAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
