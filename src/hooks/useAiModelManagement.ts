import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AiProvider {
  id: string;
  name: string;
  api_base_url: string;
  is_active: boolean;
}

export interface AiModel {
  id: string;
  provider_id: string;
  name: string;
  model_id: string;
  context_window?: number;
  max_tokens?: number;
  capabilities: string[];
  is_active: boolean;
}

export interface AiApiKey {
  id: string;
  provider_id: string;
  name: string;
  key_value: string;
  is_active: boolean;
}

export const useAiModelManagement = () => {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [apiKeys, setApiKeys] = useState<AiApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_model_providers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load AI providers');
    }
  };

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to load AI models');
    }
  };

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_model_keys')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    }
  };

  const addApiKey = async (providerId: string, name: string, keyValue: string) => {
    try {
      const { error } = await supabase
        .from('ai_model_keys')
        .insert({
          provider_id: providerId,
          name,
          key_value: keyValue,
          is_active: true
        });
      
      if (error) throw error;
      
      toast.success('API key added successfully');
      await fetchApiKeys();
    } catch (error) {
      console.error('Error adding API key:', error);
      toast.error('Failed to add API key');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('ai_model_keys')
        .update({ is_active: false })
        .eq('id', keyId);
      
      if (error) throw error;
      
      toast.success('API key deleted successfully');
      await fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const getModelsByProvider = (providerId: string) => {
    return models.filter(model => model.provider_id === providerId);
  };

  const getApiKeysByProvider = (providerId: string) => {
    return apiKeys.filter(key => key.provider_id === providerId);
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        fetchProviders(),
        fetchModels(),
        fetchApiKeys()
      ]);
      setLoading(false);
    };

    initialize();
  }, []);

  return {
    providers,
    models,
    apiKeys,
    loading,
    addApiKey,
    deleteApiKey,
    getModelsByProvider,
    getApiKeysByProvider,
    refetch: async () => {
      await Promise.all([
        fetchProviders(),
        fetchModels(),
        fetchApiKeys()
      ]);
    }
  };
};