import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AiProvider {
  id: string;
  name: string;
  api_base_url: string;
  is_active: boolean;
}

interface AiModel {
  id: string;
  provider_id: string;
  name: string;
  model_id: string;
  capabilities: string[];
  is_active: boolean;
}

interface AiApiKey {
  id: string;
  provider_id: string;
  name: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAiModelManagementSecure = () => {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [apiKeys, setApiKeys] = useState<AiApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all providers
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
      toast.error('Failed to fetch AI providers');
    }
  };

  // Fetch all models
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
      toast.error('Failed to fetch AI models');
    }
  };

  // Fetch API keys (admin only)
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
      // Don't show error toast here as non-admin users won't have access
    }
  };

  // Add new API key (admin only) - Now uses encrypted Vault storage
  const addApiKey = async (providerId: string, name: string, keyValue: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'add',
          providerId,
          name,
          keyValue
        }
      });

      if (error) throw error;
      
      toast.success('API key added successfully and encrypted');
      await fetchApiKeys(); // Refresh the list
    } catch (error) {
      console.error('Error adding API key:', error);
      toast.error('Failed to add API key');
    }
  };

  // Delete API key (admin only) - soft delete and removes from vault
  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-api-keys', {
        body: {
          action: 'delete',
          keyId
        }
      });

      if (error) throw error;
      
      toast.success('API key deleted successfully');
      await fetchApiKeys(); // Refresh the list
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  // Get models by provider
  const getModelsByProvider = (providerId: string) => {
    return models.filter(model => model.provider_id === providerId);
  };

  // Get API keys by provider
  const getApiKeysByProvider = (providerId: string) => {
    return apiKeys.filter(key => key.provider_id === providerId);
  };

  // Initialize data fetching
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProviders(),
        fetchModels(),
        fetchApiKeys()
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, []);

  const refetch = () => {
    fetchProviders();
    fetchModels();
    fetchApiKeys();
  };

  return {
    providers,
    models,
    apiKeys,
    loading,
    addApiKey,
    deleteApiKey,
    getModelsByProvider,
    getApiKeysByProvider,
    refetch
  };
};