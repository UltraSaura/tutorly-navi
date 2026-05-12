import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExamCard } from '@/components/practice/ExamCard';
import { useExamPapers, useTrainingItems } from '@/hooks/useExamImport';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { resolveExamDisciplinesForSubjectSlug } from '@/utils/examSubjectMapping';

const NO_ACTIVE_LEVEL = '__no_active_level__';

/** Titre lisible hors sélecteur injecté depuis la page catalogue (ex. Amiens). */
function cleanExamTitle(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return '';
  let s = t.replace(/page\s+\d+['\"]?\);\">/gi, '').replace(/\s+/g, ' ').trim();
  const idx = s.toLowerCase().indexOf('sujet');
  if (idx >= 0) s = s.slice(idx);
  return s.replace(/^\.+\s*/, '').trim();
}

export default function PracticeAnnalsPage() {
  const navigate = useNavigate();
  const { subject } = useParams<{ subject: string }>();
  const { t } = useTranslation();
  const subjectSlug = subject ?? '';
  const subjectsQuery = useLearningSubjects();
  const activeSchoolLevel = useActiveSchoolLevel();
  const activeLevel = activeSchoolLevel.normalizedLevel ?? NO_ACTIVE_LEVEL;

  const examDisciplines = useMemo(
    () => (subjectSlug ? resolveExamDisciplinesForSubjectSlug(subjectSlug) : []),
    [subjectSlug],
  );

  const papersQuery = useExamPapers({ exam: 'dnb', discipline: examDisciplines, level: activeLevel });
  const trainingItemsQuery = useTrainingItems({ subject_slug: examDisciplines[0], level: activeLevel, status: 'published', limit: 500 });

  const subjectLabel = useMemo(() => {
    const row = (subjectsQuery.data ?? []).find((s) => s.subject.slug === subjectSlug);
    return row?.subject.name ?? subjectSlug;
  }, [subjectsQuery.data, subjectSlug]);

  const papers = [...(papersQuery.data ?? [])].sort((a, b) =>
    b.session_year !== a.session_year ? b.session_year - a.session_year : (a.variant ?? '').localeCompare(b.variant ?? ''),
  );

  const discLabel = examDisciplines[0]?.replace(/_/g, ' ') ?? '';
  const trainingItemsByPaper = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of trainingItemsQuery.data ?? []) {
      if (!item.paper_id) continue;
      map.set(item.paper_id, (map.get(item.paper_id) ?? 0) + 1);
    }
    return map;
  }, [trainingItemsQuery.data]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title={t('practice.annals.metaTitle', { subject: subjectLabel })} description={t('practice.annals.metaDescription')} />
      <div className="mx-auto w-full max-w-lg space-y-5 px-4 py-6 sm:max-w-2xl sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('practice.annals.heading')}</h1>
            <p className="text-sm text-muted-foreground">
              {subjectLabel}
              {discLabel ? ` · ${discLabel}` : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate(`/practice/${encodeURIComponent(subjectSlug)}`)}>
            {t('practice.annals.back')}
          </Button>
        </div>

        {papersQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Card key={i} className="border-border/70">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-3 h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="space-y-3 p-6 text-center">
              <p className="font-medium">{t('practice.empty.exams.title')}</p>
              <p className="text-sm text-muted-foreground">{t('practice.empty.exams.description')}</p>
              <Button variant="outline" onClick={() => navigate('/practice')}>
                {t('practice.session.returnToPractice')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <ExamCard
                key={paper.id}
                title={cleanExamTitle(paper.title) || t('practice.annals.fallbackPaperTitle', { year: paper.session_year })}
                year={paper.session_year}
                subject={subjectLabel}
                exerciseCount={paper.exercise_count}
                trainingItemCount={trainingItemsByPaper.get(paper.id) ?? 0}
                onStart={() =>
                  (trainingItemsByPaper.get(paper.id) ?? 0) > 0
                    ? navigate(`/practice/session?subject=${encodeURIComponent(examDisciplines[0] ?? subjectSlug)}&level=${encodeURIComponent(activeLevel)}&mode=mixed&sourcePaperId=${encodeURIComponent(paper.id)}`)
                    : navigate(`/practice/session/${paper.id}?subject=${encodeURIComponent(subjectSlug)}`)
                }
                onConsult={() => navigate(`/practice/session/${paper.id}?subject=${encodeURIComponent(subjectSlug)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
