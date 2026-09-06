import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  Play,
  Ruler,
  Sparkles,
  Star,
  Target,
  Triangle,
} from 'lucide-react';
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
const DOMAIN_CONFIGS = [
  { bg: '#E2F7F1', iconBg: '#9FE1CB', iconColor: '#085041', Icon: Calculator },
  { bg: '#E8EEFF', iconBg: '#BEC9FC', iconColor: '#3346B0', Icon: Triangle },
  { bg: '#FFF3DC', iconBg: '#FDE4A6', iconColor: '#B45309', Icon: Ruler },
  { bg: '#EDE9FD', iconBg: '#CECBF6', iconColor: '#3C3489', Icon: BookOpen },
  { bg: '#FDE8F2', iconBg: '#F9C3DE', iconColor: '#C0157A', Icon: BarChart2 },
] as const;

function getDomainConfig(domainLabel: string, index: number) {
  const l = domainLabel.toLowerCase();
  if (l.includes('nombre') || l.includes('calcul')) return DOMAIN_CONFIGS[0];
  if (l.includes('geomet') || l.includes('géomét') || l.includes('espace')) return DOMAIN_CONFIGS[1];
  if (l.includes('grandeur') || l.includes('mesure')) return DOMAIN_CONFIGS[2];
  if (l.includes('organi') || l.includes('données') || l.includes('donnees')) return DOMAIN_CONFIGS[3];
  return DOMAIN_CONFIGS[index % DOMAIN_CONFIGS.length];
}

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

      const { data, error: banksError } = await (supabase as any)
        .from('quiz_banks')
        .select('id, title, school_levels')
        .eq('subject_id', subjectQuery.data.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (banksError) throw banksError;
      return ((data ?? []) as any[]).filter((bank) => bankMatchesLevel(bank.school_levels, activeLevel));
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

  const recommendedTopic = useMemo(() => {
    const withExercises = flatTopics
      .map(({ topic }) => ({
        topic,
        summary: topicMastery[topic.id],
        bankId: topicBankMap.get(topic.id),
      }))
      .filter(({ bankId }) => Boolean(bankId));

    return (
      withExercises.find(({ summary }) => summary?.state === 'in_progress') ??
      withExercises.find(({ summary }) => !summary || summary.state === 'not_started') ??
      null
    );
  }, [flatTopics, topicMastery, topicBankMap]);
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
    <div className="min-h-screen pb-24" style={{ background: '#F3F6FA' }}>
      <PageMeta title={pageTitle} description="" />
      {user && <QuizOverlayController />}
      <div className="border-b border-border bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
              {subjectLabel}
            </h1>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: '#F2FBF8', color: '#0A8C72' }}
            >
              {activeSchoolLevel.activeLevel ?? activeSchoolLevel.normalizedLevel ?? '—'}
            </span>
          </div>
          <button
            onClick={() => navigate('/practice')}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
            style={{ borderColor: '#EAECEF', color: '#667085' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-6">
        {totalTopics > 0 && (
          <div>
            <div className="mb-1.5 flex justify-between text-xs" style={{ color: '#667085' }}>
              <span>{masteredTopics} sujet{masteredTopics !== 1 ? 's' : ''} maîtrisé{masteredTopics !== 1 ? 's' : ''}</span>
              <span>{Math.max(totalTopics - masteredTopics, 0)} restant{Math.max(totalTopics - masteredTopics, 0) !== 1 ? 's' : ''}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#EAECEF' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${masteryPercent}%`, background: '#12C6A0' }} />
            </div>
          </div>
        )}

        {recommendedTopic && (
          <div className="rounded-2xl border-2 p-4" style={{ background: '#F2FBF8', borderColor: '#12C6A0' }}>
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1"
              style={{ borderColor: '#12C6A0' }}
            >
              <Star className="h-3 w-3" style={{ color: '#12C6A0' }} />
              <span className="text-xs font-semibold" style={{ color: '#12C6A0' }}>Recommandé pour toi</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="mb-1 text-xl font-bold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
                  {recommendedTopic.topic.topicLabel}
                </p>
                <p className="mb-4 text-xs" style={{ color: '#667085' }}>
                  {recommendedTopic.summary?.totalObjectives ?? 0} notion{(recommendedTopic.summary?.totalObjectives ?? 0) !== 1 ? 's' : ''} · {activeSchoolLevel.activeLevel ?? activeSchoolLevel.normalizedLevel ?? '—'}
                </p>
                <button
                  onClick={() => navigate(`/practice/${encodeURIComponent(subjectSlug)}/topics?quiz=${encodeURIComponent(recommendedTopic.bankId!)}`)}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold"
                  style={{ background: '#12C6A0', color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}
                >
                  {recommendedTopic.summary?.state === 'in_progress' ? 'Continuer' : 'Commencer'}
                </button>
              </div>
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                <img src="/practice-mascot.png" alt="Mascotte" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        )}

        {!recommendedTopic && firstSubjectQuizBank && (
          <div className="rounded-2xl border-2 p-4" style={{ background: '#F2FBF8', borderColor: '#12C6A0' }}>
            <p className="mb-1 text-xl font-bold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
              {firstSubjectQuizBank.title}
            </p>
            <p className="mb-4 text-xs" style={{ color: '#667085' }}>
              Quiz disponible pour cette matière
            </p>
            <button
              onClick={() => {
                setSearchParams((current) => {
                  const next = new URLSearchParams(current);
                  next.set('quiz', firstSubjectQuizBank.id);
                  return next;
                });
              }}
              className="rounded-xl px-5 py-2.5 text-sm font-bold"
              style={{ background: '#12C6A0', color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}
            >
              Commencer le quiz
            </button>
          </div>
        )}

        {enrichedDomains.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-bold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
              Par compétence
            </h2>
            <div className="space-y-3">
              {enrichedDomains.map((domain, idx) => {
                const config = getDomainConfig(domain.domainLabel, idx);
                const { Icon } = config;
                const domainTotalExercises = domain.topics.length;
                const domainMastered = domain.topics.filter((t) => topicMastery[t.id]?.state === 'mastered').length;
                const domainPercent = domainTotalExercises > 0
                  ? Math.round((domainMastered / domainTotalExercises) * 100)
                  : 0;
                const firstBankId = domain.topics
                  .map((t) => topicBankMap.get(t.id))
                  .find(Boolean);
                const isClickable = Boolean(firstBankId);

                return (
                  <button
                    key={domain.domainId}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => {
                      if (firstBankId) {
                        navigate(`/practice/${encodeURIComponent(subjectSlug)}/topics?quiz=${encodeURIComponent(firstBankId)}`);
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-opacity disabled:opacity-50"
                    style={{ borderColor: '#EAECEF' }}
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: config.iconBg }}
                    >
                      <Icon className="h-5 w-5" style={{ color: config.iconColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
                        {domain.domainLabel}
                      </p>
                      <p className="mb-1.5 text-xs" style={{ color: '#667085' }}>
                        {domainTotalExercises} exercice{domainTotalExercises !== 1 ? 's' : ''}
                      </p>
                      <div className="h-1 overflow-hidden rounded-full" style={{ background: '#EAECEF' }}>
                        <div className="h-full rounded-full" style={{ width: `${domainPercent}%`, background: config.iconColor }} />
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold" style={{ color: config.iconColor }}>
                      {domainPercent}%
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#EAECEF' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border p-4" style={{ background: '#FFF8EE', borderColor: '#F59E0B' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: '#FDE4A6' }}>
              <Target className="h-6 w-6" style={{ color: '#B45309' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
                Défi du jour
              </p>
              <p className="text-xs" style={{ color: '#667085' }}>
                Résous 5 exercices et gagne 50 XP !
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#B45309' }}>0/5</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#EAECEF' }}>
                  <div className="h-full rounded-full" style={{ width: '0%', background: '#F59E0B' }} />
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          </div>
        </div>

        {showExamSection && (
          <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#EAECEF' }}>
            <p className="mb-1 text-sm font-bold" style={{ color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
              Préparer l&apos;examen
            </p>
            <p className="mb-3 text-xs" style={{ color: '#667085' }}>
              Épreuves chronométrées alignées sur le programme
            </p>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
