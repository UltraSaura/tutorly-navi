import { createContext, useContext, ReactNode } from 'react';
import { AdminContextType } from './AdminContextType';
import { useAiModelManagementSecure } from '@/hooks/useAiModelManagementSecure';
import { useModelManagement } from '@/hooks/useModelManagement';
import { useSubjectManagement } from '@/hooks/useSubjectManagement';
import { usePromptManagement } from '@/hooks/usePromptManagement';

// Create context
const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Provider component
export const AdminProvider = ({ children }: { children: ReactNode }) => {
  // Use secure database-based API key management instead of localStorage
  const secureApiManagement = useAiModelManagementSecure();
  const subjectManagement = useSubjectManagement();
  const promptManagement = usePromptManagement();

  // Convert secure API keys to the expected ApiKey format
  const mappedApiKeys = secureApiManagement.apiKeys.map(key => ({
    id: key.id,
    name: key.name,
    provider: secureApiManagement.providers.find(p => p.id === key.provider_id)?.name || 'Unknown',
    key: key.key_value.substring(0, 5) + '••••••••••••••••••••••••••••••••••',
    createdAt: new Date(key.created_at)
  }));

  const modelManagement = useModelManagement(mappedApiKeys);

  return (
    <AdminContext.Provider value={{ 
      // Use the mapped API keys
      apiKeys: mappedApiKeys,
      addApiKey: async (keyData: any) => {
        const provider = secureApiManagement.providers.find(p => p.name === keyData.provider);
        if (provider) {
          await secureApiManagement.addApiKey(provider.id, keyData.name, keyData.key);
        }
      },
      deleteApiKey: secureApiManagement.deleteApiKey,
      testApiKeyConnection: async (id: string) => {
        // Mock implementation for compatibility
        return true;
      },
      ...modelManagement,
      ...subjectManagement,
      activePromptTemplate: promptManagement.getActiveTemplate('explanation')
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
export type { ApiKey, ModelOption, Subject } from '@/types/admin';
