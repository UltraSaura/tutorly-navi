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

  const [selectedModelId, setSelectedModelIdState] = useState<string>(() => {
    const savedModel = localStorage.getItem('selectedModelId');
    
    console.log('[ModelManagement] Initial load - saved model:', savedModel);
    console.log('[ModelManagement] Available API keys:', apiKeys.map(k => k.provider));
    
    // Only migrate truly invalid model IDs, don't force OpenAI models
    const legacyMigrations: Record<string, string> = {
      'gpt-5-2025-08-07': 'gpt-5', // Fix invalid date format only
    };
    
    const migratedModel = savedModel && legacyMigrations[savedModel] ? legacyMigrations[savedModel] : savedModel;
    const finalModel = migratedModel || getDefaultAvailableModel();
    
    console.log('[ModelManagement] Final selected model:', finalModel);
    return finalModel;
  });

  // Save selected model to localStorage when it changes
  useEffect(() => {
    console.log('[ModelManagement] Saving model to localStorage:', selectedModelId);
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
    setSelectedModelId: (id: string) => {
      console.log('[ModelManagement] Model selection changing from', selectedModelId, 'to', id);
      setSelectedModelIdState(id);
    },
    getAvailableModels
  };
};