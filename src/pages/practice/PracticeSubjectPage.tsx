import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, FileText, Zap } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExamPapers } from '@/hooks/useExamImport';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { resolveExamDisciplinesForSubjectSlug } from '@/utils/examSubjectMapping';

export default function PracticeSubjectPage() {
  const navigate = useNavigate();
  const { subject } = useParams<{ subject: string }>();
  const { t } = useTranslation();
  const subjectSlug = subject ?? '';
  const subjectsQuery = useLearningSubjects();

  const examDisciplines = useMemo(
    () => (subjectSlug ? resolveExamDisciplinesForSubjectSlug(subjectSlug) : []),
    [subjectSlug],
  );

  const papersQuery = useExamPapers({ exam: 'dnb', discipline: examDisciplines });

  const subjectLabel = useMemo(() => {
    const row = (subjectsQuery.data ?? []).find((s) => s.subject.slug === subjectSlug);
    return row?.subject.name ?? subjectSlug;
  }, [subjectsQuery.data, subjectSlug]);

  const counts = useMemo(() => {
    const papers = papersQuery.data ?? [];
    const examPapers = papers.length;
    const exercises = papers.reduce((sum, p) => sum + (p.exercise_count ?? 0), 0);
    return { examPapers, exercises };
  }, [papersQuery.data]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title={t('practice.subject.metaTitle', { subject: subjectLabel })} description={t('practice.subject.metaDescription')} />
      <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-6 sm:max-w-2xl sm:px-6">
        <section className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{subjectLabel}</h1>
              <p className="text-sm text-muted-foreground">{t('practice.subject.subtitle')}</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate('/practice')}>
              {t('practice.subject.back')}
            </Button>
          </div>
        </section>

        <section className="grid gap-3">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-muted p-2 text-muted-foreground">
                  <Zap className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{t('practice.subject.quick.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('practice.subject.quick.subtitle')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" variant="secondary" disabled>
                {t('tools.comingSoon')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <FileText className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{t('practice.subject.exams.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('practice.subject.exams.subtitle')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{t('practice.subject.exams.paperCount', { count: counts.examPapers })}</span>
                <span>{t('practice.subject.exams.exerciseCount', { count: counts.exercises })}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate(`/practice/${encodeURIComponent(subjectSlug)}/annales`)}
                disabled={counts.examPapers === 0}
              >
                {t('practice.subject.exams.cta')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 opacity-90">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-muted p-2 text-muted-foreground">
                  <Brain className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{t('practice.subject.ai.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('practice.subject.ai.subtitle')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" variant="secondary" disabled>
                {t('tools.comingSoon')}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
