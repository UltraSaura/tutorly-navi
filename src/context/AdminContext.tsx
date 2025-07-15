import { createContext, useContext, ReactNode } from 'react';
import { AdminContextType } from './AdminContextType';
import { useApiKeyManagement } from '@/hooks/useApiKeyManagement';
import { useModelManagement } from '@/hooks/useModelManagement';
import { useSubjectManagement } from '@/hooks/useSubjectManagement';
import { usePromptTemplateManagement } from '@/hooks/usePromptTemplateManagement';

// Create context
const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Provider component
export const AdminProvider = ({ children }: { children: ReactNode }) => {
  // Use custom hooks for each concern
  const apiKeyManagement = useApiKeyManagement();
  const modelManagement = useModelManagement(apiKeyManagement.apiKeys);
  const subjectManagement = useSubjectManagement();
  const promptTemplateManagement = usePromptTemplateManagement();

  return (
    <AdminContext.Provider value={{ 
      ...apiKeyManagement,
      ...modelManagement,
      ...subjectManagement,
      activePromptTemplate: promptTemplateManagement.activePromptTemplate
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
