import { useState, useEffect } from 'react';
import { ApiKey, ModelOption } from '@/types/admin';
import { AVAILABLE_MODELS } from '@/data/adminDefaults';

export const useModelManagement = (apiKeys: ApiKey[]) => {
  // Helper function to get default available model based on Supabase secrets
  const getDefaultAvailableModel = () => {
    // DeepSeek is now the primary default - fast, reliable, cost-effective
    const priorityModels = [
      'deepseek-chat',    // Primary choice - DEEPSEEK_API_KEY configured, optimized for tutoring
      'gpt-4.1',          // Backup - OPENAI_API_KEY configured  
      'gpt-5-mini',       // Backup - OPENAI_API_KEY configured
      'gpt4o'             // Last resort - OPENAI_API_KEY configured
    ];
    
    // Check if any priority model exists in available models
    const availableModel = AVAILABLE_MODELS.find(model => 
      priorityModels.includes(model.id)
    );
    
    return availableModel?.id || 'deepseek-chat'; // Always fallback to DeepSeek
  };

  const [selectedModelId, setSelectedModelIdState] = useState<string>(() => {
    const savedModel = localStorage.getItem('selectedModelId');
    
    console.log('[ModelManagement] Initial load - saved model:', savedModel);
    console.log('[ModelManagement] Available API keys:', apiKeys.map(k => k.provider));
    
    // Force migration from GPT models to DeepSeek for better compatibility and performance
    const legacyMigrations: Record<string, string> = {
      'gpt-5-2025-08-07': 'deepseek-chat', // Fix invalid date format
      'gpt-4.1': 'deepseek-chat',          // Migrate GPT-4.1 to DeepSeek
      'gpt-5-mini': 'deepseek-chat',       // Migrate GPT-5-mini to DeepSeek  
      'gpt4o': 'deepseek-chat',            // Migrate GPT-4o to DeepSeek
      'gpt-4': 'deepseek-chat',            // Migrate GPT-4 to DeepSeek
      'gpt-3.5-turbo': 'deepseek-chat',   // Migrate GPT-3.5 to DeepSeek
    };
    
    // Force DeepSeek as default - clear any non-DeepSeek selection
    if (savedModel && savedModel !== 'deepseek-chat') {
      console.log('[ModelManagement] Forcing migration from', savedModel, 'to deepseek-chat');
      localStorage.removeItem('selectedModelId');
      localStorage.setItem('selectedModelId', 'deepseek-chat');
      return 'deepseek-chat';
    }
    
    // If no saved model, default to DeepSeek
    const finalModel = savedModel || 'deepseek-chat';
    
    console.log('[ModelManagement] Final selected model:', finalModel);
    return finalModel;
  });

  // Save selected model to localStorage when it changes
  useEffect(() => {
    console.log('[ModelManagement] Saving model to localStorage:', selectedModelId);
    localStorage.setItem('selectedModelId', selectedModelId);
  }, [selectedModelId]);

  // Get filtered list of available models based on Supabase secrets
  const getAvailableModels = () => {
    // Models that have API keys configured in Supabase secrets
    const configuredProviders = ['DeepSeek', 'OpenAI']; // Based on DEEPSEEK_API_KEY and OPENAI_API_KEY
    
    // Log for debugging
    console.log("Configured providers in Supabase:", configuredProviders);
    
    // Filter and enhance models based on configured providers
    return AVAILABLE_MODELS.map(model => {
      const hasSupabaseSecret = configuredProviders.includes(model.provider);
      const hasLocalApiKey = apiKeys.some(key => key.provider === model.provider);
      
      // Model is available if it has either a Supabase secret or local API key
      const isAvailable = hasSupabaseSecret || hasLocalApiKey;
      
      console.log(`Model: ${model.name}, Provider: ${model.provider}, Supabase Secret: ${hasSupabaseSecret}, Local Key: ${hasLocalApiKey}, Available: ${isAvailable}`);
      
      return {
        ...model,
        disabled: !isAvailable,
        usesSupabaseSecret: hasSupabaseSecret && !hasLocalApiKey
      };
    })
    .sort((a, b) => {
      // Sort available models first, then by priority
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      
      // Prioritize DeepSeek and OpenAI models
      const aPriority = ['DeepSeek', 'OpenAI'].includes(a.provider) ? 0 : 1;
      const bPriority = ['DeepSeek', 'OpenAI'].includes(b.provider) ? 0 : 1;
      return aPriority - bPriority;
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