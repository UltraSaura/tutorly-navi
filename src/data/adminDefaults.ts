
import { ApiKey, ModelOption } from '@/types/admin';

// Default API Keys
export const DEFAULT_API_KEYS: ApiKey[] = [
  {
    id: '1',
    name: 'OpenAI Production',
    provider: 'OpenAI',
    key: 'sk-1234••••••••••••••••••••••••••••••••••',
    createdAt: new Date(2023, 5, 15),
    lastUsed: new Date(2023, 6, 14),
  },
  {
    id: '2',
    name: 'Google Gemini',
    provider: 'Google',
    key: 'AIza••••••••••••••••••••••••••••••••••••',
    createdAt: new Date(2023, 5, 10),
    lastUsed: new Date(2023, 6, 12),
  },
];

// Default models
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most advanced multimodal model with vision and audio capabilities',
    capabilities: ['Text generation', 'Image understanding', 'Code generation', 'Reasoning'],
    contextWindow: 128000,
    pricing: '$0.01 / 1K tokens',
    performance: {
      speed: 85,
      quality: 95,
      reasoning: 90,
    },
    bestFor: ['Complex tutoring scenarios', 'Image-based homework help', 'Detailed explanations'],
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Powerful multimodal model with strong reasoning capabilities',
    capabilities: ['Text generation', 'Image understanding', 'Code generation'],
    contextWindow: 32000,
    pricing: '$0.0025 / 1K tokens',
    performance: {
      speed: 90,
      quality: 85,
      reasoning: 80,
    },
    bestFor: ['Math problem solving', 'Science explanations', 'Cost-effective tutoring'],
  },
  {
    id: 'claude-3',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Excellent at nuanced instructions and long-form content',
    capabilities: ['Text generation', 'Image understanding', 'Detailed explanations'],
    contextWindow: 200000,
    pricing: '$0.015 / 1K tokens',
    performance: {
      speed: 75,
      quality: 90,
      reasoning: 95,
    },
    bestFor: ['Essay feedback', 'Detailed concept explanations', 'Research assistance'],
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    description: 'Efficient model with strong reasoning at a lower cost',
    capabilities: ['Text generation', 'Code assistance', 'Structured output'],
    contextWindow: 32000,
    pricing: '$0.0035 / 1K tokens',
    performance: {
      speed: 88,
      quality: 82,
      reasoning: 85,
    },
    bestFor: ['Basic tutoring tasks', 'Quick answers', 'Budget-friendly option'],
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'DeepSeek',
    description: 'Specialized for code generation and technical problem-solving',
    capabilities: ['Code generation', 'Technical explanations', 'Algorithm design'],
    contextWindow: 64000,
    pricing: '$0.005 / 1K tokens',
    performance: {
      speed: 92,
      quality: 88,
      reasoning: 85,
    },
    bestFor: ['Coding exercises', 'Technical curriculum', 'Computer science teaching'],
  },
  {
    id: 'grok-1',
    name: 'Grok-1',
    provider: 'xAI',
    description: 'Real-time model with access to current information and a witty style',
    capabilities: ['Text generation', 'Current information', 'Creative responses'],
    contextWindow: 25000,
    pricing: '$0.008 / 1K tokens',
    performance: {
      speed: 95,
      quality: 86,
      reasoning: 83,
    },
    bestFor: ['Current events discussions', 'Engaging explanations', 'Creative approaches'],
  },
  {
    id: 'chat',
    name: 'Chat Model',
    provider: 'OpenAI',
    description: 'Specialized model for conversational interactions',
    capabilities: ['Natural dialogue', 'Context retention', 'Personalized responses'],
    contextWindow: 16000,
    pricing: '$0.002 / 1K tokens',
    performance: {
      speed: 95,
      quality: 88,
      reasoning: 82,
    },
    bestFor: ['Interactive tutoring', 'Conversational learning', 'Quick Q&A sessions'],
  },
];
