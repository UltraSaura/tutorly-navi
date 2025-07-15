import { useState } from 'react';
import { PromptTemplate } from '@/types/admin';

// For now, we'll use the same templates as in SystemPromptConfig
// In a real app, this would be managed in a database
const defaultTemplates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Math Tutor',
    subject: 'Mathematics',
    description: 'Friendly tutor for elementary to high school math',
    prompt: `You are a helpful and patient math tutor for students from elementary to high school level. Explain concepts clearly using simple language and examples. When students are stuck, guide them step by step rather than giving away answers. Use encouraging language and positive reinforcement. For incorrect answers, explain what went wrong and how to improve. Tailor explanations to the student's grade level.`,
    tags: ['math', 'elementary', 'high school', 'algebra', 'geometry'],
    isActive: true,
    lastModified: new Date(2023, 5, 20),
    type: 'tutor'
  },
  {
    id: '2',
    name: 'Science Explainer',
    subject: 'Science',
    description: 'Makes complex science concepts accessible to students',
    prompt: `You are a science educator who makes complex concepts accessible and engaging for K-12 students. Use analogies and real-world examples to explain scientific principles. When discussing theories, distinguish between established scientific consensus and ongoing research. Ask follow-up questions to check understanding and encourage critical thinking. Use age-appropriate language but never talk down to students. For experiments, emphasize safety first.`,
    tags: ['science', 'biology', 'chemistry', 'physics', 'environmental'],
    isActive: false,
    lastModified: new Date(2023, 5, 18),
    type: 'tutor'
  },
  {
    id: '3',
    name: 'Personalized Learning Assistant',
    subject: 'All Subjects',
    description: 'Adaptive tutor that uses student information for personalized learning',
    prompt: `You are {{first_name}}'s personal learning assistant. You are helping a {{student_level}} student from {{country}}. Adapt your teaching style to {{learning_style}} learning preferences when possible. 

Always address the student by their name ({{first_name}}) to create a personal connection. Tailor your explanations to be appropriate for {{student_level}} curriculum standards in {{country}}. 

When explaining concepts:
- Use examples relevant to {{country}} culture and context
- Adjust complexity for {{student_level}} understanding
- Apply {{learning_style}} teaching methods when appropriate

Be encouraging, patient, and celebrate progress. Ask follow-up questions to check understanding.`,
    tags: ['personalized', 'adaptive', 'variables', 'all subjects'],
    isActive: false,
    lastModified: new Date(2023, 5, 15),
    type: 'tutor'
  }
];

export const usePromptTemplateManagement = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>(defaultTemplates);

  const getActiveTemplate = (): PromptTemplate | null => {
    return templates.find(template => template.isActive) || null;
  };

  const setActiveTemplate = (templateId: string) => {
    setTemplates(templates.map(template => ({
      ...template,
      isActive: template.id === templateId,
    })));
  };

  const addTemplate = (template: Omit<PromptTemplate, 'id' | 'isActive' | 'lastModified'>) => {
    const newTemplate: PromptTemplate = {
      ...template,
      id: Date.now().toString(),
      isActive: false,
      lastModified: new Date(),
    };
    setTemplates([...templates, newTemplate]);
  };

  const updateTemplate = (id: string, updates: Partial<PromptTemplate>) => {
    setTemplates(templates.map(template => 
      template.id === id 
        ? { ...template, ...updates, lastModified: new Date() }
        : template
    ));
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(template => template.id !== id));
  };

  return {
    templates,
    activePromptTemplate: getActiveTemplate(),
    setActiveTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
};