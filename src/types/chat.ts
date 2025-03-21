
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Exercise {
  id: string;
  question: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
  expanded: boolean;
}

export interface Grade {
  percentage: number;
  letter: string;
}
