
// Types for the admin section
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

// Define the User interface for use with Supabase
export interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  country?: string | null;
  phone_number?: string | null;
  level?: string | null;
  style?: string | null;
  user_type: 'student' | 'parent';
  created_at: string;
  updated_at: string;
  // Virtual properties for UI
  activity?: {
    day: string;
    minutes: number;
  }[];
  subjects?: {
    name: string;
    progress: number;
  }[];
  children?: User[];
}

// Define the Subject interface for subject management
export interface Subject {
  id: string;
  name: string;
  active: boolean;
  description?: string;
  icon?: string;
  category?: string;
  order?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  prompt_content: string;  // Changed from 'prompt' to match database
  tags: string[];
  is_active: boolean;  // Changed from 'isActive' to match database
  created_at: Date;
  updated_at: Date;
  usage_type: 'chat' | 'grading' | 'explanation' | 'math_enhanced';
  auto_activate: boolean;
  priority: number;
}

// Define the NewPromptTemplate type for creating new templates
export type NewPromptTemplate = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>;

// Subject-Prompt Assignment interface
export interface SubjectPromptAssignment {
  id: string;
  subject_id: string;
  prompt_template_id: string;
  usage_type: string;
  is_primary: boolean;
  created_at: Date;
}
