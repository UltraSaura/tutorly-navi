
import { ApiKey, ModelOption, Subject } from '@/types/admin';

// Context interface
export interface AdminContextType {
  apiKeys: ApiKey[];
  addApiKey: (key: Omit<ApiKey, 'id' | 'createdAt'>) => void;
  deleteApiKey: (id: string) => void;
  testApiKeyConnection: (id: string) => Promise<boolean>;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  getAvailableModels: () => ModelOption[];
  
  // Subject management
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  toggleSubjectActive: (id: string) => void;
  getActiveSubjects: () => Subject[];
}
