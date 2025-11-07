import React, { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { QuizBank } from '@/types/quiz-bank';
import { QuestionCard } from './QuestionCard';
import { gradeQuiz, shuffle } from '@/utils/quizEvaluation';
import { useSubmitBankAttempt } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface QuizOverlayProps {
  bank: QuizBank;
  userId: string;
  onClose: () => void;
}

export function QuizOverlay({ bank, userId, onClose }: QuizOverlayProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startTs] = useState<number>(Date.now());
  const submitAttempt = useSubmitBankAttempt();
  const { user } = useAuth();

  // Lock body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const questions = useMemo(() => {
    return bank.shuffle ? shuffle([...bank.questions]) : bank.questions;
  }, [bank]);

  const onAnswer = (qid: string, value: any) => {
    setAnswers(a => ({ ...a, [qid]: value }));
  };

  const handleSubmit = async () => {
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
  };

  const handleRetest = () => {
    setAnswers({});
    setSubmitted(false);
  };

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{bank.title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close quiz">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {bank.description && (
          <p className="text-sm text-muted-foreground">{bank.description}</p>
        )}

        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune question disponible pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                onChange={val => onAnswer(q.id, val)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={questions.length === 0}
            className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black"
          >
            Soumettre
          </Button>
        </div>
      </Card>
    </div>
  );
}

