
// Chat message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'file';
  filename?: string;
  fileUrl?: string;
  subjectId?: string; // Added to track which subject a message belongs to
  isHomework?: boolean; // Whether the message is related to a homework submission
}

// Exercise submission type
export interface Exercise {
  id: string;
  question: string;
  userAnswer: string;
  expanded: boolean;
  isCorrect?: boolean;
  explanation?: string;
  subjectId?: string; // Added to associate exercises with specific subjects
  relatedMessages?: Message[]; // Related messages for AI responses
}

// Grade type definition
export interface Grade {
  percentage: number;
  letter: string;
}

// Chat history type
export type ChatHistory = Message[];
