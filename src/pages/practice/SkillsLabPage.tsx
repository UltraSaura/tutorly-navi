import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { PracticeActivityPlayer } from '@/features/practice/PracticeActivityPlayer';
import { getPracticeActivityCatalog } from '@/features/practice/practiceActivityCatalog';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { useAuth } from '@/context/AuthContext';
import { usePracticeActivityMastery } from '@/hooks/usePracticeActivityMastery';
import { getAgeLearningConfig } from '@/config/ageConfig';
import { createPracticeActivitySession } from '@/services/practiceActivityService';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

export default function SkillsLabPage() {
  const ui = useInterfaceTranslation();
  const navigate = useNavigate();
  const { subject = '' } = useParams();
  const { user } = useAuth();
  const activeSchoolLevel = useActiveSchoolLevel();
  const mastery = usePracticeActivityMastery();
  const ageConfig = getAgeLearningConfig(activeSchoolLevel.normalizedLevel);

  const session = useMemo(
    () =>
      createPracticeActivitySession({
        activities: getPracticeActivityCatalog(),
        subjectId: subject,
        ageBand: ageConfig.band,
      }),
    [subject, ageConfig.band],
  );

  const practiceLabel = ageConfig.practiceLabel;
  const backRoute = subject ? `/practice/${subject}` : '/practice';

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
        onAttempt={mastery.recordAttempt}
        onExit={() => navigate(backRoute)}
        onSessionComplete={() => navigate(backRoute)}
      />
    </div>
  );
}
