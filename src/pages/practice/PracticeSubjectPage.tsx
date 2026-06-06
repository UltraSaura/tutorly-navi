import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Play, Sparkles } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { useAuth } from '@/context/AuthContext';
import { useExamPapers, useTrainingItems } from '@/hooks/useExamImport';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { usePracticeTopics } from '@/hooks/usePracticeTopics';
import type { PracticeDomainGroup, PracticeTopic } from '@/hooks/usePracticeTopics';
import { resolveExamDisciplinesForSubjectSlug } from '@/utils/examSubjectMapping';
import { QuizOverlayController } from '@/components/learning/QuizOverlayController';

type TopicState = 'mastered' | 'in_progress' | 'not_started';

type TopicMasterySummary = {
  topicId: string;
  totalObjectives: number;
  masteredObjectives: number;
  inProgressObjectives: number;
  remainingObjectives: number;
  state: TopicState;
};

type DomainTopicGroup = {
  domainId: string;
  domainLabel: string;
  topics: PracticeTopic[];
  masteredTopics: number;
};

const NO_ACTIVE_LEVEL = '__no_active_level__';
const EXAM_PREP_LEVELS = new Set(['3eme', '3e', 'troisieme', '4eme', '2nde', '1ere', 'terminale', 'bac']);

function normalizeSchoolLevel(level?: string | null): string | null {
  if (!level) return null;
  return level
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[:_\s-]+/g, '');
}

function bankMatchesLevel(schoolLevels: string[] | null, activeLevel: string) {
  if (!schoolLevels || schoolLevels.length === 0) return true;
  const normalizedActiveLevel = normalizeSchoolLevel(activeLevel);
  if (!normalizedActiveLevel) return true;
  return schoolLevels.some((level) => normalizeSchoolLevel(level) === normalizedActiveLevel);
}

function formatSubjectLabel(subjectSlug: string) {
  return subjectSlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function practiceModeForState(state: TopicState) {
  if (state === 'mastered') return 'retry';
  if (state === 'in_progress') return 'continue';
  return 'start';
}

function TopicStateIcon({ state }: { state: TopicState }) {
  if (state === 'mastered') {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <Check className="h-4 w-4" />
      </div>
    );
  }

  if (state === 'in_progress') {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Play className="h-4 w-4 fill-current" />
      </div>
    );
  }

  return <div className="h-7 w-7 rounded-full border border-border" />;
}

