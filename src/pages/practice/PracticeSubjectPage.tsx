import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Play } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useStudentCurriculum } from '@/hooks/useStudentCurriculum';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { useAuth } from '@/context/AuthContext';
import { useExamPapers } from '@/hooks/useExamImport';
import { normalizeStudentLevelForExamFilter } from '@/domain/exams';
import type { CurriculumSubject, CurriculumTopic } from '@/domain/curriculum';

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
  topics: CurriculumTopic[];
  masteredTopics: number;
};

const NO_ACTIVE_LEVEL = '__no_active_level__';

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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
  const { subject } = useParams<{ subject: string }>();
  const { user } = useAuth();
  const activeSchoolLevel = useActiveSchoolLevel();
  const { subjects, isLoading } = useStudentCurriculum();

  const subjectSlug = subject ?? '';
  const normalizedParam = normalizeText(subjectSlug);
  const activeLevel = activeSchoolLevel.normalizedLevel ?? NO_ACTIVE_LEVEL;
  const examLevel = normalizeStudentLevelForExamFilter(activeSchoolLevel.normalizedLevel);

  const matchedSubject = useMemo<CurriculumSubject | null>(() => {
    return subjects.find((item) => {
      return item.slug === subjectSlug || normalizeText(item.subjectLabel) === normalizedParam;
    }) ?? null;
  }, [subjects, subjectSlug, normalizedParam]);

  const domainGroups = useMemo<DomainTopicGroup[]>(() => {
    if (!matchedSubject) return [];

    return matchedSubject.domains
      .map((domain) => {
        const topics = domain.subdomains
          .flatMap((subdomain) => subdomain.topics)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        return {
          domainId: domain.domainId,
          domainLabel: domain.domainLabel,
          topics,
          masteredTopics: 0,
        };
      })
      .filter((domain) => domain.topics.length > 0);
  }, [matchedSubject]);

  const topicIds = useMemo(
    () => domainGroups.flatMap((domain) => domain.topics.map((topic) => topic.id)),
    [domainGroups],
  );

  const masteryQuery = useQuery({
    queryKey: ['practice-topic-mastery', user?.id, matchedSubject?.id, topicIds.join(',')],
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

  const papersQuery = useExamPapers({
    exam: 'dnb',
    discipline: [],
    level: activeLevel,
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

  const subjectLabel = matchedSubject?.subjectLabel || subjectSlug;
  const pageTitle = matchedSubject ? `S'entraîner - ${subjectLabel}` : "S'entraîner";
  const showExamSection = Boolean(examLevel);
  const examPaperCount = papersQuery.data?.length ?? 0;

  if (isLoading || activeSchoolLevel.isLoading) {
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

  if (!matchedSubject || enrichedDomains.length === 0) {
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

          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${masteryPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {masteredTopics} sujet{masteredTopics > 1 ? 's' : ''} maitrise{masteredTopics > 1 ? 's' : ''} · {Math.max(totalTopics - masteredTopics, 0)} restant{Math.max(totalTopics - masteredTopics, 0) > 1 ? 's' : ''}
            </p>
          </div>
        </section>

        {continueTopic && (
          <button
            type="button"
            onClick={() => navigate(`/practice/session?topicId=${continueTopic.topic.id}&mode=continue`)}
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
              {examPaperCount > 0 && (
                <Button variant="outline" onClick={() => navigate(`/practice/${encodeURIComponent(subjectSlug)}/annales`)}>
                  Voir les annales
                </Button>
              )}
              <Button onClick={() => navigate(`/practice/exam/generated?subject=${encodeURIComponent(subjectSlug)}&level=${encodeURIComponent(activeLevel)}`)}>
                Épreuve générée
              </Button>
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
                  const summary = topicMastery[topic.id] || {
                    topicId: topic.id,
                    totalObjectives: 0,
                    masteredObjectives: 0,
                    inProgressObjectives: 0,
                    remainingObjectives: 0,
                    state: 'not_started' as TopicState,
                  };
                  const mode = practiceModeForState(summary.state);

                  let description = `Pas commencé · ${summary.totalObjectives} notion${summary.totalObjectives > 1 ? 's' : ''}`;
                  let titleClassName = 'text-sm font-medium';
                  let buttonClassName = '';
                  let buttonLabel = 'Pratiquer';
                  let cardClassName = 'rounded-xl border border-border bg-background p-3';

                  if (summary.state === 'mastered') {
                    description = `Maîtrisé · ${summary.masteredObjectives}/${summary.totalObjectives} notions`;
                    titleClassName = 'text-sm font-medium text-muted-foreground';
                    buttonClassName = '';
                    buttonLabel = 'Refaire';
                  } else if (summary.state === 'in_progress') {
                    description = `En cours · ${summary.remainingObjectives} notion${summary.remainingObjectives > 1 ? 's' : ''} restante${summary.remainingObjectives > 1 ? 's' : ''}`;
                    titleClassName = 'text-sm font-medium text-primary';
                    buttonLabel = 'Continuer';
                    cardClassName = 'rounded-xl border-2 border-primary/20 bg-background p-3';
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
                        <Button
                          size="sm"
                          variant={summary.state === 'mastered' ? 'outline' : 'default'}
                          className={summary.state === 'mastered' ? 'rounded-full px-3 py-1 text-xs' : `rounded-full px-3 py-1 text-xs ${buttonClassName}`}
                          onClick={() => navigate(`/practice/session?topicId=${topic.id}&mode=${mode}`)}
                        >
                          {buttonLabel}
                        </Button>
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
