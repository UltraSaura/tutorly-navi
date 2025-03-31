
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'file' | 'image';
  filename?: string;
  fileUrl?: string;
}

export interface Exercise {
  id: string;
  question: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
  expanded: boolean;
  relatedMessages?: Message[];
}

export interface Grade {
  percentage: number;
  letter: string;
}
