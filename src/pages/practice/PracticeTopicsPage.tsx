import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { useAllBanks, useBankAttemptStatus } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
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
  index: number;
  onPractice: (bankId: string) => void;
}

function TopicCard({ topic, userId, index, onPractice }: TopicCardProps) {
  const { t } = useTranslation();
  const banksQuery = useAllBanks(topic.id, '', [], userId, 'practice');
  const banks = banksQuery.data?.banks ?? [];
  const firstBank = banks.find(b => b.isUnlocked) ?? banks[0] ?? null;

  const attemptQuery = useBankAttemptStatus(firstBank?.bankId, userId);
  const mastery = getMasteryLevel(attemptQuery.data?.bestScore, attemptQuery.data?.maxScore);
  const masteryKey = `practice.topics.mastery.${mastery === 'not_started' ? 'notStarted' : mastery === 'needs_practice' ? 'needsPractice' : mastery === 'in_progress' ? 'inProgress' : 'mastered'}`;

  const questionCount = firstBank ? null : 0; // count comes from bank data, not stored on assignment

  if (banksQuery.isLoading) {
    return (
      <div className="rounded-xl border border-border/60 p-4">
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    );
  }

  if (banks.length === 0) return null;

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
            <span className="text-xs text-muted-foreground">↩ à retravailler</span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={mastery === 'mastered' ? 'outline' : 'default'}
        className="shrink-0"
        onClick={() => firstBank && onPractice(firstBank.bankId)}
        disabled={!firstBank}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        {t('practice.topics.practiceBtn')}
      </Button>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PracticeTopicsPage() {
  const navigate = useNavigate();
  const { subject } = useParams<{ subject: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();

  const subjectSlug = subject ?? '';
  const dashboardQuery = useSubjectDashboard(subjectSlug);
  const subjectName = dashboardQuery.data?.subject?.name ?? subjectSlug;

  // Flatten all topics across categories to check for "Practice All"
  const allTopics = useMemo(
    () => (dashboardQuery.data?.categories ?? []).flatMap(c => c.topics ?? []),
    [dashboardQuery.data],
  );

  const topicIds = useMemo(() => allTopics.map((topic) => topic.id), [allTopics]);

  const bankAssignmentsQuery = useQuery({
    queryKey: ['practice-topics-bank-assignments', topicIds.join(',')],
    queryFn: async (): Promise<{ topic_id: string }[]> => {
      const { data, error } = await supabase
        .from('quiz_bank_assignments')
        .select('topic_id')
        .eq('is_active', true)
        .in('topic_id', topicIds);

      if (error) throw error;
      return data || [];
    },
    enabled: allTopics.length > 0,
  });

  const topicsWithBanks = useMemo(() => {
    return new Set((bankAssignmentsQuery.data || []).map((row) => row.topic_id));
  }, [bankAssignmentsQuery.data]);

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
      topics: [...(category.topics ?? [])].sort((a, b) => {
        const pa = a.progress_percentage ?? 0;
        const pb = b.progress_percentage ?? 0;
        return pa - pb; // least progress first
      }),
    })).filter(category => (category.topics?.length ?? 0) > 0);
  }, [dashboardQuery.data]);

  const isLoading = dashboardQuery.isLoading;
  const hasContent = allTopics.length > 0;

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
            <h1 className="text-2xl font-bold tracking-tight">{subjectName}</h1>
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
          .filter(cat => topicsWithBanks.size === 0 || (cat.topics ?? []).some(t => topicsWithBanks.has(t.id)))
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
