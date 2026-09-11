import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizBank } from '@/hooks/useQuizBank';
import { QuizOverlay } from './QuizOverlay';
import { useAuth } from '@/context/AuthContext';
import { activeYouTubePlayer, activeVideoElement } from './VideoPlayerBox';

export function QuizOverlayController() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const quizBankId = searchParams.get('quiz');
  const practiceQuestionIds = searchParams.get('practiceQuestions')?.split(',').filter(Boolean) ?? [];

  const { data: bank, isLoading } = useQuizBank(quizBankId || undefined);
  const practiceBank = useMemo(() => {
    if (!bank || !practiceQuestionIds.length) return bank;
    const selectedIds = new Set(practiceQuestionIds);
    const questions = bank.questions.filter((question) => selectedIds.has(question.id));
    return questions.length ? { ...bank, questions, shuffle: false } : bank;
  }, [bank, practiceQuestionIds]);

  // Pause video when quiz opens, resume when it closes
  useEffect(() => {
    if (quizBankId) {
      activeYouTubePlayer?.pauseVideo?.();
      activeVideoElement?.pause?.();
    }
    return () => {
      activeYouTubePlayer?.playVideo?.();
      activeVideoElement?.play?.();
    };
  }, [quizBankId]);

  const handleClose = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('quiz');
    params.delete('practiceQuestions');
    navigate({ search: params.toString() }, { replace: true });
  };

  if (!quizBankId || !practiceBank || practiceBank.quizBankId === "__empty__" || isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <QuizOverlay
      bank={practiceBank}
      userId={user.id}
      onClose={handleClose}
    />
  );
}
