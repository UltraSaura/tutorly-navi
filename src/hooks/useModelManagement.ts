import { useState, useEffect } from 'react';
import { ApiKey, ModelOption } from '@/types/admin';
import { AVAILABLE_MODELS } from '@/data/adminDefaults';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useModelManagement = (apiKeys: ApiKey[]) => {
  // ADD THESE TWO STATE VARIABLES
  const [modelFunctions, setModelFunctions] = useState<Record<string, 'default' | 'fallback_primary' | 'fallback_secondary' | null>>({});
  const [loading, setLoading] = useState(true);

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

  // ADD THIS NEW FUNCTION
  const fetchModelFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('model_id, model_function')
        .eq('is_active', true)
        .not('model_function', 'is', null);
      
      if (error) throw error;
      
      const functions: Record<string, 'default' | 'fallback_primary' | 'fallback_secondary' | null> = {};
      data?.forEach(model => {
        const internalId = AVAILABLE_MODELS.find(m => m.id.includes(model.model_id) || model.model_id.includes(m.id))?.id;
        if (internalId && model.model_function) {
          functions[internalId] = model.model_function as 'default' | 'fallback_primary' | 'fallback_secondary';
        }
      });
      
      setModelFunctions(functions);
    } catch (error) {
      console.error('Error fetching model functions:', error);
    } finally {
      setLoading(false);
    }
  };

  // ADD THIS NEW FUNCTION
  const setModelFunction = async (modelId: string, functionType: 'default' | 'fallback_primary' | 'fallback_secondary' | null) => {
    try {
      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      if (!model) {
        toast.error('Model not found');
        return;
      }

      const { data: dbModel, error: fetchError } = await supabase
        .from('ai_models')
        .select('id, model_id')
        .ilike('name', model.name)
        .eq('is_active', true)
        .single();

      if (fetchError || !dbModel) {
        console.error('Model not found in database:', fetchError);
        toast.error('Model not found in database');
        return;
      }

      const { error } = await supabase
        .from('ai_models')
        .update({ model_function: functionType })
        .eq('id', dbModel.id);

      if (error) throw error;

      setModelFunctions(prev => ({
        ...prev,
        [modelId]: functionType
      }));

      const functionLabel = functionType === 'default' ? 'Default Model' :
                           functionType === 'fallback_primary' ? 'Primary Fallback' :
                           functionType === 'fallback_secondary' ? 'Secondary Fallback' : 'Unassigned';
      
      toast.success(`Model set as ${functionLabel}`);
      await fetchModelFunctions();
    } catch (error) {
      console.error('Error setting model function:', error);
      toast.error('Failed to update model function');
    }
  };

  // ADD THIS useEffect
  useEffect(() => {
    fetchModelFunctions();
  }, []);

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

  // MODIFY getAvailableModels to include modelFunction
  const getAvailableModels = () => {
    const configuredProviders = ['DeepSeek', 'OpenAI'];
    
    return AVAILABLE_MODELS.map(model => {
      const hasSupabaseSecret = configuredProviders.includes(model.provider);
      const hasLocalApiKey = apiKeys.some(key => key.provider === model.provider);
      const isAvailable = hasSupabaseSecret || hasLocalApiKey;
      
      return {
        ...model,
        disabled: !isAvailable,
        usesSupabaseSecret: hasSupabaseSecret && !hasLocalApiKey,
        modelFunction: modelFunctions[model.id] || null
      };
    })
    .sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
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
    getAvailableModels,
    setModelFunction,
    modelFunctions,
    loading
  };
};