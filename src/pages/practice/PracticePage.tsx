import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useExamPapers, useTrainingItemSubjectCounts } from '@/hooks/useExamImport';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { normalizeDisciplineKey, resolveExamDisciplinesForSubjectSlug, resolveSubjectSlugForExamDiscipline, getSubjectNameForSlug } from '@/utils/examSubjectMapping';

const NO_ACTIVE_LEVEL = '__no_active_level__';

export default function PracticePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const subjectsQuery = useLearningSubjects();
  const activeSchoolLevel = useActiveSchoolLevel();
  const activeLevel = activeSchoolLevel.normalizedLevel ?? NO_ACTIVE_LEVEL;
  const papersQuery = useExamPapers({ exam: 'dnb', level: activeLevel });
  const trainingCountsQuery = useTrainingItemSubjectCounts(activeLevel);

  const papersByDiscipline = useMemo(() => {
    const map = new Map<string, { papers: number; exercises: number }>();
    for (const paper of papersQuery.data ?? []) {
      const key = normalizeDisciplineKey(paper.discipline);
      const current = map.get(key) ?? { papers: 0, exercises: 0 };
      current.papers += 1;
      current.exercises += paper.exercise_count ?? 0;
      map.set(key, current);
    }
    return map;
  }, [papersQuery.data]);

  const subjectCards = useMemo(() => {
    const levelLabel = activeSchoolLevel.activeLevel ?? '—';
    const seenSlugs = new Set<string>();

    const mappedFromCurriculum = (subjectsQuery.data ?? []).flatMap((row) => {
      const subjectSlug = row.subject.slug;
      seenSlugs.add(subjectSlug);
      const disciplineKeys = resolveExamDisciplinesForSubjectSlug(subjectSlug).map((d) =>
        normalizeDisciplineKey(d),
      );
      const counts = disciplineKeys.reduce(
        (acc, key) => {
          const c = papersByDiscipline.get(key) ?? { papers: 0, exercises: 0 };
          return { papers: acc.papers + c.papers, exercises: acc.exercises + c.exercises };
        },
        { papers: 0, exercises: 0 },
      );
      const trainingItems = disciplineKeys.reduce((sum, key) => {
        const direct = trainingCountsQuery.data?.[key] ?? 0;
        const normalized = trainingCountsQuery.data?.[normalizeDisciplineKey(key)] ?? 0;
        return sum + Math.max(direct, normalized);
      }, 0);
      const card = {
        id: row.subject.id,
        slug: subjectSlug,
        name: row.subject.name,
        levelLabel,
        masteryPercent: 0,
        masteredTopics: 0,
        totalTopics: 0,
        examPapers: counts.papers,
        exercises: trainingItems,
        sourceExercises: counts.exercises,
      };
      return [card];
    });

    const fallbackCards = [];
    const allDisciplines = new Set([
      ...Array.from(papersByDiscipline.keys()),
      ...Object.keys(trainingCountsQuery.data ?? {})
    ]);

    for (const discipline of allDisciplines) {
      if (!discipline) continue;
      const slug = resolveSubjectSlugForExamDiscipline(discipline);
      if (seenSlugs.has(slug)) continue;

      const keys = resolveExamDisciplinesForSubjectSlug(slug).map(normalizeDisciplineKey);
      
      const counts = keys.reduce(
        (acc, key) => {
          const c = papersByDiscipline.get(key) ?? { papers: 0, exercises: 0 };
          return { papers: acc.papers + c.papers, exercises: acc.exercises + c.exercises };
        },
        { papers: 0, exercises: 0 },
      );
      
      const trainingItems = keys.reduce((sum, key) => {
        const direct = trainingCountsQuery.data?.[key] ?? 0;
        const normalized = trainingCountsQuery.data?.[normalizeDisciplineKey(key)] ?? 0;
        return sum + Math.max(direct, normalized);
      }, 0);

      seenSlugs.add(slug);
      fallbackCards.push({
        id: `fallback-${slug}`,
        slug: slug,
        name: getSubjectNameForSlug(slug, i18n.language),
        levelLabel,
        masteryPercent: 0,
        masteredTopics: 0,
        totalTopics: 0,
        examPapers: counts.papers,
        exercises: trainingItems,
        sourceExercises: counts.exercises,
      });
    }

    return [...mappedFromCurriculum, ...fallbackCards];
  }, [subjectsQuery.data, activeSchoolLevel.activeLevel, papersByDiscipline, trainingCountsQuery.data]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title={t('practice.title')} description={t('practice.metaDescription')} />
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('practice.title')}</h1>
          <p className="text-sm text-muted-foreground">Entraîne-toi sur les sujets de ton programme.</p>
        </section>

        {import.meta.env.DEV && import.meta.env.VITE_SHOW_PRACTICE_DEBUG === 'true' && (
          <section className="bg-destructive/10 text-destructive p-4 rounded-md text-xs font-mono space-y-1 overflow-x-auto">
            <h3 className="font-bold mb-2">DEBUG: DNB Visibility (DEV ONLY)</h3>
            <p>activeLevel: <strong>{activeLevel}</strong></p>
            <p>source: {activeSchoolLevel.source}</p>
            <p>trainingCountsQuery.data: {JSON.stringify(trainingCountsQuery.data || {})}</p>
            <p>papersQuery count: {papersQuery.data?.length ?? 0}</p>
            <p>If counts are 0, check RLS or DB data.</p>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('practice.subjects.title')}
          </h2>

          {(subjectsQuery.isLoading || activeSchoolLevel.isLoading || papersQuery.isLoading || trainingCountsQuery.isLoading) ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="border-border/70">
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : subjectCards.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">{t('practice.subjects.emptyTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('practice.subjects.emptyDescription')}</p>
                <Button variant="outline" onClick={() => navigate('/learning')}>
                  {t('practice.cta.browseLessons')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjectCards.map((subject) => (
                <Card key={subject.id} className="border-border/70">
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('practice.subjects.levelLabel', { level: subject.levelLabel })}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${subject.masteryPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {subject.masteredTopics} sujets maîtrisés
                      </p>
                    </div>
                    <Button className="w-full" onClick={() => navigate(`/practice/${subject.slug}`)}>
                      <BookOpen className="mr-1 h-4 w-4" />
                      {t('practice.subjects.cta')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
