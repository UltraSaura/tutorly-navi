
// Chat message type
export type ExerciseResponseType = 'text' | 'true_false';

export type ProblemSubmissionType = 'simple_exercise' | 'complex_problem' | 'grouped_choice_problem' | 'grouped_problem';
export type ProblemLifecycleStatus =
  | 'draft'
  | 'submitted_without_answer'
  | 'awaiting_student_answer'
  | 'evaluating'
  | 'evaluated'
  | 'needs_more_information'
  | 'error';
export type ProblemAnswerType = 'text' | 'true_false' | 'multiple_choice' | 'yes_no' | 'matching';
export type ProblemRowStatus = 'correct' | 'incorrect' | 'partial' | 'incomplete' | 'ungraded';
export type ProblemSelectionMode = 'select_correct' | 'choose_option';
export type ProblemRowKind = 'choice' | 'calculation' | 'construction' | 'text';

export interface ProblemAttachment {
  id: string;
  type: 'image' | 'pdf' | 'document' | 'other';
  filename: string;
  url?: string;
  extractedText?: string;
  uploadedAt: string;
  extractionStatus: 'pending' | 'extracted' | 'failed';
}

export interface ProblemJustificationAttachment {
  id: string;
  type: 'image' | 'pdf' | 'document' | 'other';
  filename: string;
  url?: string;
  extractedText?: string;
  normalizedText?: string;
  ocrConfidence?: number;
  ocrWarnings?: string[];
  extractionStatus: 'pending' | 'extracted' | 'failed';
  error?: string;
  uploadedAt: string;
}

export interface ProblemRowEvaluation {
  selectedAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  justificationProvided: boolean;
  justificationSufficient?: boolean;
  status: ProblemRowStatus;
  feedback?: string;
  explanation?: string;
  score?: number;
}

export interface ProblemRow {
  id: string;
  label: string;
  prompt: string;
  relatedContext?: string;
  answerType: ProblemAnswerType;
  rowKind?: ProblemRowKind;
  options: string[];
  selected?: boolean;
  doNotGrade?: boolean;
  selectedOption?: string;
  studentAnswer?: string;
  justification?: string;
  justificationAttachments?: ProblemJustificationAttachment[];
  requiresJustification?: boolean;
  evaluation?: ProblemRowEvaluation;
}

export interface ProblemSection {
  id: string;
  title?: string;
  label?: string;
  context?: string;
  rows: ProblemRow[];
}

export interface GroupedAnswerPayload {
  problemId: string;
  isRetry?: boolean;
  retryRowIds?: string[];
  answers: Array<{
    rowId: string;
    label: string;
    selectedOption?: string;
    answer?: string;
    selected?: boolean;
    doNotGrade?: boolean;
    justification?: string;
    justificationAttachments?: ProblemJustificationAttachment[];
  }>;
}

export interface GroupedRetryPractice {
  concept: string;
  similarProblem: string;
  diagram?: {
    type: 'rectangle' | 'square' | 'triangle' | 'circle';
    labels?: string[];
    dimensions?: Record<string, string>;
    caption?: string;
  };
  method: string;
  retryPrompt: string;
  commonMistake?: string;
  parentHelpHint?: string;
}

export interface ProblemSubmission {
  id: string;
  submissionId: string;
  type: ProblemSubmissionType;
  rawText: string;
  attachments: ProblemAttachment[];
  extractedText?: string;
  title?: string;
  statement?: string;
  instructions?: string;
  sharedContext?: string;
  answerType?: ProblemAnswerType;
  selectionMode?: ProblemSelectionMode;
  requiresJustification?: boolean;
  sections: ProblemSection[];
  studentAnswer?: GroupedAnswerPayload;
  overallFeedback?: string;
  missingAnswers?: string[];
  recommendedNextAction?: string;
  status: ProblemLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  keepGrouped?: boolean;
}

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
  responseType?: ExerciseResponseType;
  choices?: string[];
  problemSubmission?: ProblemSubmission;
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
  gradingMethod?: 'local' | 'ai';
  explanationLoading?: boolean;
  explanationRequested?: boolean;
  correctAnswer?: string; // internal, never displayed directly
  responseType?: ExerciseResponseType;
  choices?: string[];
}

// Grade type definition
export interface Grade {
  percentage: number;
  letter: string;
}

// Chat history type
export type ChatHistory = Message[];