export default function PracticeSubjectPage() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { subject } = useParams<{ subject: string }>();
  const { user } = useAuth();
  const activeSchoolLevel = useActiveSchoolLevel();
  const { data: learningSubjects = [] } = useLearningSubjects();

  const subjectSlug = subject ?? '';
  const activeLevel = activeSchoolLevel.normalizedLevel ?? NO_ACTIVE_LEVEL;
  const { domainGroups: practiceDomainGroups, isLoading: topicsLoading, error } = usePracticeTopics(subjectSlug, activeLevel);
  const examDisciplines = useMemo(
    () => (subjectSlug ? resolveExamDisciplinesForSubjectSlug(subjectSlug) : []),
    [subjectSlug],
  );

  const subjectQuery = useQuery({
    queryKey: ['practice-subject-row', subjectSlug],
    queryFn: async (): Promise<{ id: string; name: string; slug: string } | null> => {
      const { data, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, slug')
        .eq('slug', subjectSlug)
        .maybeSingle();

      if (subjectError) throw subjectError;
      return data;
    },
    enabled: Boolean(subjectSlug),
  });

  const subjectQuizBanksQuery = useQuery({
    queryKey: ['practice-subject-quiz-banks', subjectQuery.data?.id, activeLevel],
    queryFn: async (): Promise<{ id: string; title: string; school_levels: string[] | null }[]> => {
      if (!subjectQuery.data?.id) return [];

      const { data, error: banksError } = await supabase
        .from('quiz_banks')
        .select('id, title, school_levels')
        .eq('subject_id', subjectQuery.data.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (banksError) throw banksError;
      return (data ?? []).filter((bank) => bankMatchesLevel(bank.school_levels, activeLevel));
    },
    enabled: Boolean(subjectQuery.data?.id && activeLevel),
  });

  const domainGroups = useMemo<DomainTopicGroup[]>(() => {
    return practiceDomainGroups
      .map((domain: PracticeDomainGroup) => ({
        domainId: domain.domainId,
        domainLabel: domain.domainLabel,
        topics: [...domain.topics].sort((a, b) => a.orderIndex - b.orderIndex),
        masteredTopics: 0,
      }))
      .filter((domain) => domain.topics.length > 0);
  }, [practiceDomainGroups]);

  const topicIds = useMemo(
    () => domainGroups.flatMap((domain) => domain.topics.map((topic) => topic.id)),
    [domainGroups],
  );

  const masteryQuery = useQuery({
    queryKey: ['practice-topic-mastery', user?.id, subjectSlug, activeLevel, topicIds.join(',')],
    queryFn: async (): Promise<Record<string, TopicMasterySummary>> => {
      if (!user?.id || topicIds.length === 0) return {};

      const [{ data: topicLinks, error: linksError }, { data: masteryRows, error: masteryError }] = await Promise.all([
        supabase
          .from('topic_objective_links')
          .select('topic_id, objective_id')
          .in('topic_id', topicIds),
        supabase
          .from('objective_mastery')
          .select('topic_id, objective_id, status')
          .eq('student_id', user.id)
          .in('topic_id', topicIds),
      ]);

      if (linksError) throw linksError;
      if (masteryError) throw masteryError;

      const objectivesByTopic = new Map<string, Set<string>>();
      (topicLinks || []).forEach((row) => {
        if (!objectivesByTopic.has(row.topic_id)) objectivesByTopic.set(row.topic_id, new Set());
        objectivesByTopic.get(row.topic_id)!.add(row.objective_id);
      });

      const masteryByTopic = new Map<string, Map<string, string>>();
      (masteryRows || []).forEach((row) => {
        if (!masteryByTopic.has(row.topic_id)) masteryByTopic.set(row.topic_id, new Map());
        masteryByTopic.get(row.topic_id)!.set(row.objective_id, row.status);
      });

      return topicIds.reduce<Record<string, TopicMasterySummary>>((acc, topicId) => {
        const objectiveIds = Array.from(objectivesByTopic.get(topicId) || []);
        const masteryMap = masteryByTopic.get(topicId) || new Map<string, string>();
        const totalObjectives = objectiveIds.length;
        const masteredObjectives = objectiveIds.filter((id) => masteryMap.get(id) === 'mastered').length;
        const inProgressObjectives = objectiveIds.filter((id) => masteryMap.get(id) === 'in_progress').length;
        const remainingObjectives = Math.max(totalObjectives - masteredObjectives, 0);

        let state: TopicState = 'not_started';
        if (totalObjectives > 0 && masteredObjectives === totalObjectives) {
          state = 'mastered';
        } else if (masteredObjectives > 0 || inProgressObjectives > 0) {
          state = 'in_progress';
        }

        acc[topicId] = {
          topicId,
          totalObjectives,
          masteredObjectives,
          inProgressObjectives,
          remainingObjectives,
          state,
        };
        return acc;
      }, {});
    },
    enabled: !!user?.id && topicIds.length > 0,
  });

  const bankAssignmentsQuery = useQuery({
    queryKey: ['practice-bank-assignments', topicIds.join(',')],
    queryFn: async (): Promise<{ topic_id: string; bank_id: string }[]> => {
      const { data, error } = await supabase
        .from('quiz_bank_assignments')
        .select('topic_id, bank_id')
        .eq('is_active', true)
        .in('topic_id', topicIds);

      if (error) throw error;
      return data || [];
    },
    enabled: topicIds.length > 0,
  });

  const topicBankMap = useMemo(() => {
    const map = new Map<string, string>();
    (bankAssignmentsQuery.data || []).forEach((row) => {
      if (!map.has(row.topic_id)) {
        map.set(row.topic_id, row.bank_id);
      }
    });
    return map;
  }, [bankAssignmentsQuery.data]);

  const papersQuery = useExamPapers({
    exam: 'dnb',
    discipline: examDisciplines,
    level: activeLevel,
  });
  const trainingItemsQuery = useTrainingItems({
    subject_slug: examDisciplines[0] ?? subjectSlug,
    level: activeLevel,
    status: 'published',
    limit: 1,
  });

  const topicMastery = masteryQuery.data || {};

  const enrichedDomains = useMemo(() => {
    return domainGroups.map((domain) => {
      const masteredTopics = domain.topics.filter((topic) => topicMastery[topic.id]?.state === 'mastered').length;
      return { ...domain, masteredTopics };
    });
  }, [domainGroups, topicMastery]);

  const flatTopics = useMemo(
    () => enrichedDomains.flatMap((domain) => domain.topics.map((topic) => ({ topic, domainId: domain.domainId }))),
    [enrichedDomains],
  );

  const totalTopics = flatTopics.length;
  const masteredTopics = flatTopics.filter(({ topic }) => topicMastery[topic.id]?.state === 'mastered').length;
  const masteryPercent = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;

  const continueTopic = useMemo(() => {
    return flatTopics
      .map(({ topic }) => ({ topic, summary: topicMastery[topic.id] }))
      .find(({ summary }) => summary?.state === 'in_progress') ?? null;
  }, [flatTopics, topicMastery]);
  const showTopicActionSkeletons = masteryQuery.isLoading || bankAssignmentsQuery.isLoading;

  const matchedSubject = learningSubjects.find((entry) => entry.subject.slug === subjectSlug);
  const subjectLabel = matchedSubject?.subject.name || subjectQuery.data?.name || formatSubjectLabel(subjectSlug) || subjectSlug;
  const pageTitle = subjectLabel ? `S'entraîner - ${subjectLabel}` : "S'entraîner";
  const showExamSection = EXAM_PREP_LEVELS.has((activeSchoolLevel.normalizedLevel ?? '').toLowerCase());
  const examPaperCount = papersQuery.data?.length ?? 0;
  const hasTrainingItems = (trainingItemsQuery.data?.length ?? 0) > 0;
  const firstSubjectQuizBank = subjectQuizBanksQuery.data?.[0] ?? null;
  const hasSubjectQuizBanks = Boolean(firstSubjectQuizBank);
  const hasExamPrepContent = showExamSection && (hasTrainingItems || examPaperCount > 0);
  const hasPracticeQuizContent = hasSubjectQuizBanks || hasExamPrepContent;
  const isResolvingExamPrepFallback =
    showExamSection && enrichedDomains.length === 0 && (papersQuery.isLoading || trainingItemsQuery.isLoading);
  const isResolvingQuizFallback =
    enrichedDomains.length === 0 && (subjectQuery.isLoading || subjectQuizBanksQuery.isLoading);

  if (topicsLoading || activeSchoolLevel.isLoading || isResolvingExamPrepFallback || isResolvingQuizFallback) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageMeta title={pageTitle} description="" />
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6 sm:px-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (enrichedDomains.length === 0 && !hasPracticeQuizContent) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageMeta title={pageTitle} description="" />
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{subjectLabel}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{activeSchoolLevel.activeLevel ?? '—'}</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
              Retour
            </Button>
          </div>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Bientôt disponible</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Les exercices pour ce sujet sont en cours de preparation.
              </p>
              <Button variant="outline" onClick={() => navigate('/learning')}>
                Explorer les leçons
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title={pageTitle} description="" />
      {user && <QuizOverlayController />}
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{subjectLabel}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {activeSchoolLevel.activeLevel ?? activeSchoolLevel.normalizedLevel ?? '—'}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate('/practice')}>
              Retour
            </Button>
          </div>

          {totalTopics > 0 && (
            <div className="space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${masteryPercent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {masteredTopics} sujet{masteredTopics > 1 ? 's' : ''} maîtrisé{masteredTopics > 1 ? 's' : ''} · {Math.max(totalTopics - masteredTopics, 0)} restant{Math.max(totalTopics - masteredTopics, 0) > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </section>

        {firstSubjectQuizBank && (
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quiz disponibles</CardTitle>
              <p className="text-sm text-muted-foreground">{firstSubjectQuizBank.title}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => {
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('quiz', firstSubjectQuizBank.id);
                    return next;
                  });
                }}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Commencer le quiz
              </Button>
            </CardContent>
          </Card>
        )}

        {continueTopic && topicBankMap.get(continueTopic.topic.id) && (
          <button
            type="button"
            onClick={() => {
              const bankId = topicBankMap.get(continueTopic.topic.id);
              navigate(
                bankId
                  ? `/practice/${encodeURIComponent(subjectSlug)}/topics?quiz=${encodeURIComponent(bankId)}`
                  : `/practice/${encodeURIComponent(subjectSlug)}/topics`,
              );
            }}
            className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left"
          >
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reprendre</p>
              <p className="text-sm font-semibold text-primary">
                {continueTopic.topic.topicLabel} - {continueTopic.summary?.remainingObjectives ?? 0} notion{(continueTopic.summary?.remainingObjectives ?? 0) > 1 ? 's' : ''} restante{(continueTopic.summary?.remainingObjectives ?? 0) > 1 ? 's' : ''}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          </button>
        )}

        {showExamSection && (
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Préparer l'examen</CardTitle>
              <p className="text-sm text-muted-foreground">Épreuves chronométrées alignées sur le programme</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-0">
              {hasTrainingItems && (
                <Button onClick={() => navigate(`/practice/session?subject=${encodeURIComponent(examDisciplines[0] ?? subjectSlug)}&level=${encodeURIComponent(activeLevel)}&mode=mixed`)}>
                  Exercices interactifs
                </Button>
              )}
              {examPaperCount > 0 && (
                <Button variant="outline" onClick={() => navigate(`/practice/${encodeURIComponent(subjectSlug)}/annales`)}>
                  Voir les annales
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <section className="space-y-5">
          {enrichedDomains.map((domain) => (
            <div key={domain.domainId} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {domain.domainLabel}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {domain.masteredTopics}/{domain.topics.length}
                </span>
              </div>

              <div className="space-y-2">
                {domain.topics.map((topic) => {
                  const availableBankId = topicBankMap.get(topic.id) ?? null;
                  const hasExercises = availableBankId !== null;
                  const summary = topicMastery[topic.id] || {
                    topicId: topic.id,
                    totalObjectives: 0,
                    masteredObjectives: 0,
                    inProgressObjectives: 0,
                    remainingObjectives: 0,
                    state: 'not_started' as TopicState,
                  };

                  let description = hasExercises
                    ? `${summary.totalObjectives} notion${summary.totalObjectives > 1 ? 's' : ''} · Exercices disponibles`
                    : 'Exercices en cours de préparation';
                  let titleClassName = 'text-sm font-medium';
                  let buttonClassName = '';
                  let buttonLabel = 'Pratiquer';
                  let cardClassName = `rounded-xl border border-border bg-background p-3${hasExercises ? '' : ' opacity-60'}`;
                  let buttonVariant: 'default' | 'outline' = hasExercises ? 'default' : 'outline';
                  let buttonDisabled = !hasExercises;

                  if (summary.state === 'mastered') {
                    description = `Maîtrisé · ${summary.masteredObjectives}/${summary.totalObjectives} notions`;
                    titleClassName = 'text-sm font-medium text-muted-foreground';
                    buttonClassName = '';
                    buttonLabel = hasExercises ? 'Refaire' : 'Bientôt';
                    buttonVariant = 'outline';
                  } else if (summary.state === 'in_progress') {
                    description = `En cours · ${summary.remainingObjectives} notion${summary.remainingObjectives > 1 ? 's' : ''} restante${summary.remainingObjectives > 1 ? 's' : ''}`;
                    titleClassName = 'text-sm font-medium text-primary';
                    buttonLabel = hasExercises ? 'Continuer' : 'Bientôt';
                    cardClassName = `rounded-xl border-2 bg-primary/5 p-3${hasExercises ? ' border-primary/30' : ' border-border opacity-60'}`;
                  }

                  return (
                    <div key={topic.id} className={cardClassName}>
                      <div className="flex items-center gap-3">
                        <TopicStateIcon state={summary.state} />
                        <div className="min-w-0 flex-1">
                          <p className={titleClassName}>{topic.topicLabel}</p>
                          <p
                            className={
                              summary.state === 'mastered'
                                ? 'text-xs text-emerald-700 dark:text-emerald-400'
                                : summary.state === 'in_progress'
                                  ? 'text-xs text-primary'
                                : 'text-xs text-muted-foreground'
                            }
                          >
                            {description}
                          </p>
                        </div>
                        {showTopicActionSkeletons ? (
                          <Skeleton className="h-8 w-24 rounded-full" />
                        ) : !hasExercises ? (
                          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                            À venir
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant={buttonVariant}
                            className={buttonVariant === 'outline' ? 'rounded-full px-3 py-1 text-xs' : `rounded-full px-3 py-1 text-xs ${buttonClassName}`}
                            onClick={() => {
                              if (!availableBankId) return;
                              navigate(`/practice/${encodeURIComponent(subjectSlug)}/topics?quiz=${encodeURIComponent(availableBankId)}`);
                            }}
                          >
                            {buttonVariant === 'default' ? <Sparkles className="mr-1.5 h-3.5 w-3.5" /> : null}
                            {buttonLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
