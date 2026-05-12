import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ListRestart, NotebookPen, Focus, X, Sparkles } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageMeta } from '@/components/seo/PageMeta';
import { useExamExercises, useExamPaperDetail, useTrainingItems } from '@/hooks/useExamImport';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { SessionProgress } from '@/components/practice/SessionProgress';
import { getParsedContent, ParsedExerciseViewer } from '@/components/practice/ParsedExerciseViewer';

export default function ExamSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [urlSearchParams] = useSearchParams();
  const subjectReturn = urlSearchParams.get('subject');
  const { t } = useTranslation();
  const { paperId } = useParams<{ paperId: string }>();

  const paperQuery = useExamPaperDetail(paperId ?? null);
  const activeSchoolLevel = useActiveSchoolLevel();
  const activeLevel = activeSchoolLevel.normalizedLevel ?? '__no_active_level__';
  const isLevelAllowed = !paperQuery.data || paperQuery.data.level === activeLevel;
  const exercisesQuery = useExamExercises(isLevelAllowed ? (paperId ?? null) : null);
  const trainingItemsQuery = useTrainingItems({ paper_id: paperId, level: activeLevel, status: 'published', limit: 1 });
  const [index, setIndex] = useState(0);

  const isFocus = urlSearchParams.get('focus') === '1';

  const exercises = exercisesQuery.data ?? [];
  const currentExercise = exercises[index] ?? null;
  const total = exercises.length;
  const parsed = useMemo(() => getParsedContent(currentExercise?.parsed_content), [currentExercise?.parsed_content]);
  const confidence = (currentExercise?.parsing_confidence ?? parsed?.confidence ?? null) as
    | 'high'
    | 'medium'
    | 'low'
    | null;

  const hasTrainingItems = (trainingItemsQuery.data ?? []).length > 0;
  const trainHref = `/practice/session?subject=${encodeURIComponent(subjectReturn ?? paperQuery.data?.discipline ?? 'mathematiques')}&level=${encodeURIComponent(activeLevel)}&mode=mixed&sourcePaperId=${encodeURIComponent(paperId ?? '')}`;

  const handlePrev = () => {
    if (index === 0) return;
    setIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (index >= total - 1) return;
    setIndex((prev) => prev + 1);
  };

  const enterFocus = () => {
    const p = new URLSearchParams(location.search);
    p.set('focus', '1');
    navigate(`${location.pathname}?${p.toString()}`);
  };

  const exitFocus = () => {
    const p = new URLSearchParams(location.search);
    p.delete('focus');
    const q = p.toString();
    navigate(q ? `${location.pathname}?${q}` : location.pathname);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title={t('practice.session.metaTitle')} description={t('practice.session.metaDescription')} />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          {isFocus ? (
            <Button variant="ghost" size="sm" onClick={exitFocus}>
              <X className="mr-1 h-4 w-4" />
              {t('practice.session.exitFocus')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                subjectReturn ? navigate(`/practice/${encodeURIComponent(subjectReturn)}/annales`) : navigate('/practice')
              }
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('practice.session.back')}
            </Button>
          )}

          <div className="flex items-center gap-2">
            {!isFocus ? (
              <Button variant="outline" size="sm" onClick={enterFocus}>
                <Focus className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">{t('practice.session.focus')}</span>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
              <ListRestart className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">{t('practice.session.hub')}</span>
            </Button>
          </div>
        </div>

        {!isLevelAllowed ? (
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
        <Card className="border-border/70">
          <CardContent className="space-y-4 p-4">
            {paperQuery.isLoading ? (
              <Skeleton className="h-6 w-1/2" />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <NotebookPen className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-1">{paperQuery.data?.title || t('practice.session.titleFallback')}</span>
                </div>
                {paperQuery.data?.pdf_url ? (
                  <Button variant="outline" size="sm" className="shrink-0" asChild>
                    <a href={paperQuery.data.pdf_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1 h-4 w-4" />
                      PDF
                    </a>
                  </Button>
                ) : null}
              </div>
            )}
            <SessionProgress current={Math.min(index + 1, Math.max(total, 1))} total={Math.max(total, 1)} />
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm leading-6">
              <p className="font-medium">{t('practice.session.officialReadOnly.title')}</p>
              <p className="mt-1 text-muted-foreground">
                {hasTrainingItems
                  ? t('practice.session.officialReadOnly.descriptionWithItems')
                  : t('practice.session.officialReadOnly.descriptionNoItems')}
              </p>
              {hasTrainingItems ? (
                <Button className="mt-3" size="sm" onClick={() => navigate(trainHref)}>
                  <Sparkles className="mr-1 h-4 w-4" />
                  {t('practice.session.officialReadOnly.cta')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
        )}

        {!isLevelAllowed ? null : exercisesQuery.isLoading ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : total === 0 ? (
          <Card className="border-dashed">
            <CardContent className="space-y-3 p-6 text-center">
              <p className="font-medium">{t('practice.empty.exams.sessionTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('practice.empty.exams.sessionDescription')}</p>
              <Button variant="outline" onClick={() => navigate('/practice')}>
                {t('practice.session.returnToPractice')}
              </Button>
            </CardContent>
          </Card>
        ) : currentExercise ? (
          <>
            {parsed && confidence !== 'low' ? (
              <ParsedExerciseViewer
                title={
                  parsed.title?.trim() ||
                  t('practice.session.exerciseTitle', { number: currentExercise.exercise_number ?? index + 1 })
                }
                parsed={parsed}
                variant="student"
                interactive={false}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="space-y-3 p-6 text-center">
                  <p className="font-medium">{t('practice.session.preparing.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('practice.session.preparing.description')}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button variant="outline" onClick={() => paperQuery.data?.pdf_url && window.open(paperQuery.data.pdf_url, '_blank', 'noreferrer')}>
                      {t('practice.session.preparing.viewPdf')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/practice')}>
                      {t('practice.session.returnToPractice')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="hidden items-center justify-between gap-2 pt-1 md:flex">
              <Button variant="outline" onClick={handlePrev} disabled={index === 0}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('ui.previous')}
              </Button>
              <Button onClick={handleNext} disabled={index >= total - 1}>
                {t('ui.next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            <div
              className="fixed left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
              style={{
                bottom: isFocus ? 'max(env(safe-area-inset-bottom), 0px)' : 'calc(max(env(safe-area-inset-bottom), 0px) + 4rem)',
              }}
            >
              <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={index === 0} className="shrink-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {hasTrainingItems ? (
                  <Button variant="outline" size="sm" onClick={() => navigate(trainHref)} className="flex-1">
                    <Sparkles className="mr-1 h-4 w-4" />
                    {t('practice.session.officialReadOnly.ctaShort')}
                  </Button>
                ) : null}
                <Button size="sm" onClick={handleNext} disabled={index >= total - 1} className="shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
