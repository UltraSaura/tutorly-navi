
// Chat message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'file';
  filename?: string;
  fileUrl?: string;
}

// Exercise submission type
export interface Exercise {
  id: string;
  question: string;
  userAnswer: string;
  expanded: boolean;
  isCorrect?: boolean;
  explanation?: string;
  subjectId?: string; // Add subject ID to track which subject this exercise belongs to
}

// Chat history type
export type ChatHistory = Message[];
