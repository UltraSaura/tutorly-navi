// Chat message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'file';
  filename?: string;
  fileUrl?: string;
  exerciseStatus?: 'correct' | 'incorrect';
}

// Exercise submission type
export interface Exercise {
  id: string;
  question: string;
  userAnswer: string;
  expanded: boolean;
  isCorrect?: boolean;
  explanation?: string;
  subjectId?: string;
  relatedMessages?: Message[]; // Add related messages for AI responses
}

// Grade type definition
export interface Grade {
  percentage: number;
  letter: string;
}

// Chat history type
export type ChatHistory = Message[];
