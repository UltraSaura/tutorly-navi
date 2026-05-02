import React, { memo, useMemo, useState, useCallback } from 'react';
import { Calculator, Send, Trash2, X } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { containsMathContent, textToMathDisplay, answerToLatex } from '@/utils/mathFormatUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroupedAnswerPayload, GroupedRetryPractice, Message, ProblemSubmission } from '@/types/chat';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { parseUserMessage } from '@/utils/messageParser';
import { useUserContext } from '@/hooks/useUserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';
import { getExerciseChoices } from '@/utils/responseOptions';
import GroupedChoiceProblemCard from './GroupedChoiceProblemCard';
import ProblemCard from './ProblemCard';
import GroupedProblemExplanationModal from './GroupedProblemExplanationModal';
import { generateGroupedRetryPractice } from '@/services/problemSubmissionService';
import { useAdmin } from '@/context/AdminContext';

interface AIResponseProps {
  messages: Message[];
  isLoading: boolean;
  onSubmitAnswer?: (question: string, answer: string) => void;
  onSubmitGroupedAnswers?: (problemId: string, payload: GroupedAnswerPayload) => Promise<void>;
  onClearAll?: () => void;
  onDismissExercise?: (messageId: string) => void;
}
interface ExerciseCardProps {
  userMessage: Message;
  aiResponse: Message;
  onSubmitAnswer?: (question: string, answer: string) => void;
  onDismiss?: () => void;
  onShowExplanation?: (question: string, answer: string, isCorrect: boolean) => void;
}

// Inline helper to render text that may contain math
const MathText = ({ text, className }: { text: string; className?: string }) => {
  if (!containsMathContent(text)) return <span className={className}>{text}</span>;
  const { prefix, latex } = textToMathDisplay(text);
  return (
    <span className={className}>
      {prefix && <span>{prefix} </span>}
      {latex && <MathRenderer latex={latex} inline className="inline-block align-middle" />}
    </span>
  );
};

const MathAnswer = ({ label, answer }: { label: string; answer: string }) => {
  const latex = answerToLatex(answer);
  if (latex) {
    return <span>{label}: <MathRenderer latex={latex} inline className="inline-block align-middle" /></span>;
  }
  return <span>{label}: {answer}</span>;
};

const getStatusStyles = (content: string) => {
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  const isUnanswered = /^UNANSWERED\b/i.test(contentTrimmed);
  
  if (isUnanswered) return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
  if (isCorrect) return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
  if (isIncorrect) return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
  return 'bg-neutral-surface border-neutral-border';
};

const parseAIResponse = (content: string) => {
  try {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    return JSON.parse(content);
  } catch {
    return null;
  }
};

