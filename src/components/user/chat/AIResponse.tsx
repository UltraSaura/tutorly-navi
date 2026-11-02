import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import React, { memo, useMemo, useState, useCallback } from 'react';
import { Calculator, CheckCircle2, Send, Trash2, X, XCircle, Lightbulb, Trophy } from 'lucide-react';
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
import { buildSafeHomeworkLearningRows, type SafeHomeworkLearningRow } from '@/services/homeworkLearningResources';
import { motion } from 'framer-motion';
import { PracticeFeedback } from '@/components/practice/PracticeFeedback';
import { localGrade, type LocalGradeResult } from '@/services/localMathGrader';
import { formatFraction, parseFractions, parseRationalValues, type FractionValue } from '@/utils/fractionBounds';

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
  onShowExplanation?: (
    question: string,
    answer: string,
    isCorrect: boolean,
    homeworkLearningRows: SafeHomeworkLearningRow[],
    sourceId: string,
    title?: string,
  ) => void;
}

// Inline helper to render text that may contain math
const MathText = ({ text, className }: { text: string; className?: string }) => {
  // Bounds requests are natural-language instructions. Keep their fraction
  // readable as 7/3 instead of exposing LaTeX syntax inside the sentence.
  if (/\bencadr\w*\b|\bencadrement\b/i.test(text)) {
    const readable = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
    return <span className={className}>{readable}</span>;
  }
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
  if (isCorrect) return 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800';
  if (isIncorrect) return 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800';
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

export function resolveExerciseEvaluation(
  question: string,
  answer: string,
  providerIsCorrect: boolean,
  providerIsIncorrect: boolean,
): { isCorrect: boolean; isIncorrect: boolean; localResult: LocalGradeResult | null } {
  const localResult = question.trim() && answer.trim() ? localGrade(question, answer) : null;
  if (localResult) {
    return {
      isCorrect: localResult.isCorrect,
      isIncorrect: !localResult.isCorrect,
      localResult,
    };
  }
  return { isCorrect: providerIsCorrect, isIncorrect: providerIsIncorrect, localResult: null };
}

type FractionFeedbackChallenge = {
  target: FractionValue;
  referenceUpper: FractionValue;
  choices: Array<{ id: 'A' | 'B' | 'C'; label: string }>;
  correctChoice: 'A' | 'B' | 'C';
};
export type FractionChallengeState = 'idle' | 'correct' | 'incorrect' | 'hidden';

export function getFractionChallengeChoiceClass(
  choiceId: string,
  selectedChoice: string,
  state: FractionChallengeState,
): string {
  if (state === 'correct' && selectedChoice === choiceId) return 'border-[#22C55E] bg-[#E8F8EC] text-green-900';
  if (state === 'incorrect' && selectedChoice === choiceId) return 'border-rose-400 bg-rose-100 text-rose-900';
  if (selectedChoice === choiceId) return 'border-amber-500 bg-white text-amber-950';
  return 'border-amber-200 bg-amber-100/50 text-amber-900 hover:bg-white';
}

export function buildFractionFeedbackChallenge(question: string, answer: string): FractionFeedbackChallenge | null {
  const target = parseFractions(question)[0];
  if (!target || !/\bentre\s+(?:deux|2)\s+fractions?\b/i.test(question)) return null;

  const above = { numerator: target.numerator + 1, denominator: target.denominator };
  const answerBounds = parseRationalValues(answer);
  const referenceUpper = answerBounds.length === 2 ? answerBounds[1] : null;
  if (!referenceUpper || referenceUpper.numerator * target.denominator <= target.numerator * referenceUpper.denominator) return null;
  const fartherAbove = {
    numerator: referenceUpper.numerator + 1,
    denominator: referenceUpper.denominator,
  };
  return {
    target,
    referenceUpper,
    choices: [
      { id: 'A', label: formatFraction(above) },
      { id: 'B', label: formatFraction(fartherAbove) },
      { id: 'C', label: formatFraction(target) },
    ],
    correctChoice: 'A',
  };
}

function formatBoundsInequality(question: string, answer: string): string | null {
  const target = parseFractions(question)[0];
  const bounds = parseRationalValues(answer);
  if (!target || bounds.length !== 2) return null;
  return `${formatFraction(bounds[0])} < ${formatFraction(target)} < ${formatFraction(bounds[1])}`;
}

export const fractionChallengeCheckButtonClass =
  'bg-[#7452C4] text-white hover:bg-[#6344B0] disabled:cursor-not-allowed disabled:bg-[#EDE5FA] disabled:text-[#6B4BA5] disabled:opacity-100';

export function FractionBoundsFeedbackCard({
  question,
  answer,
  result,
  language,
}: {
  question: string;
  answer: string;
  result: LocalGradeResult;
  language: string;
}) {
  const french = language === 'fr';
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [challengeState, setChallengeState] = useState<FractionChallengeState>('idle');
  const challenge = buildFractionFeedbackChallenge(question, answer);
  const inequality = formatBoundsInequality(question, answer);
  const isFormatError = result.evaluation?.reason === 'format';
  const closerFraction = challenge?.choices[0].label;
  const isImprovement = result.isCorrect && Boolean(challenge);

  const checkChallenge = () => {
    if (!selectedChoice || !challenge || challengeState !== 'idle') return;
    setChallengeState(selectedChoice === challenge.correctChoice ? 'correct' : 'incorrect');
  };

  const retryChallenge = () => {
    setSelectedChoice('');
    setChallengeState('idle');
  };

  return (
    <div className={cn(
      'mb-4 rounded-2xl border p-4 shadow-sm',
      isImprovement ? 'border-amber-200 bg-amber-50/70' : result.isCorrect ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70',
    )} data-feedback-card="fraction-bounds">
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isImprovement ? 'bg-amber-100 text-amber-700' : result.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
        )} aria-hidden="true">
          {result.isCorrect && !isImprovement ? <Trophy className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900">
            {isImprovement
              ? (french ? 'Pas mal, tu es sur la bonne voie !' : 'Nice work, you are on the right track!')
              : result.isCorrect
              ? (french ? "Bravo, c'est correct !" : "Great, that's correct!")
              : (french ? 'Pas encore, continue !' : 'Not yet, keep going!')}
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            {isImprovement
              ? (french ? 'Ton encadrement est juste, mais tu peux trouver des fractions plus proches.' : 'Your bounds are correct, but you can find closer fractions.')
              : result.isCorrect
              ? (french ? 'Tu as trouvé deux fractions qui encadrent correctement la fraction centrale.' : 'You found two fractions that correctly bound the central fraction.')
              : isFormatError
                ? (french
                  ? 'Tu as trouvé deux nombres qui encadrent correctement la fraction. Mais la consigne demande des fractions : écris-les, par exemple 2/1 et 5/1.'
                  : 'Your two numbers bound the fraction correctly, but the instruction asks for fractions. Write them as fractions, for example 2/1 and 5/1.')
                : result.evaluation?.feedback}
          </p>
          {inequality && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/80 bg-white/80 px-3 py-2" aria-label={french ? 'Encadrement mathématique' : 'Mathematical bounds'}>
              <MathRenderer latex={inequality.split(' < ').map((part) => {
                const [numerator, denominator] = part.split('/');
                return `\\frac{${numerator}}{${denominator}}`;
              }).join(' < ')} inline className="text-base" />
            </div>
          )}
          {!result.isCorrect && answer && (
            <p className="mt-2 text-sm font-medium text-slate-800">
              {french ? 'Ta réponse :' : 'Your answer:'} {answer}
            </p>
          )}
        </div>
      </div>

      {result.isCorrect && challenge && challengeState !== 'hidden' && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3" data-feedback-challenge="fraction-bounds">
          <p className="font-semibold text-amber-950">{french ? 'Tu peux aller plus loin !' : 'You can go further!'}</p>
          <p className="mt-1 text-sm text-amber-900">
            {french
              ? `Ton encadrement est correct. Peux-tu trouver une borne supérieure plus proche de ${formatFraction(challenge.target)} que ${formatFraction(challenge.referenceUpper)}, en gardant le même dénominateur ?`
              : `Your bounds are correct. Can you find an upper bound closer to ${formatFraction(challenge.target)} than ${formatFraction(challenge.referenceUpper)}, with the same denominator?`}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={french ? 'Choix du défi' : 'Challenge choices'}>
            {challenge.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                role="radio"
                aria-checked={selectedChoice === choice.id}
                disabled={challengeState === 'correct'}
                onClick={() => { setSelectedChoice(choice.id); setChallengeState('idle'); }}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                  getFractionChallengeChoiceClass(choice.id, selectedChoice, challengeState),
                )}
              >
                {challengeState === 'correct' && selectedChoice === choice.id && <CheckCircle2 className="mr-1 inline-block h-4 w-4 text-[#22C55E]" aria-hidden="true" />}
                {choice.id}. {choice.label}
              </button>
            ))}
          </div>
          {challengeState !== 'idle' && (
            <p className="mt-2 text-sm font-semibold text-amber-900" role="status">
              {challengeState === 'correct'
                ? (french ? `Exact ! ${closerFraction} est plus proche : tu as trouvé un encadrement plus précis.` : `Exactly! ${closerFraction} is closer: you found a more precise bound.`)
                : (french ? 'Regarde les numérateurs : nous cherchons une fraction juste au-dessus de la fraction centrale.' : 'Compare the numerators: we need a fraction just above the central fraction.')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {challengeState === 'idle' && (
              <Button type="button" size="sm" className={fractionChallengeCheckButtonClass} onClick={checkChallenge} disabled={!selectedChoice}>
                {french ? 'Vérifier ma réponse' : 'Check my answer'}
              </Button>
            )}
            {challengeState === 'incorrect' && (
              <Button type="button" size="sm" className="bg-[#7452C4] text-white hover:bg-[#6344B0]" onClick={retryChallenge}>
                {french ? 'Réessayer' : 'Try again'}
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => setChallengeState('hidden')}>
              {french ? 'Ignorer' : 'Skip'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseResultBanner({
  isCorrect,
  isIncorrect,
  hasAnswer,
  feedback,
  language,
}: {
  isCorrect: boolean;
  isIncorrect: boolean;
  hasAnswer: boolean;
  feedback?: string;
  language: string;
}) {
  if (!isCorrect && !isIncorrect) {
    if (!hasAnswer) return null;
    return (
      <div className="mb-3 inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700" role="status">
        {language === 'fr' ? 'Réponse non évaluée' : 'Answer not evaluated'}
      </div>
    );
  }
  return (
    <div className="mb-3 space-y-2">
      <PracticeFeedback status={isCorrect ? 'correct' : 'incorrect'} language={language} />
      {feedback && (
        <p className="text-sm text-slate-700" role="status">{feedback}</p>
      )}
    </div>
  );
}

// Memoized ExerciseCard component
const ExerciseCard = memo<ExerciseCardProps>(({ userMessage, aiResponse, onSubmitAnswer, onShowExplanation }) => {
  const ui = useInterfaceTranslation();
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
  const providerIsCorrect = /^CORRECT\b/i.test(contentTrimmed) || /\bCORRECT\b/i.test(firstLine);
  const providerIsIncorrect = /^INCORRECT\b/i.test(contentTrimmed) || /\bINCORRECT\b/i.test(firstLine);
  const evaluation = resolveExerciseEvaluation(
    question,
    answer,
    !isRetrying && hasAnswer ? providerIsCorrect : false,
    !isRetrying && hasAnswer ? providerIsIncorrect : false,
  );
  const isCorrect = evaluation.isCorrect;
  const isIncorrect = evaluation.isIncorrect;

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
      onShowExplanation(question, answer || '', isCorrect, homeworkLearningRows, aiResponse.id, question);
    }
  };

  const homeworkLearningRows = useMemo(() => {
    if (!question || (!isCorrect && !isIncorrect)) return [];
    return [{
      label: language === 'fr' ? 'Exercice' : ui("Exercise"),
      prompt: question,
      rowKind: 'calculation' as const,
      gradingExplanation: contentTrimmed,
      status: isCorrect ? 'correct' as const : 'incorrect' as const,
    }];
  }, [contentTrimmed, isCorrect, isIncorrect, language, question, ui]);

  // JSON response path
  const jsonResponse = parseAIResponse(content);
  if (jsonResponse && jsonResponse.isMath && jsonResponse.sections) {
    const jsonProviderIsCorrect = jsonResponse.isCorrect === true;
    const jsonProviderIsIncorrect = jsonResponse.isCorrect === false;
    const jsonEvaluation = resolveExerciseEvaluation(
      question || jsonResponse.exercise || '',
      answer,
      !isRetrying && hasAnswer ? jsonProviderIsCorrect : false,
      !isRetrying && hasAnswer ? jsonProviderIsIncorrect : false,
    );
    const jsonIsCorrect = jsonEvaluation.isCorrect;
    const jsonIsIncorrect = jsonEvaluation.isIncorrect;
    const jsonHasImprovement = jsonIsCorrect && Boolean(jsonEvaluation.localResult?.evaluation);
    
    return (
      <div className="w-full overflow-hidden">
        <div className={cn(
          'p-4 rounded-card transition-all duration-200 hover:shadow-md relative break-words overflow-hidden',
          jsonHasImprovement ? 'bg-amber-50 border border-amber-200'
            : jsonIsCorrect ? 'bg-green-50 border border-green-200'
            : jsonIsIncorrect ? 'bg-red-50 border border-red-200'
            : 'bg-neutral-surface border border-neutral-border'
        )}>
          <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
            {jsonHasImprovement ? (
              <Lightbulb className="h-5 w-5 text-amber-700" aria-label={t('exercise.correct')} />
            ) : jsonIsCorrect ? (
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
              jsonHasImprovement ? 'bg-amber-100 border border-amber-300 text-amber-700'
                : jsonIsCorrect ? 'bg-green-100 border border-green-300 text-green-600'
                : jsonIsIncorrect ? 'bg-blue-100 border border-blue-200 text-blue-600'
                : 'bg-neutral-surface border border-neutral-border text-blue-600'
            )}>
              <Calculator size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-neutral-text mb-3 break-words whitespace-pre-wrap">
                <MathText text={question || jsonResponse.exercise} />
              </div>

              {jsonEvaluation.localResult?.evaluation ? (
                <FractionBoundsFeedbackCard question={question || jsonResponse.exercise || ''} answer={answer} result={jsonEvaluation.localResult} language={language} />
              ) : (
                <ExerciseResultBanner
                  isCorrect={jsonIsCorrect}
                  isIncorrect={jsonIsIncorrect}
                  hasAnswer={!hasNoAnswer}
                  language={language}
                />
              )}
              
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
                      jsonHasImprovement ? 'bg-amber-100 border border-amber-300 text-amber-900'
                        : jsonIsCorrect ? 'bg-green-100 border border-green-300 text-green-800'
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
  const hasImprovement = isCorrect && Boolean(evaluation.localResult?.evaluation);
  return (
    <div className="w-full">
      <div className={cn('p-4 rounded-card transition-all duration-200 hover:shadow-md relative', hasImprovement ? 'bg-amber-50 border border-amber-200' : getStatusStyles(content))}>
        <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center">
          {hasImprovement ? (
            <Lightbulb className="h-5 w-5 text-amber-700" aria-label={t('exercise.correct')} />
          ) : isCorrect ? (
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

            {evaluation.localResult?.evaluation ? (
              <FractionBoundsFeedbackCard question={question} answer={answer} result={evaluation.localResult} language={language} />
            ) : (
              <ExerciseResultBanner
                isCorrect={isCorrect}
                isIncorrect={isIncorrect}
                hasAnswer={!hasNoAnswer}
                language={language}
              />
            )}
            
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
                <Badge variant="secondary" className={cn(
                  'px-3 py-1',
                  hasImprovement
                    ? 'bg-amber-100 border border-amber-300 text-amber-900'
                    : isCorrect
                    ? 'bg-green-100 border border-green-300 text-green-800'
                    : isIncorrect
                      ? 'bg-white border border-border text-muted-foreground'
                      : 'bg-neutral-bg text-neutral-muted'
                )}>
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
  const ui = useInterfaceTranslation();
  const { t, language } = useLanguage();
  const teaching = useTwoCardTeaching();
  const { selectedModelId } = useAdmin();
  const { userContext } = useUserContext();
  const [groupedExplanationProblem, setGroupedExplanationProblem] = useState<ProblemSubmission | null>(null);
  const [groupedExplanationRowId, setGroupedExplanationRowId] = useState<string | undefined>(undefined);
  const [groupedRetryPractice, setGroupedRetryPractice] = useState<GroupedRetryPractice | null>(null);
  const [groupedRetryPracticeLoading, setGroupedRetryPracticeLoading] = useState(false);
  const [groupedRetryPracticeError, setGroupedRetryPracticeError] = useState<string | null>(null);
  const [groupedRetryPracticeFeedback, setGroupedRetryPracticeFeedback] = useState<'like' | 'dislike' | null>(null);
  const [groupedRetryPracticeFeedbackLoading, setGroupedRetryPracticeFeedbackLoading] = useState(false);
  const [simpleExplanationLearningRows, setSimpleExplanationLearningRows] = useState<SafeHomeworkLearningRow[]>([]);
  const [simpleExplanationSourceId, setSimpleExplanationSourceId] = useState<string | undefined>(undefined);
  const [simpleExplanationTitle, setSimpleExplanationTitle] = useState<string | undefined>(undefined);
  const [groupedExplanationLearningRows, setGroupedExplanationLearningRows] = useState<SafeHomeworkLearningRow[]>([]);
  
  const handleShowExplanation = useCallback((
    question: string,
    answer: string,
    isCorrect: boolean,
    homeworkLearningRows: SafeHomeworkLearningRow[] = [],
    sourceId?: string,
    title?: string,
  ) => {
    setSimpleExplanationLearningRows(homeworkLearningRows);
    setSimpleExplanationSourceId(sourceId);
    setSimpleExplanationTitle(title || question);
    teaching.openFor(
      { prompt: question, userAnswer: answer, subject: 'math' },
      {
        response_language: language === 'fr' ? 'French' : 'English',
        grade_level: userContext?.student_level || 'High School',
        learning_style: userContext?.learning_style,
        country: userContext?.country,
      }
    );
  }, [language, teaching, userContext?.learning_style, userContext?.student_level, userContext?.country]);

  const handleShowGroupedExplanation = useCallback(async (problem: ProblemSubmission, rowId?: string) => {
    setGroupedExplanationProblem(problem);
    setGroupedExplanationRowId(rowId);
    setGroupedExplanationLearningRows(buildSafeHomeworkLearningRows(problem, rowId));
    setGroupedRetryPractice(null);
    setGroupedRetryPracticeError(null);
    setGroupedRetryPracticeFeedback(null);
    setGroupedRetryPracticeFeedbackLoading(false);
    setGroupedRetryPracticeLoading(true);

    try {
      const practice = await generateGroupedRetryPractice({
        problem,
        rowId,
        selectedModelId: selectedModelId || 'gpt-5',
        language,
        schoolLevel: userContext?.student_level,
        country: userContext?.country,
        curriculum: /^(france|fr)$/i.test(userContext?.country || '')
          ? 'Programme national français'
          : (userContext?.country ? `${userContext.country} curriculum` : undefined),
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

  const submitGroupedRetryPracticeFeedback = useCallback(async (vote: 'like' | 'dislike') => {
    const cacheEntryId = groupedRetryPractice?.cacheEntryId;
    if (!cacheEntryId || groupedRetryPracticeFeedbackLoading || groupedRetryPracticeFeedback === vote) return;

    setGroupedRetryPracticeFeedbackLoading(true);
    try {
      const { data: current, error: currentError } = await supabase
        .from('learner_explanations_cache')
        .select('quality_score')
        .eq('id', cacheEntryId)
        .single();

      if (currentError) throw currentError;

      const currentScore = current?.quality_score ?? 0;
      const nextScore =
        vote === 'like'
          ? groupedRetryPracticeFeedback === 'dislike'
            ? currentScore + 2
            : currentScore + 1
          : groupedRetryPracticeFeedback === 'like'
            ? currentScore - 2
            : currentScore - 1;

      const { error: updateError } = await supabase
        .from('learner_explanations_cache')
        .update({ quality_score: nextScore })
        .eq('id', cacheEntryId);

      if (updateError) throw updateError;

      setGroupedRetryPracticeFeedback(vote);
    } catch (error) {
      console.error('[AIResponse] Failed to save grouped explanation feedback:', error);
    } finally {
      setGroupedRetryPracticeFeedbackLoading(false);
    }
  }, [groupedRetryPractice?.cacheEntryId, groupedRetryPracticeFeedback, groupedRetryPracticeFeedbackLoading]);

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
              {language === 'fr' ? ui("Tout effacer") : 'Clear all'}
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
        onClose={() => {
          teaching.setOpen(false);
          setSimpleExplanationLearningRows([]);
          setSimpleExplanationSourceId(undefined);
          setSimpleExplanationTitle(undefined);
        }}
        loading={teaching.loading}
        sections={teaching.sections}
        error={teaching.error}
        onLike={() => void teaching.submitFeedback('like')}
        onDislike={() => void teaching.submitFeedback('dislike')}
        feedback={teaching.feedback}
        feedbackLoading={teaching.feedbackLoading}
        onTryAgain={() => teaching.setOpen(false)}
        homeworkLearningRows={simpleExplanationLearningRows}
        homeworkSourceId={simpleExplanationSourceId}
        homeworkTitle={simpleExplanationTitle}
      />

      <GroupedProblemExplanationModal
        problem={groupedExplanationProblem}
        practice={groupedRetryPractice}
        loading={groupedRetryPracticeLoading}
        error={groupedRetryPracticeError}
        rowId={groupedExplanationRowId}
        homeworkLearningRows={groupedExplanationLearningRows}
        onLike={() => void submitGroupedRetryPracticeFeedback('like')}
        onDislike={() => void submitGroupedRetryPracticeFeedback('dislike')}
        feedback={groupedRetryPracticeFeedback}
        feedbackLoading={groupedRetryPracticeFeedbackLoading}
        onRetry={groupedExplanationProblem ? () => void handleShowGroupedExplanation(groupedExplanationProblem, groupedExplanationRowId) : undefined}
        onClose={() => {
          setGroupedExplanationProblem(null);
          setGroupedExplanationRowId(undefined);
          setGroupedExplanationLearningRows([]);
          setGroupedRetryPractice(null);
          setGroupedRetryPracticeError(null);
          setGroupedRetryPracticeFeedback(null);
          setGroupedRetryPracticeFeedbackLoading(false);
          setGroupedRetryPracticeLoading(false);
        }}
      />
    </div>
  );
};

export default AIResponse;
