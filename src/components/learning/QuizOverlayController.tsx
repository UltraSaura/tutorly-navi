import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuizBank } from '@/hooks/useQuizBank';
import { QuizOverlay } from './QuizOverlay';
import { useLearner } from '@/context/FamilyProfileContext';
import { activeYouTubePlayer, activeVideoElement } from './VideoPlayerBox';
import { useExerciseCurriculum } from '@/hooks/useCoordinateEligibility';
import { usePracticeBankCatalogue } from '@/hooks/usePracticeBankCatalogue';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { canUseExerciseForLearner } from '@/features/practice/exerciseCurriculum';
import { normalizeSchoolLevel } from '@/domain/schoolLevels';

export function QuizOverlayController() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useLearner();
  const curriculum = useExerciseCurriculum();
  const location = useLocation();
  const params = useParams();
  const inPractice = location.pathname.startsWith('/practice/');
  const dashboard = useSubjectDashboard(inPractice ? params.subject ?? '' : '');
  const catalogueTopics = useMemo(() => inPractice ? (dashboard.data?.categories ?? []).flatMap(category => category.topics) : [], [inPractice, dashboard.data]);
  const catalogue = usePracticeBankCatalogue(catalogueTopics, curriculum.consistent ? curriculum.country : null, curriculum.level);
  const quizBankId = searchParams.get('quiz');
  const selectedQuestionIds = searchParams.get('practiceQuestions') ?? '';
  const practiceQuestionIds = useMemo(() => selectedQuestionIds.split(',').filter(Boolean), [selectedQuestionIds]);

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

  if (curriculum.pending || (inPractice && (dashboard.isLoading || catalogue.isLoading))) return <p role="status">Chargement des exercices du thème…</p>;
  const bankLevelMatches = !practiceBank.schoolLevels?.length || practiceBank.schoolLevels.some(level => normalizeSchoolLevel(level) === curriculum.level);
  const allowed = curriculum.consistent && bankLevelMatches && practiceBank.questions.length > 0
    && practiceBank.questions.every(question => canUseExerciseForLearner(question, curriculum.country, curriculum.level))
    && (!inPractice || catalogue.eligibleBankIds.has(practiceBank.quizBankId));
  if (!allowed) return <div role="alert" className="rounded-xl border bg-white p-4"><p>Ce quiz n’est pas disponible pour le programme, le niveau ou le thème sélectionné.</p><button className="mt-3 min-h-11 rounded-xl border px-4" onClick={handleClose}>Retour aux thèmes</button></div>;

  return (
    <QuizOverlay
      key={`${curriculum.sessionKey}:${practiceBank.quizBankId}`}
      bank={practiceBank}
      userId={user.id}
      onClose={handleClose}
    />
  );
}