// Memoized ExerciseCard component
const ExerciseCard = memo<ExerciseCardProps>(({ userMessage, aiResponse, onSubmitAnswer, onShowExplanation }) => {
  const parsed = parseUserMessage(userMessage.content);
  const { question, answer, hasAnswer } = parsed;
  const choiceOptions = getExerciseChoices(userMessage);
  const content = aiResponse.content;
  const [userAnswerInput, setUserAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { t, language } = useLanguage();
  const { userContext } = useUserContext();
  
  const { data: topicInfo, isLoading: topicInfoLoading } = useQuery({
    queryKey: ['topic-info-for-lesson', aiResponse.topicId],
    queryFn: async () => {
      if (!aiResponse.topicId) return null;
      const { data } = await supabase
        .from('topics')
        .select(`slug, category:learning_categories!inner(subject:subjects!inner(slug))`)
        .eq('id', aiResponse.topicId)
        .single();
      return data;
    },
    enabled: !!aiResponse.topicId
  });

  const hasNoAnswer = isRetrying || !hasAnswer || !answer;
  
  const contentTrimmed = content.trim();
  const firstLine = contentTrimmed.split('\n')[0];
  const isCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const isIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);

  const handleSubmitAnswer = async () => {
    if (!userAnswerInput.trim() || !onSubmitAnswer) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(question, userAnswerInput.trim());
      setUserAnswerInput('');
      setAnswerSubmitted(true);
      setIsRetrying(false);
    } catch (error) {
      console.error('[ExerciseCard] Error in handleSubmitAnswer:', error);
      setAnswerSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChoiceAnswer = async (choice: string) => {
    if (!onSubmitAnswer) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(question, choice);
      setAnswerSubmitted(true);
      setIsRetrying(false);
    } catch (error) {
      console.error('[ExerciseCard] Error in handleChoiceAnswer:', error);
      setAnswerSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const handleExplanationClick = () => {
    if (onShowExplanation) {
      onShowExplanation(question, answer || '', isCorrect);
    }
  };

  // JSON response path
  const jsonResponse = parseAIResponse(content);
  if (jsonResponse && jsonResponse.isMath && jsonResponse.sections) {
    const jsonIsCorrect = jsonResponse.isCorrect === true;
    const jsonIsIncorrect = jsonResponse.isCorrect === false;
    
    return (
      <div className="w-full overflow-hidden">
        <div className={cn(
          'p-4 rounded-card transition-all duration-200 hover:shadow-md relative break-words overflow-hidden',
          jsonIsCorrect ? 'bg-green-50 border-2 border-green-600'
            : jsonIsIncorrect ? 'bg-red-50 border-2 border-red-600'
            : 'bg-neutral-surface border border-neutral-border'
        )}>
          <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
            {jsonIsCorrect ? (
              <img src="/images/Happy Green Right Answer.png" alt={t('exercise.correct')} className="w-6 h-6 object-contain" />
            ) : jsonIsIncorrect ? (
              <img src="/images/Sad Face wrong Answer.png" alt={t('exercise.incorrect')} className="w-6 h-6 object-contain" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm font-bold">?</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 pr-8">
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
              jsonIsCorrect ? 'bg-green-100 border border-green-300 text-green-600'
                : jsonIsIncorrect ? 'bg-blue-100 border border-blue-200 text-blue-600'
                : 'bg-neutral-surface border border-neutral-border text-blue-600'
            )}>
              <Calculator size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-neutral-text mb-3 break-words whitespace-pre-wrap">
                <MathText text={question || jsonResponse.exercise} />
              </div>
              
              <div className="mb-3">
                {hasNoAnswer ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-text">{t('exercise.answer')}:</label>
                    {choiceOptions.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {choiceOptions.map(choice => (
                          <Button
                            key={choice}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-4"
                            disabled={isSubmitting}
                            onClick={() => handleChoiceAnswer(choice)}
                          >
                            {choice}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input type="text" value={userAnswerInput} onChange={(e) => setUserAnswerInput(e.target.value)}
                          onKeyPress={handleKeyPress} placeholder={t('exercise.pleaseProvideAnswer')} className="flex-1" disabled={isSubmitting} />
                        <Button onClick={handleSubmitAnswer} disabled={!userAnswerInput.trim() || isSubmitting} size="sm" className="px-3">
                          <Send size={16} className="mr-1" />
                          {answerSubmitted && userAnswerInput.trim() === '' ? t('exercise.answerSubmitted') : t('common.submit')}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn('px-3 py-1',
                      jsonIsCorrect ? 'bg-green-100 border border-green-300 text-green-800'
                        : jsonIsIncorrect ? 'bg-white border border-border text-muted-foreground'
                        : 'bg-neutral-bg text-neutral-muted'
                    )}>
                      <MathAnswer label={t('exercise.answer')} answer={answer} />
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs px-2 py-0.5 h-6" onClick={handleExplanationClick}>
                  {t('exercise.showExplanation')}
                </Button>
                
                {jsonIsIncorrect && !isRetrying && (
                  <Button variant="default" size="sm" className="text-xs px-2 py-0.5 h-6"
                    onClick={() => { setIsRetrying(true); setUserAnswerInput(''); }}>
                    {t('exercise.tryAgain')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for non-JSON responses
  return (
    <div className="w-full">
      <div className={cn('p-4 rounded-card transition-all duration-200 hover:shadow-md relative', getStatusStyles(content))}>
        <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
          {isCorrect ? (
            <img src="/images/Happy Green Right Answer.png" alt={t('exercise.correct')} className="w-6 h-6 object-contain" />
          ) : isIncorrect ? (
            <img src="/images/Sad Face wrong Answer.png" alt={t('exercise.incorrect')} className="w-6 h-6 object-contain" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm font-bold">?</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 pr-8">
          <div className={cn('flex-shrink-0 w-10 h-10 rounded-button flex items-center justify-center',
            'bg-neutral-surface border border-neutral-border text-blue-600')}>
            <Calculator size={20} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-body font-semibold text-neutral-text mb-3">
              <MathText text={question} />
            </div>
            
            <div className="mb-3">
              {hasNoAnswer ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-text">{t('exercise.answer')}:</label>
                  {choiceOptions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {choiceOptions.map(choice => (
                        <Button
                          key={choice}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-4"
                          disabled={isSubmitting}
                          onClick={() => handleChoiceAnswer(choice)}
                        >
                          {choice}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input type="text" value={userAnswerInput} onChange={(e) => setUserAnswerInput(e.target.value)}
                        onKeyPress={handleKeyPress} placeholder={t('exercise.pleaseProvideAnswer')} className="flex-1" disabled={isSubmitting} />
                      <Button onClick={handleSubmitAnswer} disabled={!userAnswerInput.trim() || isSubmitting} size="sm" className="px-3">
                        <Send size={16} className="mr-1" />
                        {answerSubmitted && userAnswerInput.trim() === '' ? t('exercise.answerSubmitted') : t('common.submit')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Badge variant="secondary" className="px-3 py-1 bg-neutral-bg text-neutral-muted">
                  <MathAnswer label={t('exercise.answer')} answer={answer} />
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs px-2 py-0.5 h-6" onClick={handleExplanationClick}>
                {t('exercise.showExplanation')}
              </Button>
              
              {isIncorrect && !isRetrying && (
                <Button variant="default" size="sm" className="text-xs px-2 py-0.5 h-6"
                  onClick={() => { setIsRetrying(true); setUserAnswerInput(''); }}>
                  {t('exercise.tryAgain')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.userMessage.id === nextProps.userMessage.id &&
         prevProps.aiResponse.id === nextProps.aiResponse.id;
});

ExerciseCard.displayName = 'ExerciseCard';

const LoadingSkeleton = () => (
  <div className="w-full">
    <div className="p-4 rounded-card border bg-neutral-surface border-neutral-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-button bg-neutral-bg animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-neutral-bg rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-neutral-bg rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
);

const AIResponse: React.FC<AIResponseProps> = ({ messages, isLoading, onSubmitAnswer, onSubmitGroupedAnswers, onClearAll, onDismissExercise }) => {
  const { t, language } = useLanguage();
  const teaching = useTwoCardTeaching();
  const { selectedModelId } = useAdmin();
  const { userContext } = useUserContext();
  const [groupedExplanationProblem, setGroupedExplanationProblem] = useState<ProblemSubmission | null>(null);
  const [groupedExplanationRowId, setGroupedExplanationRowId] = useState<string | undefined>(undefined);
  const [groupedRetryPractice, setGroupedRetryPractice] = useState<GroupedRetryPractice | null>(null);
  const [groupedRetryPracticeLoading, setGroupedRetryPracticeLoading] = useState(false);
  const [groupedRetryPracticeError, setGroupedRetryPracticeError] = useState<string | null>(null);
  
  const handleShowExplanation = useCallback((question: string, answer: string, isCorrect: boolean) => {
    teaching.openFor(
      { prompt: question, userAnswer: answer, subject: 'math' },
      {
        response_language: language === 'fr' ? 'French' : 'English',
        grade_level: userContext?.student_level || 'High School',
      }
    );
  }, [language, teaching, userContext?.student_level]);

  const handleShowGroupedExplanation = useCallback(async (problem: ProblemSubmission, rowId?: string) => {
    setGroupedExplanationProblem(problem);
    setGroupedExplanationRowId(rowId);
    setGroupedRetryPractice(null);
    setGroupedRetryPracticeError(null);
    setGroupedRetryPracticeLoading(true);

    try {
      const practice = await generateGroupedRetryPractice({
        problem,
        rowId,
        selectedModelId: selectedModelId || 'gpt-5',
        language,
        schoolLevel: userContext?.student_level,
        country: userContext?.country,
        curriculum: userContext?.country ? `${userContext.country} curriculum` : undefined,
        learningStyle: userContext?.learning_style,
      });
      setGroupedRetryPractice(practice);
    } catch (error) {
      setGroupedRetryPracticeError(
        error instanceof Error
          ? error.message
          : (language === 'fr'
            ? 'Impossible de générer l’explication.'
            : 'Could not generate the explanation.')
      );
    } finally {
      setGroupedRetryPracticeLoading(false);
    }
  }, [language, selectedModelId, userContext?.country, userContext?.learning_style, userContext?.student_level]);

  const exercisePairs = useMemo(() => {
    const pairs: Array<{ userMessage: Message; aiResponse: Message }> = [];
    let pendingUser: Message | null = null;
    
    for (const msg of messages) {
      if (msg.problemSubmission) {
        pendingUser = null;
      } else if (msg.role === 'user' && msg.type !== 'image' && msg.type !== 'file') {
        pendingUser = msg;
      } else if (msg.role === 'assistant' && msg.id !== '1' && pendingUser) {
        pairs.push({ userMessage: pendingUser, aiResponse: msg });
        pendingUser = null;
      } else if (msg.role === 'assistant') {
        pendingUser = null;
      }
    }

    const uniquePairs: typeof pairs = [];
    const seenQuestions = new Set<string>();
    
    for (const pair of pairs) {
      const { question } = parseUserMessage(pair.userMessage.content);
      if (!seenQuestions.has(question)) {
        seenQuestions.add(question);
        uniquePairs.push(pair);
      } else {
        const idx = uniquePairs.findIndex(ep => parseUserMessage(ep.userMessage.content).question === question);
        if (idx !== -1) uniquePairs[idx] = pair;
      }
    }
    
    return uniquePairs;
  }, [messages]);

  const problemMessages = useMemo(
    () => messages.filter(message => message.problemSubmission),
    [messages]
  );

  if (exercisePairs.length === 0 && problemMessages.length === 0 && !isLoading) return null;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {(exercisePairs.length > 0 || problemMessages.length > 0) && onClearAll && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onClearAll}
              className="text-muted-foreground hover:text-destructive hover:border-destructive">
              <Trash2 size={14} />
              {language === 'fr' ? 'Tout effacer' : 'Clear all'}
            </Button>
          </div>
        )}

        {problemMessages.map((message) => {
          const problem = message.problemSubmission!;
          return (
            <div key={message.id} className="relative group">
              {onDismissExercise && (
                <button onClick={() => onDismissExercise(message.id)}
                  className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  title={language === 'fr' ? 'Supprimer' : 'Dismiss'}>
                  <X size={12} />
                </button>
              )}
              {problem.type === 'grouped_choice_problem' || problem.type === 'grouped_problem' ? (
                <GroupedChoiceProblemCard
                  problem={problem}
                  onSubmitAnswers={onSubmitGroupedAnswers}
                  onShowExplanation={handleShowGroupedExplanation}
                />
              ) : (
                <ProblemCard problem={problem} />
              )}
            </div>
          );
        })}

        {exercisePairs.map((pair) => (
          <div key={pair.userMessage.id} className="relative group">
            {onDismissExercise && (
              <button onClick={() => onDismissExercise(pair.userMessage.id)}
                className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                title={language === 'fr' ? 'Supprimer' : 'Dismiss'}>
                <X size={12} />
              </button>
            )}
            <ExerciseCard
              userMessage={pair.userMessage}
              aiResponse={pair.aiResponse}
              onSubmitAnswer={onSubmitAnswer}
              onShowExplanation={handleShowExplanation}
            />
          </div>
        ))}
        
        {isLoading && <LoadingSkeleton />}
      </div>

      <ExplanationModal
        open={teaching.open}
        onClose={() => teaching.setOpen(false)}
        loading={teaching.loading}
        sections={teaching.sections}
        error={teaching.error}
        onTryAgain={() => teaching.setOpen(false)}
      />

      <GroupedProblemExplanationModal
        problem={groupedExplanationProblem}
        practice={groupedRetryPractice}
        loading={groupedRetryPracticeLoading}
        error={groupedRetryPracticeError}
        rowId={groupedExplanationRowId}
        onRetry={groupedExplanationProblem ? () => void handleShowGroupedExplanation(groupedExplanationProblem, groupedExplanationRowId) : undefined}
        onClose={() => {
          setGroupedExplanationProblem(null);
          setGroupedExplanationRowId(undefined);
          setGroupedRetryPractice(null);
          setGroupedRetryPracticeError(null);
          setGroupedRetryPracticeLoading(false);
        }}
      />
    </div>
  );
};

export default AIResponse;
