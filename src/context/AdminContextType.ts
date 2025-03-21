
import { ApiKey, ModelOption } from '@/types/admin';

// Context interface
export interface AdminContextType {
  apiKeys: ApiKey[];
  addApiKey: (key: Omit<ApiKey, 'id' | 'createdAt'>) => void;
  deleteApiKey: (id: string) => void;
  testApiKeyConnection: (id: string) => Promise<boolean>;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  getAvailableModels: () => ModelOption[];
}
