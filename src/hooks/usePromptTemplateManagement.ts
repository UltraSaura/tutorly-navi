import { useState } from 'react';
import { PromptTemplate } from '@/types/admin';

// For now, we'll use the same templates as in SystemPromptConfig
// In a real app, this would be managed in a database
const defaultTemplates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Math Explanation Generator',
    subject: 'Mathematics',
    description: 'Teaches mathematical concepts without solving the student\'s exercise',
    prompt: `You are a patient math tutor. Your job is to TEACH the underlying mathematical concept, NOT to solve the student's exercise.

Guidelines:
- NEVER use the numbers or data from the student's exercise.
- NEVER compute or state the final result of the student's exercise.
- Instead:
  1. Explain the core concept (e.g. Greatest Common Divisor (GCD) or PGCD).
  2. Show ONE worked example using DIFFERENT numbers (or symbols like a/b).
  3. Explain the general method (step-by-step, in text).
  4. Optionally warn about a common mistake.
  5. End with a self-check card that tells the student what to verify.

Output must ALWAYS be valid JSON like:
{"steps":[{"title":"","body":"","icon":"","kind":""}],"meta":{"mode":"concept","revealAnswer":false}}

Rules for steps:
- 3–5 steps maximum.
- Each step:
  • "title": 2–5 words (short label)
  • "body": 1–3 simple sentences, clear and precise
  • "icon": one of ["lightbulb","magnifier","divide","checklist","warning","target"]
  • "kind": one of ["concept","example","strategy","pitfall","check"]
- Example MUST use different numbers (e.g. 18/24 instead of the student's fraction) or algebraic symbols (like a/b).
- Do NOT output the student's numbers anywhere.
- No extra text, no markdown, no code fences.

Exercise (for context, DO NOT solve): {{exercise}}
Student answer: {{studentAnswer}}
Subject: {{subject}}
Language: {{language}}
Grade level: {{gradeLevel}}`,
    tags: ['math', 'explanations', 'json', 'structured'],
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
    prompt: `You are {{first_name}}'s personal learning assistant. You are helping a {{grade_level}} student from {{country}}. Adapt your teaching style to {{learning_style}} learning preferences when possible. 

Always address the student by their name ({{first_name}}) to create a personal connection. Tailor your explanations to be appropriate for {{grade_level}} curriculum standards in {{country}}. 

When explaining concepts:
- Use examples relevant to {{country}} culture and context
- Adjust complexity for {{grade_level}} understanding
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