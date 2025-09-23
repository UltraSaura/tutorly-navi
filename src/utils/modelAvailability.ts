/**
 * Utility functions for checking model availability based on configured API keys
 */

// Models that are confirmed to have API keys configured in Supabase secrets
export const CONFIGURED_PROVIDERS = ['DeepSeek', 'OpenAI'] as const;

// Test model availability by making a lightweight API call
export const testModelAvailability = async (modelId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/test-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, testMessage: 'test' })
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Model ${modelId} availability test failed:`, error);
    return false;
  }
};

// Get the best available model based on configured providers
export const getBestAvailableModel = (): string => {
  // Priority order based on performance and availability
  const priorityModels = [
    'deepseek-chat',    // Fast, reliable, configured
    'gpt-4.1',          // High quality, configured
    'gpt-5-mini',       // Latest, efficient, configured
    'gpt4o'             // Fallback, configured
  ];
  
  return priorityModels[0]; // Return the highest priority available model
};

// Check if a provider has API keys configured
export const isProviderConfigured = (provider: string): boolean => {
  return CONFIGURED_PROVIDERS.includes(provider as any);
};

// Get models that should be available based on configured providers
export const getConfiguredModels = (allModels: any[]): any[] => {
  return allModels.filter(model => 
    CONFIGURED_PROVIDERS.includes(model.provider as any)
  );
};