import { PromptTemplate } from '@/types/admin';

export type PromptUsageType = PromptTemplate['usage_type'];

export const PROMPT_USAGE_TYPES: PromptUsageType[] = [
  'chat',
  'grading',
  'explanation',
  'math_enhanced',
  'grouped_problem_extraction',
  'grouped_problem_grading',
  'grouped_retry_practice',
];

export const PROMPT_USAGE_LABELS: Record<PromptUsageType, string> = {
  chat: 'Chat',
  grading: 'Grading',
  explanation: 'Explanation',
  math_enhanced: 'Math Enhanced',
  grouped_problem_extraction: 'Problem Extraction',
  grouped_problem_grading: 'Problem Grading',
  grouped_retry_practice: 'Problem Explanation',
};

export const getPromptUsageLabel = (usageType: string) =>
  PROMPT_USAGE_LABELS[usageType as PromptUsageType] || usageType;

export const getPromptTemplateDisplayName = (template: Pick<PromptTemplate, 'name' | 'usage_type'>) => {
  if (template.usage_type === 'grouped_retry_practice' && template.name === 'Grouped Retry Practice Explanation') {
    return 'Problem Explanation';
  }

  return template.name;
};
