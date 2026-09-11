import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X, ChevronRight, Trophy, Zap } from 'lucide-react';
import type { Choice, Question, QuizBank } from '@/types/quiz-bank';
import { QuestionCard } from './QuestionCard';
import {
  gradeQuizWithDetails,
  shuffle,
  evaluateQuestion,
  scoreQuestionWithPenalty,
  type QuizQuestionGradeDetail,
} from '@/utils/quizEvaluation';
import { useSubmitBankAttempt } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { useUserContext } from '@/hooks/useUserContext';
import { normalizeLearningStyle } from '@/types/learning-style';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { trackLearningInteraction } from '@/services/learningAnalytics';

interface QuizOverlayProps {
  bank: QuizBank;
  userId: string;
  onClose: () => void;
  recordAttempt?: boolean;
  embedded?: boolean;
}

function XpPill({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.7 }}
      animate={{ opacity: [0, 1, 1, 0], y: -60, scale: 1 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "none",
        background: "linear-gradient(135deg, #22C55E, #16A34A)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "15px",
        padding: "6px 18px",
        borderRadius: "999px",
        boxShadow: "0 4px 24px rgba(34,197,94,0.35)",
        whiteSpace: "nowrap",
      }}
    >
      ✦ Bonne réponse !
    </motion.div>
  );
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
    if (question.kind === 'operation-posee') {
      return answer.correct ? 'Correct operation-posee submission' : 'Incorrect operation-posee submission';
    }
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

function getVisualSubtype(question: Question): string | undefined {
  return question.kind === 'visual' ? (question.visual as any)?.subtype : undefined;
}

function getQuizTopicId(bank: QuizBank): string | undefined {
  return (bank as any).topicId || (bank as any).topic_id;
}

function getQuizObjectiveId(question: Question, bank: QuizBank): string | undefined {
  return (question as any).objectiveId || (question as any).objective_id || (bank as any).objectiveId || (bank as any).objective_id;
}

function getQuestionDifficulty(question: Question): string | undefined {
  return (question as any).difficulty;
}

function formatScoreValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

