import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useExamPapers } from '@/hooks/useExamImport';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { useUserSchoolLevel } from '@/hooks/useUserSchoolLevel';
import { normalizeDisciplineKey, resolveExamDisciplinesForSubjectSlug } from '@/utils/examSubjectMapping';

export default function PracticePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const subjectsQuery = useLearningSubjects();
  const userLevelQuery = useUserSchoolLevel();
  const papersQuery = useExamPapers({ exam: 'dnb' });

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
    const levelLabel = userLevelQuery.data?.level ?? '—';
    return (subjectsQuery.data ?? []).map((row) => {
      const subjectSlug = row.subject.slug;
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
      return {
        id: row.subject.id,
        slug: subjectSlug,
        name: row.subject.name,
        levelLabel,
        examPapers: counts.papers,
        exercises: counts.exercises,
      };
    });
  }, [subjectsQuery.data, userLevelQuery.data?.level, papersByDiscipline]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title={t('practice.title')} description={t('practice.metaDescription')} />
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('practice.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('practice.subtitle')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('practice.subjects.title')}
          </h2>

          {(subjectsQuery.isLoading || userLevelQuery.isLoading || papersQuery.isLoading) ? (
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t('practice.subjects.exerciseCount', { count: subject.exercises })}</span>
                      <span>{t('practice.subjects.examPaperCount', { count: subject.examPapers })}</span>
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
