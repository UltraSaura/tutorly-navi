import { PromptTemplate } from '@/types/admin';

export type PromptUsageType = PromptTemplate['usage_type'];

export const PROMPT_USAGE_TYPES: PromptUsageType[] = [
  'chat',
  'grading',
  'grouped_problem_extraction',
  'grouped_problem_grading',
  'grouped_retry_practice',
  'lesson_generation',
];

export const PROMPT_USAGE_LABELS: Record<PromptUsageType, string> = {
  chat: 'Chat Assistant',
  grading: 'Exercise Grading',
  explanation: 'Explanation',
  math_enhanced: 'Math Enhanced',
  grouped_problem_extraction: 'Problem Extraction',
  grouped_problem_grading: 'Problem Grading',
  grouped_retry_practice: 'Problem Explanation',
  lesson_generation: 'Lesson Generation',
};


export const PROMPT_USAGE_DESCRIPTIONS: Partial<Record<PromptUsageType, string>> = {
  chat: 'General tutoring conversations and exercise assistance across subjects.',
  grading: 'Grades individual exercise answers when automatic grading needs AI assistance.',
  grouped_problem_extraction: 'Reads homework and preserves its grouped questions and shared context.',
  grouped_problem_grading: 'Grades submitted answers within a grouped homework problem.',
  grouped_retry_practice: 'Creates explanations and lesson content for a selected question in grouped homework. Single-exercise explanations and animation captions are managed in the app code.',
  lesson_generation: 'Creates curriculum lessons. This is separate from the lesson view inside an exercise explanation.',
};

export const getPromptUsageLabel = (usageType: string) =>
  PROMPT_USAGE_LABELS[usageType as PromptUsageType] || usageType;

export const getPromptTemplateDisplayName = (template: Pick<PromptTemplate, 'name' | 'usage_type'>) => {
  if (template.usage_type === 'grouped_retry_practice' && template.name === 'Grouped Retry Practice Explanation') {
    return 'Problem Explanation';
  }

  return template.name;
};
