
// Chat message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'file';
  filename?: string;
  fileUrl?: string;
  subjectId?: string;
  topicId?: string;
  explanation?: string;
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
  topicId?: string;
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

// Chat history type
export type ChatHistory = Message[];
