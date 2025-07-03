import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ApiKey } from '@/types/admin';
import { DEFAULT_API_KEYS } from '@/data/adminDefaults';

export const useApiKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    return savedKeys ? JSON.parse(savedKeys, (key, value) => {
      // Convert string dates back to Date objects
      if (key === 'createdAt' || key === 'lastUsed') {
        return value ? new Date(value) : undefined;
      }
      return value;
    }) : DEFAULT_API_KEYS;
  });

  // Save API keys to localStorage when they change
  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Add a new API key
  const addApiKey = (key: Omit<ApiKey, 'id' | 'createdAt'>) => {
    const newKey: ApiKey = {
      ...key,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    
    setApiKeys([...apiKeys, newKey]);
    toast.success('API key added successfully');
  };

  // Delete an API key
  const deleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
    toast.success('API key deleted successfully');
  };

  // Test API key connection (mock implementation)
  const testApiKeyConnection = async (id: string) => {
    // Mock implementation - simulate API call
    const key = apiKeys.find(k => k.id === id);
    if (!key) return false;
    
    // Update lastUsed
    setApiKeys(apiKeys.map(k => 
      k.id === id ? { ...k, lastUsed: new Date() } : k
    ));
    
    // Simulate test success for now
    return true;
  };

  return {
    apiKeys,
    addApiKey,
    deleteApiKey,
    testApiKeyConnection
  };
};