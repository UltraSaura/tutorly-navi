
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { ApiKey, ModelOption } from '@/types/admin';
import { AdminContextType } from './AdminContextType';
import { DEFAULT_API_KEYS, AVAILABLE_MODELS } from '@/data/adminDefaults';

// Create context
const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Provider component
export const AdminProvider = ({ children }: { children: ReactNode }) => {
  // State for API keys
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

  // State for selected model
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    const savedModel = localStorage.getItem('selectedModelId');
    return savedModel || 'gpt4o';
  });

  // Save API keys to localStorage when they change
  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedModelId', selectedModelId);
  }, [selectedModelId]);

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

  // Get filtered list of available models based on API keys
  const getAvailableModels = () => {
    // Get list of providers we have API keys for
    const availableProviders = [...new Set(apiKeys.map(key => key.provider))];
    
    // Filter models based on available providers
    return AVAILABLE_MODELS.map(model => ({
      ...model,
      // Flag models where we don't have an API key
      disabled: !availableProviders.includes(model.provider)
    }));
  };

  return (
    <AdminContext.Provider value={{ 
      apiKeys, 
      addApiKey, 
      deleteApiKey, 
      testApiKeyConnection,
      selectedModelId,
      setSelectedModelId,
      getAvailableModels
    }}>
      {children}
    </AdminContext.Provider>
  );
};

// Hook for using the admin context
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// Re-export types for convenience
export type { ApiKey, ModelOption };
