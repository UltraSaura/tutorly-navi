import { useState, useEffect } from 'react';
import { ApiKey, ModelOption } from '@/types/admin';
import { AVAILABLE_MODELS } from '@/data/adminDefaults';

export const useModelManagement = (apiKeys: ApiKey[]) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    const savedModel = localStorage.getItem('selectedModelId');
    return savedModel || 'deepseek-chat';
  });

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedModelId', selectedModelId);
  }, [selectedModelId]);

  // Get filtered list of available models based on API keys
  const getAvailableModels = () => {
    // Get list of providers we have API keys for
    const availableProviders = [...new Set(apiKeys.map(key => key.provider))];
    
    // Priority providers that might be configured in Supabase secrets
    const priorityProviders = ['OpenAI', 'DeepSeek'];
    
    // Log for debugging
    console.log("Available providers:", availableProviders);
    
    // Filter models based on available providers
    return AVAILABLE_MODELS.map(model => {
      const hasLocalProvider = availableProviders.some(
        provider => provider === model.provider
      );
      
      // Consider priority providers as potentially available via Supabase secrets
      const isPriorityProvider = priorityProviders.includes(model.provider);
      const isAvailable = hasLocalProvider || isPriorityProvider;
      
      console.log(`Model: ${model.name}, Provider: ${model.provider}, Available: ${isAvailable}`);
      
      return {
        ...model,
        // Only disable models that aren't priority providers and don't have local keys
        disabled: !isAvailable
      };
    });
  };

  return {
    selectedModelId,
    setSelectedModelId,
    getAvailableModels
  };
};