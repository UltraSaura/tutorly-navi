import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Choice, Question, QuizBank } from '@/types/quiz-bank';
import { QuestionCard } from './QuestionCard';
import { gradeQuiz, shuffle } from '@/utils/quizEvaluation';
import { evaluateQuestion } from '@/utils/quizEvaluation';
import { useSubmitBankAttempt } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { useUserContext } from '@/hooks/useUserContext';
import { normalizeLearningStyle } from '@/types/learning-style';
import { useLanguage } from '@/context/SimpleLanguageContext';

interface QuizOverlayProps {
  bank: QuizBank;
  userId: string;
  onClose: () => void;
}

function getQuestionChoices(question: Question): Choice[] {
  return 'choices' in question && Array.isArray(question.choices) ? question.choices : [];
}

function formatQuizQuestionForExplanation(question: Question): string {
  const choices = getQuestionChoices(question);
  const choiceText = choices.length
    ? `\n\nChoices:\n${choices.map(choice => `${choice.id}. ${choice.label}`).join('\n')}`
    : '';

  return `${question.prompt}${choiceText}`;
}

function formatQuizAnswerForExplanation(question: Question, answer: any): string {
  if (answer === undefined || answer === null || answer === '') {
    return 'Not answered';
  }

  const choiceLabels = new Map(getQuestionChoices(question).map(choice => [choice.id, choice.label]));
  const formatChoiceValue = (value: string) => choiceLabels.get(value) ?? value;

  if (Array.isArray(answer)) {
    return answer.length ? answer.map(value => formatChoiceValue(String(value))).join(', ') : 'Not answered';
  }

  if (typeof answer === 'object') {
    if ('numerator' in answer || 'denominator' in answer) {
      const numerator = answer.numerator || '?';
      const denominator = answer.denominator || '?';
      return `${numerator} / ${denominator}`;
    }

    const values = Object.values(answer)
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(value => String(value));

    return values.length ? values.join(', ') : 'Not answered';
  }

  return formatChoiceValue(String(answer));
}

export function QuizOverlay({ bank, userId, onClose }: QuizOverlayProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startTs] = useState<number>(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [questionResult, setQuestionResult] = useState<boolean | null>(null);
  const submitAttempt = useSubmitBankAttempt();
  const { user } = useAuth();
  const { userContext } = useUserContext();
  const { language } = useLanguage();
  const teaching = useTwoCardTeaching();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const questions = useMemo(() => {
    return bank.shuffle ? shuffle([...bank.questions]) : bank.questions;
  }, [bank]);

  const currentQuestion = questions[currentIndex];

  const onAnswer = (qid: string, value: any) => {
    setAnswers(a => ({ ...a, [qid]: value }));
  };

  const handleQuestionSubmit = () => {
    if (!currentQuestion) return;
    const correct = evaluateQuestion(currentQuestion, answers[currentQuestion.id]);
    setQuestionResult(correct);
    setQuestionSubmitted(true);
  };

  const handleShowExplanation = useCallback(async () => {
    if (!currentQuestion) return;

    const learningStyle = normalizeLearningStyle(userContext?.learning_style);
    const responseLanguage = /^fr/i.test(language) ? 'French' : 'English';

    await teaching.openFor(
      {
        prompt: formatQuizQuestionForExplanation(currentQuestion),
        userAnswer: formatQuizAnswerForExplanation(currentQuestion, answers[currentQuestion.id]),
        subject: 'math',
      },
      {
        response_language: responseLanguage,
        grade_level: userContext?.student_level,
        learning_style: learningStyle,
      }
    );
  }, [answers, currentQuestion, language, teaching, userContext?.learning_style, userContext?.student_level]);

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setQuestionSubmitted(false);
      setQuestionResult(null);
    } else {
      // Last question — submit full attempt
      const g = gradeQuiz(questions, answers);
      if (user && bank.quizBankId !== "__empty__") {
        try {
          await submitAttempt.mutateAsync({
            bankId: bank.quizBankId,
            userId: user.id,
            score: g.score,
            maxScore: g.maxScore,
            tookSeconds: Math.round((Date.now() - startTs) / 1000)
          });
        } catch (error) {
          console.error('Failed to save attempt:', error);
        }
      }
      setSubmitted(true);
    }
  };

  const handleRetest = () => {
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
    setQuestionSubmitted(false);
    setQuestionResult(null);
  };

  // Final summary screen
  if (submitted) {
    const g = gradeQuiz(questions, answers);
    const pct = g.maxScore ? Math.round((100 * g.score) / g.maxScore) : 0;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{bank.title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div>
            <p className="text-lg">Score: {g.score} / {g.maxScore} ({pct}%)</p>
            <div className="w-full h-3 bg-neutral-200 rounded-full mt-2">
              <div
                className="h-3 bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {g.details.map((d) => {
              const q = questions.find(q => q.id === d.questionId);
              return (
                <div
                  key={d.questionId}
                  className={cn(
                    "rounded-2xl border p-3",
                    d.correct
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-red-500 bg-red-50 dark:bg-red-950/20"
                  )}
                >
                  <p className="font-medium">{q?.prompt ?? "Question"}</p>
                  <p className={d.correct ? "text-green-600" : "text-red-600"}>
                    {d.correct ? "Correct" : "Incorrect"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRetest} className="flex-1">
              Retest
            </Button>
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Step-by-step question flow
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{bank.title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close quiz">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress indicator */}
        {questions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} / {questions.length}
            </p>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
              <div
                className="h-2 bg-primary rounded-full transition-all"
                style={{ width: `${((currentIndex + (questionSubmitted ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune question disponible pour le moment.
          </p>
        ) : currentQuestion ? (
          <div
            className={cn(
              "rounded-2xl transition-all",
              questionSubmitted && questionResult === true && "ring-2 ring-green-500",
              questionSubmitted && questionResult === false && "ring-2 ring-red-500"
            )}
          >
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              onChange={val => onAnswer(currentQuestion.id, val)}
            />

            {/* Feedback after submit */}
            {questionSubmitted && (
              <div className={cn(
                "mt-3 rounded-xl px-4 py-3 text-sm font-medium",
                questionResult
                  ? "bg-green-50 dark:bg-green-950/20 text-green-600"
                  : "bg-red-50 dark:bg-red-950/20 text-red-600"
              )}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{questionResult ? "✅ Correct !" : "❌ Incorrect"}</span>
                  {questionResult === false && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleShowExplanation}
                      disabled={teaching.loading}
                      className="self-start gap-2 bg-white text-red-700 hover:bg-red-50 dark:bg-card dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <HelpCircle className="h-4 w-4" />
                      {teaching.loading ? "Préparation..." : "Afficher l'explication"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          {!questionSubmitted ? (
            <Button
              onClick={handleQuestionSubmit}
              disabled={questions.length === 0}
              className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black"
            >
              Soumettre
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black gap-1"
            >
              {currentIndex < questions.length - 1 ? (
                <>Suivant <ChevronRight className="w-4 h-4" /></>
              ) : (
                "Voir le résultat"
              )}
            </Button>
          )}
        </div>
      </Card>

      <ExplanationModal
        open={teaching.open}
        onClose={() => teaching.setOpen(false)}
        loading={teaching.loading}
        sections={teaching.sections}
        error={teaching.error}
        exerciseQuestion={currentQuestion?.prompt}
      />
    </div>
  );
}
