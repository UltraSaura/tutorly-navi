import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Types
export interface ApiKey {
  id: string;
  name: string;
  provider: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  contextWindow: number;
  pricing: string;
  performance: {
    speed: number;
    quality: number;
    reasoning: number;
  };
  bestFor: string[];
  disabled?: boolean;
}

// Context interface
interface AdminContextType {
  apiKeys: ApiKey[];
  addApiKey: (key: Omit<ApiKey, 'id' | 'createdAt'>) => void;
  deleteApiKey: (id: string) => void;
  testApiKeyConnection: (id: string) => Promise<boolean>;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  getAvailableModels: () => ModelOption[];
}

// Create context
const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Default API Keys
const DEFAULT_API_KEYS: ApiKey[] = [
  {
    id: '1',
    name: 'OpenAI Production',
    provider: 'OpenAI',
    key: 'sk-1234••••••••••••••••••••••••••••••••••',
    createdAt: new Date(2023, 5, 15),
    lastUsed: new Date(2023, 6, 14),
  },
  {
    id: '2',
    name: 'Google Gemini',
    provider: 'Google',
    key: 'AIza••••••••••••••••••••••••••••••••••••',
    createdAt: new Date(2023, 5, 10),
    lastUsed: new Date(2023, 6, 12),
  },
];

// Default models
const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most advanced multimodal model with vision and audio capabilities',
    capabilities: ['Text generation', 'Image understanding', 'Code generation', 'Reasoning'],
    contextWindow: 128000,
    pricing: '$0.01 / 1K tokens',
    performance: {
      speed: 85,
      quality: 95,
      reasoning: 90,
    },
    bestFor: ['Complex tutoring scenarios', 'Image-based homework help', 'Detailed explanations'],
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Powerful multimodal model with strong reasoning capabilities',
    capabilities: ['Text generation', 'Image understanding', 'Code generation'],
    contextWindow: 32000,
    pricing: '$0.0025 / 1K tokens',
    performance: {
      speed: 90,
      quality: 85,
      reasoning: 80,
    },
    bestFor: ['Math problem solving', 'Science explanations', 'Cost-effective tutoring'],
  },
  {
    id: 'claude-3',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Excellent at nuanced instructions and long-form content',
    capabilities: ['Text generation', 'Image understanding', 'Detailed explanations'],
    contextWindow: 200000,
    pricing: '$0.015 / 1K tokens',
    performance: {
      speed: 75,
      quality: 90,
      reasoning: 95,
    },
    bestFor: ['Essay feedback', 'Detailed concept explanations', 'Research assistance'],
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    description: 'Efficient model with strong reasoning at a lower cost',
    capabilities: ['Text generation', 'Code assistance', 'Structured output'],
    contextWindow: 32000,
    pricing: '$0.0035 / 1K tokens',
    performance: {
      speed: 88,
      quality: 82,
      reasoning: 85,
    },
    bestFor: ['Basic tutoring tasks', 'Quick answers', 'Budget-friendly option'],
  },
];

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
    // Include all models for now, but in a real implementation
    // you might want to filter based on available API keys
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
