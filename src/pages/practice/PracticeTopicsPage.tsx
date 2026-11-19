import { useSubjectLabel } from '@/i18n/useSubjectLabel';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { getSubjectNameForSlug } from '@/utils/examSubjectMapping';
import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { useBankAttemptStatus } from '@/hooks/useQuizBank';
import { useLearner } from '@/context/FamilyProfileContext';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { useExerciseCurriculum } from '@/hooks/useCoordinateEligibility';
import { usePracticeBankCatalogue } from '@/hooks/usePracticeBankCatalogue';
import { normalizeSchoolLevel } from '@/domain/schoolLevels';
import { QuizOverlayController } from '@/components/learning/QuizOverlayController';
import { cn } from '@/lib/utils';
import type { Topic, Category } from '@/types/learning';

// ── Mastery helpers ──────────────────────────────────────────────────────────

type MasteryLevel = 'not_started' | 'needs_practice' | 'in_progress' | 'mastered';

function getMasteryLevel(bestScore: number | null | undefined, maxScore: number | null | undefined): MasteryLevel {
  if (bestScore == null || maxScore == null || maxScore === 0) return 'not_started';
  const pct = (bestScore / maxScore) * 100;
  if (pct >= 80) return 'mastered';
  if (pct >= 40) return 'in_progress';
  return 'needs_practice';
}

const masteryColors: Record<MasteryLevel, string> = {
  not_started: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  needs_practice: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  mastered: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
};

const masteryIcons: Record<MasteryLevel, React.ReactNode> = {
  not_started: <Circle className="h-3 w-3" />,
  needs_practice: <Circle className="h-3 w-3" />,
  in_progress: <Circle className="h-3 w-3" />,
  mastered: <CheckCircle2 className="h-3 w-3" />,
};

// ── Single topic card ────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: Topic;
  userId: string;
  bankId: string;
  index: number;
  onPractice: (bankId: string) => void;
}

function TopicCard({ topic, userId, bankId, index, onPractice }: TopicCardProps) {
  const ui = useInterfaceTranslation();
  const { t } = useTranslation();
  const attemptQuery = useBankAttemptStatus(bankId, userId);
  const mastery = getMasteryLevel(attemptQuery.data?.bestScore, attemptQuery.data?.maxScore);
  const masteryKey = `practice.topics.mastery.${mastery === 'not_started' ? 'notStarted' : mastery === 'needs_practice' ? 'needsPractice' : mastery === 'in_progress' ? 'inProgress' : 'mastered'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
      className="rounded-xl border border-border/60 bg-card p-4 flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm leading-5 truncate">{topic.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', masteryColors[mastery])}>
            {masteryIcons[mastery]}
            {t(masteryKey)}
          </span>
          {mastery === 'needs_practice' && (
            <span className="text-xs text-muted-foreground">{ui("↩ à retravailler")}</span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={mastery === 'mastered' ? 'outline' : 'default'}
        className="shrink-0"
        onClick={() => onPractice(bankId)}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        {t('practice.topics.practiceBtn')}
      </Button>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PracticeTopicsPage() {
  const subjectLabel = useSubjectLabel();
  const navigate = useNavigate();
  const { subject } = useParams<{ subject: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user } = useLearner();
  const activeSchoolLevel = useActiveSchoolLevel();
  const curriculum = useExerciseCurriculum();
  const profileLoading = curriculum.pending;

  const subjectSlug = subject ?? '';
  const dashboardQuery = useSubjectDashboard(subjectSlug);
  const learnerCountry = curriculum.consistent ? curriculum.country : null;
  const learnerLevel = curriculum.consistent ? curriculum.level : null;
  const subjectName = getSubjectNameForSlug(subjectSlug ?? '', i18n.language, dashboardQuery.data?.subject?.name);

  // Flatten all topics across categories to check for "Practice All"
  const allTopics = useMemo(() => (dashboardQuery.data?.categories ?? []).flatMap(c => c.topics ?? []), [dashboardQuery.data]);
  const catalogueTopics = useMemo(() => allTopics.map(topic => ({
    id: topic.id,
    curriculum_country_code: topic.curriculum_country_code,
    curriculum_level_code: topic.curriculum_level_code,
  })), [allTopics]);
  const bankCatalogue = usePracticeBankCatalogue(catalogueTopics, learnerCountry, learnerLevel);
  const topicBankMap = bankCatalogue.bankByTopic;
  const eligibleTopics = useMemo(() => allTopics.filter(topic => {
    if (!learnerCountry || !learnerLevel) return false;
    return topic.curriculum_country_code?.trim().toLowerCase() === learnerCountry.trim().toLowerCase()
      && normalizeSchoolLevel(topic.curriculum_level_code) === normalizeSchoolLevel(learnerLevel)
      && topicBankMap.has(topic.id);
  }), [allTopics, learnerCountry, learnerLevel, topicBankMap]);
  const eligibleTopicIds = useMemo(() => new Set(eligibleTopics.map(topic => topic.id)), [eligibleTopics]);

  const openQuiz = (bankId: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('quiz', bankId);
      return next;
    }, { replace: true });
  };

  // Sort topics: not_started and needs_practice first (approximated by progress_percentage)
  const sortedCategories = useMemo(() => {
    return (dashboardQuery.data?.categories ?? []).map(category => ({
      ...category,
      topics: [...(category.topics ?? [])].filter(topic => eligibleTopicIds.has(topic.id)).sort((a, b) => {
        const pa = a.progress_percentage ?? 0;
        const pb = b.progress_percentage ?? 0;
        return pa - pb; // least progress first
      }),
    })).filter(category => (category.topics?.length ?? 0) > 0);
  }, [dashboardQuery.data, eligibleTopicIds]);

  const isLoading = dashboardQuery.isLoading || activeSchoolLevel.isLoading || profileLoading || bankCatalogue.isLoading;
  const hasContent = eligibleTopics.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta
        title={t('practice.topics.metaTitle', { subject: subjectName })}
        description=""
      />

      {/* QuizOverlayController listens to ?quiz= param and renders QuizOverlay */}
      {user && <QuizOverlayController />}

      <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-6 sm:max-w-2xl sm:px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{subjectLabel(subjectName)}</h1>
            <p className="text-sm text-muted-foreground">{t('practice.subject.ai.subtitle')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => navigate(`/practice/${encodeURIComponent(subjectSlug)}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('practice.topics.back')}
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-border/60 p-4">
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* No content */}
        {!isLoading && !hasContent && (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('practice.topics.nobanks')}</p>
          </div>
        )}

        {/* Topics by category */}
        {!isLoading && sortedCategories
          .filter(cat => (cat.topics ?? []).length > 0)
          .map((category, catIdx) => (
          (category.topics?.length ?? 0) > 0 ? (
            <section key={category.id} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {category.name}
              </h2>
              <div className="space-y-2">
                {(category.topics ?? []).map((topic, topicIdx) =>
                  user ? (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      userId={user.id}
                      bankId={topicBankMap.get(topic.id)!}
                      index={catIdx * 10 + topicIdx}
                      onPractice={openQuiz}
                    />
                  ) : null
                )}
              </div>
            </section>
          ) : null
        ))}
      </div>
    </div>
  );
}
