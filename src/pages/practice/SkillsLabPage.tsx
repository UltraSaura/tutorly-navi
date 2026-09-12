import { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { PracticeActivityPlayer } from '@/features/practice/PracticeActivityPlayer';
import { registerCrossSubjectActivityRenderers } from '@/features/practice/crossSubject/registerCrossSubjectActivities';
import { registerMathSkillActivityRenderers } from '@/features/practice/math/registerMathSkillActivities';
import { getPracticeActivityCatalog } from '@/features/practice/practiceActivityCatalog';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { useAuth } from '@/context/AuthContext';
import { usePracticeActivityMastery } from '@/hooks/usePracticeActivityMastery';
import { getAgeLearningConfig } from '@/config/ageConfig';
import { createPracticeActivitySession } from '@/services/practiceActivityService';
import { recordSpacedReviewAttempt } from '@/services/spacedReviewRepository';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

registerMathSkillActivityRenderers();
registerCrossSubjectActivityRenderers();

const SUBJECT_ALIASES: Record<string, string> = {
  math: 'mathematiques', maths: 'mathematiques', mathematics: 'mathematiques', mathematiques: 'mathematiques',
  french: 'francais', francais: 'francais', english: 'anglais', anglais: 'anglais', science: 'sciences', sciences: 'sciences',
  history: 'histoire', histoire: 'histoire', geography: 'geographie', geographie: 'geographie',
};

export function canonicalPracticeSubject(subject: string): string {
  const normalized = subject.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  return SUBJECT_ALIASES[normalized] ?? subject;
}

export default function SkillsLabPage() {
  const ui = useInterfaceTranslation();
  const navigate = useNavigate();
  const { subject = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const activeSchoolLevel = useActiveSchoolLevel();
  const mastery = usePracticeActivityMastery();
  const ageConfig = getAgeLearningConfig(activeSchoolLevel.normalizedLevel);
  const catalogSubject = canonicalPracticeSubject(subject);
  const reviewConceptId = searchParams.get('review')?.trim() || undefined;
  const reviewHadIncorrect = useRef(false);
  const lastReviewAttempt = useRef<LearningAttemptResult | null>(null);

  const session = useMemo(
    () => createPracticeActivitySession({
      activities: getPracticeActivityCatalog(),
      subjectId: catalogSubject,
      ageBand: ageConfig.band,
      conceptId: reviewConceptId,
      maxActivities: reviewConceptId ? 1 : undefined,
    }),
    [catalogSubject, ageConfig.band, reviewConceptId],
  );

  const practiceLabel = ageConfig.practiceLabel;
  const backRoute = subject ? `/practice/${subject}` : '/practice';

  const handleAttempt = useCallback((attempt: LearningAttemptResult) => {
    mastery.recordAttempt(attempt);
    if (!reviewConceptId) return;
    if (!attempt.correct) reviewHadIncorrect.current = true;
    lastReviewAttempt.current = attempt;
  }, [mastery, reviewConceptId]);

  const handleComplete = useCallback(() => {
    if (reviewConceptId && lastReviewAttempt.current) {
      const reviewResult = {
        ...lastReviewAttempt.current,
        correct: !reviewHadIncorrect.current,
      };
      void recordSpacedReviewAttempt(reviewResult, reviewConceptId);
    }
    navigate(backRoute);
  }, [backRoute, navigate, reviewConceptId]);

  if (!subject) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <PageMeta title={ui('Practice')} description={ui('Practice skills by subject.')} />
        <div className="rounded-2xl border bg-card p-6 text-center">
          <h1 className="text-2xl font-bold">{ui('Choose a subject first')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{ui('Open Practice and choose the subject you want to strengthen.')}</p>
          <Button className="mt-4" onClick={() => navigate('/practice')}>{ui('Back to Practice')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6 sm:px-6">
      <PageMeta title={`${practiceLabel} · ${subject}`} description={ui('Personalized skill practice.')} />
      <PracticeActivityPlayer
        activities={session.activities}
        studentId={user?.id}
        sessionTitle={`${practiceLabel} · ${subject}`}
        onAttempt={handleAttempt}
        onExit={() => navigate(backRoute)}
        onSessionComplete={handleComplete}
      />
    </div>
  );
}