export function QuizOverlay({ bank, userId, onClose, recordAttempt = true, embedded = false }: QuizOverlayProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questionGrades, setQuestionGrades] = useState<Record<string, QuizQuestionGradeDetail>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startTs] = useState<number>(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [questionResult, setQuestionResult] = useState<boolean | null>(null);
  const [showXpPill, setShowXpPill] = useState(false);
  const submitAttempt = useSubmitBankAttempt();
  const { user } = useAuth();
  const { userContext } = useUserContext();
  const { language } = useLanguage();
  const teaching = useTwoCardTeaching();
  const quizStartedRef = React.useRef(false);
  const viewedQuestionsRef = React.useRef<Set<string>>(new Set());
  const questionViewStartedAtRef = React.useRef<number>(Date.now());
  const questionAttemptCountsRef = React.useRef<Record<string, number>>({});
  const remediationUsedRef = React.useRef(false);
  const remediationQuestionRef = React.useRef<{
    questionId: string;
    questionKind: string;
    learningStyleUsed: string;
  } | null>(null);

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
  const gradedQuiz = useMemo(
    () => gradeQuizWithDetails(questions, questionGrades),
    [questions, questionGrades],
  );

  useEffect(() => {
    if (quizStartedRef.current) return;
    quizStartedRef.current = true;
    trackLearningInteraction({
      studentId: userId,
      eventType: 'quiz_started',
      learningStyleUsed: userContext?.learning_style,
      quizId: bank.quizBankId,
      topicId: getQuizTopicId(bank),
      metadata: {
        questionCount: questions.length,
        bankTitle: bank.title,
      },
    });
  }, [bank, questions.length, userContext?.learning_style, userId]);

  useEffect(() => {
    if (!currentQuestion) return;
    questionViewStartedAtRef.current = Date.now();
    if (viewedQuestionsRef.current.has(currentQuestion.id)) return;
    viewedQuestionsRef.current.add(currentQuestion.id);

    trackLearningInteraction({
      studentId: userId,
      eventType: 'quiz_question_viewed',
      learningStyleUsed: userContext?.learning_style,
      quizId: bank.quizBankId,
      questionId: currentQuestion.id,
      questionKind: currentQuestion.kind,
      visualSubtype: getVisualSubtype(currentQuestion),
      difficulty: getQuestionDifficulty(currentQuestion),
      topicId: getQuizTopicId(bank),
      objectiveId: getQuizObjectiveId(currentQuestion, bank),
    });
  }, [bank, currentQuestion, userContext?.learning_style, userId]);

  const onAnswer = (qid: string, value: any) => {
    setAnswers(a => ({ ...a, [qid]: value }));
  };

  const handleQuestionSubmit = () => {
    if (!currentQuestion) return;
    const currentAnswer = answers[currentQuestion.id];
    const correct = evaluateQuestion(currentQuestion, currentAnswer);
    const attemptNumber = (questionAttemptCountsRef.current[currentQuestion.id] || 0) + 1;
    questionAttemptCountsRef.current[currentQuestion.id] = attemptNumber;
    const timeToAnswerMs = Date.now() - questionViewStartedAtRef.current;
    const maxPoints = currentQuestion.points ?? 1;
    const { awardedPoints, penaltyFactor } = scoreQuestionWithPenalty(maxPoints, attemptNumber, correct);

    trackLearningInteraction({
      studentId: userId,
      eventType: 'quiz_answer_submitted',
      learningStyleUsed: userContext?.learning_style,
      quizId: bank.quizBankId,
      questionId: currentQuestion.id,
      questionKind: currentQuestion.kind,
      visualSubtype: getVisualSubtype(currentQuestion),
      difficulty: getQuestionDifficulty(currentQuestion),
      topicId: getQuizTopicId(bank),
      objectiveId: getQuizObjectiveId(currentQuestion, bank),
      wasCorrect: correct,
      attemptNumber,
      timeToAnswerMs,
      hintUsed: false,
    });

    if (!correct) {
      trackLearningInteraction({
        studentId: userId,
        eventType: 'quiz_wrong_answer',
        learningStyleUsed: userContext?.learning_style,
        quizId: bank.quizBankId,
        questionId: currentQuestion.id,
        questionKind: currentQuestion.kind,
        visualSubtype: getVisualSubtype(currentQuestion),
        difficulty: getQuestionDifficulty(currentQuestion),
        topicId: getQuizTopicId(bank),
        objectiveId: getQuizObjectiveId(currentQuestion, bank),
        wasCorrect: false,
        attemptNumber,
        timeToAnswerMs,
        hintUsed: false,
      });
    }

    if (remediationUsedRef.current && remediationQuestionRef.current?.questionId !== currentQuestion.id) {
      trackLearningInteraction({
        studentId: userId,
        eventType: 'quiz_answer_after_remediation',
        learningStyleUsed: userContext?.learning_style,
        supportType: remediationQuestionRef.current?.learningStyleUsed,
        quizId: bank.quizBankId,
        questionId: currentQuestion.id,
        questionKind: currentQuestion.kind,
        visualSubtype: getVisualSubtype(currentQuestion),
        difficulty: getQuestionDifficulty(currentQuestion),
        topicId: getQuizTopicId(bank),
        objectiveId: getQuizObjectiveId(currentQuestion, bank),
        wasCorrect: correct,
        attemptNumber,
        timeToAnswerMs,
        metadata: {
          originalQuestionKind: remediationQuestionRef.current?.questionKind,
          remediationStyle: remediationQuestionRef.current?.learningStyleUsed,
          wasNextAnswerCorrect: correct,
        },
      });
      remediationUsedRef.current = false;
      remediationQuestionRef.current = null;
    }

    setQuestionGrades(prev => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        attemptCount: attemptNumber,
        correct,
        awardedPoints,
        maxPoints,
        penaltyFactor,
        answeredCorrectlyOnAttempt: correct ? attemptNumber : null,
        finalAnswer: currentAnswer,
      },
    }));
    setQuestionResult(correct);
    if (correct) setShowXpPill(true);
    setQuestionSubmitted(true);
  };

  useEffect(() => {
    if (!currentQuestion || questionSubmitted) return;
    if (currentQuestion.kind !== 'operation-posee') return;

    const currentAnswer = answers[currentQuestion.id];
    if (currentAnswer?.correct === true) {
      handleQuestionSubmit();
    }
  }, [answers, currentQuestion, questionSubmitted]);

  const handleShowExplanation = useCallback(async () => {
    if (!currentQuestion) return;

    const learningStyle = normalizeLearningStyle(userContext?.learning_style);
    const responseLanguage = /^fr/i.test(language) ? 'French' : 'English';
    trackLearningInteraction({
      studentId: userId,
      eventType: 'quiz_remediation_clicked',
      learningStyleUsed: learningStyle,
      supportType: learningStyle,
      quizId: bank.quizBankId,
      questionId: currentQuestion.id,
      questionKind: currentQuestion.kind,
      visualSubtype: getVisualSubtype(currentQuestion),
      difficulty: getQuestionDifficulty(currentQuestion),
      topicId: getQuizTopicId(bank),
      objectiveId: getQuizObjectiveId(currentQuestion, bank),
      metadata: {
        originalQuestionKind: currentQuestion.kind,
      },
    });

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
    remediationUsedRef.current = true;
    remediationQuestionRef.current = {
      questionId: currentQuestion.id,
      questionKind: currentQuestion.kind,
      learningStyleUsed: learningStyle,
    };
    trackLearningInteraction({
      studentId: userId,
      eventType: 'quiz_remediation_opened',
      learningStyleUsed: learningStyle,
      supportType: learningStyle,
      quizId: bank.quizBankId,
      questionId: currentQuestion.id,
      questionKind: currentQuestion.kind,
      visualSubtype: getVisualSubtype(currentQuestion),
      difficulty: getQuestionDifficulty(currentQuestion),
      topicId: getQuizTopicId(bank),
      objectiveId: getQuizObjectiveId(currentQuestion, bank),
      metadata: {
        originalQuestionKind: currentQuestion.kind,
        remediationStyle: learningStyle,
      },
    });
  }, [answers, bank, currentQuestion, language, teaching, userContext?.learning_style, userContext?.student_level, userId]);

  const handleRetry = useCallback(() => {
    setQuestionSubmitted(false);
    setQuestionResult(null);
    setShowXpPill(false);
    setAnswers(prev => {
      const next = { ...prev };
      if (currentQuestion) delete next[currentQuestion.id];
      return next;
    });
  }, [currentQuestion]);

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setQuestionSubmitted(false);
      setQuestionResult(null);
    } else {
      // Last question — submit full attempt
      if (recordAttempt && user && bank.quizBankId !== "__empty__") {
        try {
          await submitAttempt.mutateAsync({
            bankId: bank.quizBankId,
            userId: user.id,
            score: gradedQuiz.score,
            maxScore: gradedQuiz.maxScore,
            tookSeconds: Math.round((Date.now() - startTs) / 1000),
            details: gradedQuiz.details,
          });
        } catch (error) {
          console.error('Failed to save attempt:', error);
        }
      }
      setSubmitted(true);
      trackLearningInteraction({
        studentId: userId,
        eventType: 'quiz_completed',
        learningStyleUsed: userContext?.learning_style,
        quizId: bank.quizBankId,
        topicId: getQuizTopicId(bank),
        wasCorrect: gradedQuiz.score === gradedQuiz.maxScore,
        metadata: {
          score: gradedQuiz.score,
          total: gradedQuiz.maxScore,
          percent: gradedQuiz.maxScore ? Math.round((100 * gradedQuiz.score) / gradedQuiz.maxScore) : 0,
          tookSeconds: Math.round((Date.now() - startTs) / 1000),
        },
      });
    }
  };

  const handleRetest = () => {
    setAnswers({});
    setQuestionGrades({});
    setSubmitted(false);
    setCurrentIndex(0);
    setQuestionSubmitted(false);
    setQuestionResult(null);
    setShowXpPill(false);
    questionAttemptCountsRef.current = {};
    remediationUsedRef.current = false;
    remediationQuestionRef.current = null;
  };

  // Final summary screen
  if (submitted) {
    const pct = gradedQuiz.maxScore ? Math.round((100 * gradedQuiz.score) / gradedQuiz.maxScore) : 0;
    const xpEarned = gradedQuiz.score * 10;
    const isMastered = pct >= 80;

    return (
      <div
        className={embedded
          ? "flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center"
          : "fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-8 text-center"}
        style={{ background: '#F3F6FA' }}
      >
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ background: '#F2FBF8', border: '1.5px solid #12C6A0' }}
        >
          <Trophy className="h-10 w-10" style={{ color: '#12C6A0' }} />
        </div>

        <h2
          className="mb-1 text-2xl font-bold"
          style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}
        >
          {pct >= 80 ? 'Bonne séance !' : pct >= 50 ? 'Pas mal !' : "Continue d'essayer !"}
        </h2>
        <p className="mb-6 text-sm" style={{ color: '#667085' }}>{bank.title}</p>

        <div className="mb-5 grid w-full max-w-xs grid-cols-3 gap-3">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: '#F2FBF8', border: '0.5px solid #9FE1CB' }}
          >
            <p className="text-xl font-bold" style={{ color: '#085041', fontFamily: 'Poppins, sans-serif' }}>
              {formatScoreValue(gradedQuiz.score)}/{formatScoreValue(gradedQuiz.maxScore)}
            </p>
            <p className="text-xs" style={{ color: '#0F6E56' }}>Reponses</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: '#FAEEDA', border: '0.5px solid #FAC775' }}
          >
            <p className="text-xl font-bold" style={{ color: '#633806', fontFamily: 'Poppins, sans-serif' }}>
              +{formatScoreValue(xpEarned)}
            </p>
            <p className="text-xs" style={{ color: '#854F0B' }}>XP gagne</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: '#FAEEDA', border: '0.5px solid #FAC775' }}
          >
            <p className="text-xl font-bold" style={{ color: '#633806', fontFamily: 'Poppins, sans-serif' }}>
              {pct}%
            </p>
            <p className="text-xs" style={{ color: '#854F0B' }}>Score</p>
          </div>
        </div>

        {isMastered && (
          <div
            className="mb-6 flex w-full max-w-xs items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: '#F2FBF8', border: '0.5px solid #9FE1CB' }}
          >
            <Zap className="h-4 w-4 flex-shrink-0" style={{ color: '#0A8C72' }} />
            <p className="text-left text-sm" style={{ color: '#085041' }}>
              <span className="font-semibold">Notion maitrisee : </span>{bank.title}
            </p>
          </div>
        )}

        <div className="flex w-full max-w-xs gap-3">
          <button
            onClick={handleRetest}
            className="flex-1 rounded-xl py-3 text-sm font-semibold"
            style={{
              border: '1.5px solid #EAECEF',
              background: 'white',
              color: '#0F172A',
              fontFamily: 'Poppins, sans-serif',
              cursor: 'pointer',
            }}
          >
            Refaire
          </button>
          <button
            onClick={onClose}
            className="flex-[2] rounded-xl py-3 text-sm font-bold"
            style={{
              background: '#12C6A0',
              border: 'none',
              color: '#0F172A',
              fontFamily: 'Poppins, sans-serif',
              cursor: 'pointer',
            }}
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // Step-by-step question flow
  return (
    <div
      className={embedded ? "flex h-full min-h-0 flex-col" : "fixed inset-0 z-[200] flex flex-col"}
      style={{ background: '#F3F6FA' }}
    >
      <div style={{ background: 'white', borderBottom: '0.5px solid #EAECEF' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ border: '0.5px solid #EAECEF', background: 'white', cursor: 'pointer' }}
          >
            <X className="h-4 w-4" style={{ color: '#667085' }} />
          </button>
          <div className="flex-1">
            <div className="overflow-hidden rounded-full" style={{ height: '5px', background: '#EAECEF' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#12C6A0' }}
                animate={{ width: `${((currentIndex + (questionSubmitted ? 1 : 0)) / Math.max(questions.length, 1)) * 100}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              />
            </div>
            <p className="mt-0.5 text-xs" style={{ color: '#667085', fontFamily: 'Poppins, sans-serif' }}>
              {bank.title}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold" style={{ color: '#12C6A0', fontFamily: 'Poppins, sans-serif' }}>
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {questions.length === 0 ? (
          <p className="text-sm" style={{ color: '#667085' }}>Aucune question disponible pour le moment.</p>
        ) : currentQuestion ? (
          <div
            className="rounded-2xl bg-white p-4"
            style={{ border: '0.5px solid #EAECEF' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <QuestionCard
                  question={currentQuestion}
                  onChange={val => onAnswer(currentQuestion.id, val)}
                  submittedAnswer={questionSubmitted ? answers[currentQuestion.id] : undefined}
                  isCorrect={questionSubmitted ? (questionResult ?? undefined) : undefined}
                  hideCorrect={questionSubmitted && questionResult === false}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      <div className="px-4 pt-3" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 24px))' }}>
        {!questionSubmitted ? (
          <button
            onClick={handleQuestionSubmit}
            disabled={questions.length === 0}
            className="w-full rounded-2xl py-4 text-sm font-bold"
            style={{
              background: questions.length === 0 ? '#EAECEF' : '#12C6A0',
              color: questions.length === 0 ? '#B4B2A9' : '#0F172A',
              border: 'none',
              fontFamily: 'Poppins, sans-serif',
              cursor: questions.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '15px',
            }}
          >
            Valider
          </button>
        ) : (
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: questionResult ? '#EAF3DE' : '#FEF3C7',
              border: `1px solid ${questionResult ? '#9FE1CB' : '#FCD34D'}`,
            }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: questionResult ? '#12C6A0' : '#EF4444' }}
            >
              {questionResult
                ? <Check className="h-5 w-5" style={{ color: '#0F172A' }} />
                : <X className="h-5 w-5" style={{ color: '#0F172A' }} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: questionResult ? '#27500A' : '#633806', fontFamily: 'Poppins, sans-serif' }}>
                {questionResult ? 'Exacte !' : 'Pas cette fois...'}
              </p>
              {questionResult === false && (
                <button
                  type="button"
                  onClick={handleShowExplanation}
                  disabled={teaching.loading}
                  style={{ color: '#854F0B', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px', textDecoration: 'underline' }}
                >
                  {teaching.loading ? 'Préparation...' : "Voir l'explication"}
                </button>
              )}
            </div>
            {questionResult && (
              <span
                className="flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold"
                style={{ background: '#FAC775', color: '#633806' }}
              >
                +10 XP
              </span>
            )}
            {questionResult ? (
              <button
                onClick={handleNext}
                className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
                style={{ background: '#12C6A0', border: 'none', color: '#0F172A', fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}
              >
                {currentIndex < questions.length - 1 ? 'Suivant' : 'Résultats'}
              </button>
            ) : (
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={handleRetry}
                  className="rounded-xl px-3 py-2 text-sm font-bold"
                  style={{ background: 'white', border: '1.5px solid #EAECEF', color: '#0F172A', fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}
                >
                  Réessayer
                </button>
                <button
                  onClick={handleNext}
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{ background: '#12C6A0', border: 'none', color: '#0F172A', fontFamily: 'Poppins, sans-serif', cursor: 'pointer' }}
                >
                  {currentIndex < questions.length - 1 ? 'Suivant' : 'Résultats'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ExplanationModal
        open={teaching.open}
        onClose={() => teaching.setOpen(false)}
        loading={teaching.loading}
        sections={teaching.sections}
        error={teaching.error}
        onLike={() => void teaching.submitFeedback('like')}
        onDislike={() => void teaching.submitFeedback('dislike')}
        feedback={teaching.feedback}
        feedbackLoading={teaching.feedbackLoading}
        exerciseQuestion={currentQuestion?.prompt}
      />
      {showXpPill && <XpPill onDone={() => setShowXpPill(false)} />}
    </div>
  );
}
