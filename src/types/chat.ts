
// Chat message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'gamification';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'file' | 'xp_reward' | 'streak_milestone' | 'feedback';
  filename?: string;
  fileUrl?: string;
  subjectId?: string; // For subject icon display
  xpReward?: number; // XP amount for rewards
  streakDays?: number; // Streak count for milestones
  badgeName?: string; // Badge name for unlocks
  explanation?: ExplanationStep[]; // Expandable explanation steps
  isCorrect?: boolean; // For feedback messages
}

// Exercise attempt type
export interface ExerciseAttempt {
  id: string;
  answer: string;
  isCorrect?: boolean;
  explanation?: string;
  timestamp: Date;
  attemptNumber: number;
}

// Exercise submission type
export interface Exercise {
  id: string;
  question: string;
  userAnswer: string; // Current/latest answer
  expanded: boolean;
  isCorrect?: boolean;
  explanation?: string;
  subjectId?: string;
  relatedMessages?: Message[]; // Add related messages for AI responses
  attemptCount: number;
  attempts: ExerciseAttempt[];
  lastAttemptDate: Date;
  needsRetry: boolean;
}

// Grade type definition
export interface Grade {
  percentage: number;
  letter: string;
}

// Explanation step type
export interface ExplanationStep {
  id: string;
  title: string;
  content: string;
  icon?: 'magnifier' | 'divide' | 'check' | 'calculator';
}

// Chat history type
export type ChatHistory = Message[];
