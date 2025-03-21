
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
