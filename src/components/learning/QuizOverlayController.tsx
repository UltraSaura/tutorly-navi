import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizBank } from '@/hooks/useQuizBank';
import { QuizOverlay } from './QuizOverlay';
import { useAuth } from '@/context/AuthContext';

export function QuizOverlayController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const quizBankId = searchParams.get('quiz');

  const { data: bank, isLoading } = useQuizBank(quizBankId || undefined);

  const handleClose = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('quiz');
    navigate({ search: params.toString() }, { replace: true });
  };

  if (!quizBankId || !bank || bank.quizBankId === "__empty__" || isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <QuizOverlay
      bank={bank}
      userId={user.id}
      onClose={handleClose}
    />
  );
}

