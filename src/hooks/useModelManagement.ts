import { useState, useEffect } from 'react';
import { ApiKey, ModelOption } from '@/types/admin';
import { AVAILABLE_MODELS } from '@/data/adminDefaults';

export const useModelManagement = (apiKeys: ApiKey[]) => {
  // Helper function to get default available model
  const getDefaultAvailableModel = () => {
    const availableProviders = [...new Set(apiKeys.map(key => key.provider))];
    const priorityProviders = ['DeepSeek', 'OpenAI']; // Prioritize DeepSeek over OpenAI
    
    // Find the first available model with an API key or from priority providers
    const availableModel = AVAILABLE_MODELS.find(model => {
      const hasLocalProvider = availableProviders.some(provider => provider === model.provider);
      const isPriorityProvider = priorityProviders.includes(model.provider);
      return hasLocalProvider || isPriorityProvider;
    });
    
    return availableModel?.id || 'deepseek-chat'; // Fallback to DeepSeek model
  };

  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    const savedModel = localStorage.getItem('selectedModelId');
    
    // Migrate legacy model selections to current ones
    const legacyMigrations: Record<string, string> = {
      'gpt4o': 'gpt-4.1',
      'gpt-4o': 'gpt-4.1',
      'gpt-4o-mini': 'gpt-4.1-mini',
      'gpt-5-2025-08-07': 'gpt-5', // Fix invalid model ID
    };
    
    const migratedModel = savedModel && legacyMigrations[savedModel] ? legacyMigrations[savedModel] : savedModel;
    return migratedModel || getDefaultAvailableModel();
  });

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedModelId', selectedModelId);
  }, [selectedModelId]);

  // Get filtered list of available models based on API keys
  const getAvailableModels = () => {
    // Get list of providers we have API keys for
    const availableProviders = [...new Set(apiKeys.map(key => key.provider))];
    
    // Priority providers that are likely configured in Supabase secrets
    const priorityProviders = ['DeepSeek', 'OpenAI']; // Prioritize DeepSeek over OpenAI
    
    // Log for debugging
    console.log("Available providers:", availableProviders);
    console.log("Priority providers:", priorityProviders);
    
    // Filter models based on available providers
    return AVAILABLE_MODELS.map(model => {
      const hasLocalProvider = availableProviders.some(
        provider => provider === model.provider
      );
      
      // Consider priority providers as potentially available via Supabase secrets
      const isPriorityProvider = priorityProviders.includes(model.provider);
      const isAvailable = hasLocalProvider || isPriorityProvider;
      
      console.log(`Model: ${model.name}, Provider: ${model.provider}, Local Key: ${hasLocalProvider}, Priority: ${isPriorityProvider}, Available: ${isAvailable}`);
      
      return {
        ...model,
        // Mark models as potentially unavailable if no local key and not priority
        disabled: !isAvailable,
        // Add a flag to indicate if this is using a Supabase secret
        usesSupabaseSecret: isPriorityProvider && !hasLocalProvider
      };
    });
  };

  return {
    selectedModelId,
    setSelectedModelId,
    getAvailableModels
  };
};