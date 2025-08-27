
// Utility functions for AI chat

// Helper function to detect if a message is likely an exercise or homework problem
export function detectExercise(message: string): boolean {
  const exerciseKeywords = ['solve', 'calculate', 'find', 'homework', 'exercise', 'problem', 'question', 'assignment'];
  const lowerMessage = message.toLowerCase();
  
  // Add detection for mathematical patterns
  const mathPattern = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(message);
  
  return exerciseKeywords.some(keyword => lowerMessage.includes(keyword)) || mathPattern;
}

// Helper function to get model configuration based on modelId
export function getModelConfig(modelId: string) {
  const modelMap: Record<string, { provider: string; model: string }> = {
    // Latest OpenAI models
    'gpt-5': { provider: 'OpenAI', model: 'gpt-5-2025-08-07' },
    'gpt-5-mini': { provider: 'OpenAI', model: 'gpt-5-mini-2025-08-07' },
    'gpt-5-nano': { provider: 'OpenAI', model: 'gpt-5-nano-2025-08-07' },
    'gpt-4.1': { provider: 'OpenAI', model: 'gpt-4.1-2025-04-14' },
    'gpt-4.1-mini': { provider: 'OpenAI', model: 'gpt-4.1-mini-2025-04-14' },
    'o3': { provider: 'OpenAI', model: 'o3-2025-04-16' },
    'o4-mini': { provider: 'OpenAI', model: 'o4-mini-2025-04-16' },
    // Legacy OpenAI models
    'gpt4o': { provider: 'OpenAI', model: 'gpt-4o' },
    'gpt-4o-mini': { provider: 'OpenAI', model: 'gpt-4o-mini' },
    'chat': { provider: 'OpenAI', model: 'gpt-4.1-2025-04-14' },
    // Other providers
    'gemini-pro': { provider: 'Google', model: 'gemini-pro' },
    'claude-3': { provider: 'Anthropic', model: 'claude-3-opus-20240229' },
    'claude-sonnet-4': { provider: 'Anthropic', model: 'claude-sonnet-4-20250514' },
    'claude-opus-4': { provider: 'Anthropic', model: 'claude-opus-4-20250514' },
    'claude-haiku-3.5': { provider: 'Anthropic', model: 'claude-3-5-haiku-20241022' },
    'mistral-large': { provider: 'Mistral AI', model: 'mistral-large-latest' },
    'deepseek-coder': { provider: 'DeepSeek', model: 'deepseek-coder' },
    'deepseek-chat': { provider: 'DeepSeek', model: 'deepseek-chat' },
    'grok-1': { provider: 'xAI', model: 'grok-1' },
    'grok-2': { provider: 'xAI', model: 'grok-2' },
    // Default to latest GPT-4.1
    'default': { provider: 'OpenAI', model: 'gpt-4.1-2025-04-14' }
  };
  
  return modelMap[modelId] || modelMap.default;
}

// Helper function to get API key for a provider
export function getApiKeyForProvider(provider: string): string | null {
  const keys: Record<string, string | undefined> = {
    'OpenAI': Deno.env.get('OPENAI_API_KEY'),
    'Anthropic': Deno.env.get('ANTHROPIC_API_KEY'),
    'Mistral AI': Deno.env.get('MISTRAL_API_KEY'),
    'Google': Deno.env.get('GOOGLE_API_KEY'),
    'DeepSeek': Deno.env.get('DEEPSEEK_API_KEY'),
    'xAI': Deno.env.get('XAI_API_KEY')
  };
  
  return keys[provider] || null;
}

// Helper function to format history messages based on provider
export function formatHistoryForProvider(history: any[], provider: string) {
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
export function formatSystemMessageForProvider(systemMessage: any, provider: string) {
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
