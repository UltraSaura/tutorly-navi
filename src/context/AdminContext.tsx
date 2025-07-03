import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { ApiKey, ModelOption, Subject } from '@/types/admin';
import { AdminContextType } from './AdminContextType';
import { DEFAULT_API_KEYS, AVAILABLE_MODELS } from '@/data/adminDefaults';

// Default subjects
const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', active: true, icon: 'calculator', category: 'STEM', order: 0 },
  { id: 'physics', name: 'Physics', active: true, icon: 'atom', category: 'STEM', order: 1 },
  { id: 'chemistry', name: 'Chemistry', active: true, icon: 'flask-conical', category: 'STEM', order: 2 },
  { id: 'biology', name: 'Biology', active: true, icon: 'dna', category: 'STEM', order: 3 },
  { id: 'english', name: 'English', active: true, icon: 'book-open', category: 'Languages', order: 0 },
  { id: 'history', name: 'History', active: true, icon: 'landmark', category: 'Humanities', order: 0 },
  { id: 'geography', name: 'Geography', active: true, icon: 'globe', category: 'Humanities', order: 1 },
  { id: 'french', name: 'French', active: true, icon: 'languages', category: 'Languages', order: 1 },
  { id: 'spanish', name: 'Spanish', active: true, icon: 'languages', category: 'Languages', order: 2 },
  { id: 'computer-science', name: 'Computer Science', active: true, icon: 'code', category: 'STEM', order: 4 }
];

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

  // State for subjects
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const savedSubjects = localStorage.getItem('subjects');
    return savedSubjects ? JSON.parse(savedSubjects) : DEFAULT_SUBJECTS;
  });

  // State for selected subject
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => {
    const savedSubject = localStorage.getItem('selectedSubject');
    return savedSubject ? JSON.parse(savedSubject) : null;
  });

  // Save API keys to localStorage when they change
  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedModelId', selectedModelId);
  }, [selectedModelId]);

  // Save subjects to localStorage when they change
  useEffect(() => {
    localStorage.setItem('subjects', JSON.stringify(subjects));
  }, [subjects]);

  // Save selected subject to localStorage when it changes
  useEffect(() => {
    if (selectedSubject) {
      localStorage.setItem('selectedSubject', JSON.stringify(selectedSubject));
    }
  }, [selectedSubject]);

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
    
    // Priority providers that might be configured in Supabase secrets
    const priorityProviders = ['OpenAI', 'DeepSeek'];
    
    // Log for debugging
    console.log("Available providers:", availableProviders);
    
    // Filter models based on available providers
    return AVAILABLE_MODELS.map(model => {
      const hasLocalProvider = availableProviders.some(
        provider => provider === model.provider
      );
      
      // Consider priority providers as potentially available via Supabase secrets
      const isPriorityProvider = priorityProviders.includes(model.provider);
      const isAvailable = hasLocalProvider || isPriorityProvider;
      
      console.log(`Model: ${model.name}, Provider: ${model.provider}, Available: ${isAvailable}`);
      
      return {
        ...model,
        // Only disable models that aren't priority providers and don't have local keys
        disabled: !isAvailable
      };
    });
  };

  // Subject management functions
  const addSubject = (subject: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...subject,
      id: subject.name.toLowerCase().replace(/\s+/g, '-'),
    };
    
    setSubjects([...subjects, newSubject]);
    toast.success(`Subject ${subject.name} added successfully`);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, ...updates } : subject
    ));
    toast.success(`Subject updated successfully`);
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
    toast.success(`Subject deleted successfully`);
  };

  const toggleSubjectActive = (id: string) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, active: !subject.active } : subject
    ));
    
    const subject = subjects.find(s => s.id === id);
    if (subject) {
      toast.success(`${subject.name} is now ${!subject.active ? 'active' : 'inactive'}`);
    }
  };

  const getActiveSubjects = () => {
    return subjects.filter(subject => subject.active);
  };

  return (
    <AdminContext.Provider value={{ 
      apiKeys, 
      addApiKey, 
      deleteApiKey, 
      testApiKeyConnection,
      selectedModelId,
      setSelectedModelId,
      getAvailableModels,
      subjects,
      addSubject,
      updateSubject,
      deleteSubject,
      toggleSubjectActive,
      getActiveSubjects,
      selectedSubject,
      setSelectedSubject
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
export type { ApiKey, ModelOption, Subject };
