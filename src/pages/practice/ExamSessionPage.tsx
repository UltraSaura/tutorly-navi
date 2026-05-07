import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, ListRestart, NotebookPen, Focus, X } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageMeta } from '@/components/seo/PageMeta';
import { useExamExercises, useExamPaperDetail } from '@/hooks/useExamImport';
import { SessionProgress } from '@/components/practice/SessionProgress';
import { HintBox } from '@/components/practice/HintBox';
import { CorrectionReveal } from '@/components/practice/CorrectionReveal';
import { getParsedContent, type ParsedExerciseContent, ParsedExerciseViewer } from '@/components/practice/ParsedExerciseViewer';

function buildHint(statement: string, opts: { prefix: string; fallback: string }): string {
  const sentence = statement.split(/[.!?]/).find((part) => part.trim().length > 20)?.trim();
  return sentence ? `${opts.prefix} ${sentence}.` : opts.fallback;
}

function structuredHint(parsed: ParsedExerciseContent | null, prefix: string, fallback: string): string | null {
  if (!parsed) return null;
  const ctx = (parsed.context ?? '').trim();
  const qs = parsed.questions ?? [];
  const firstStem = qs.find((q) => q.text.trim().length > 0)?.text.trim();
  if (firstStem) {
    const intro = ctx.length > 320 ? `${ctx.slice(0, 320)}…` : ctx;
    return `${intro ? `${intro}\n\n` : ''}${prefix} ${firstStem.slice(0, 400)}${firstStem.length > 400 ? '…' : ''}`;
  }
  if (ctx.length > 50) return `${prefix} ${ctx.slice(0, 400)}${ctx.length > 400 ? '…' : ''}`;
  return null;
}

export default function ExamSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [urlSearchParams] = useSearchParams();
  const subjectReturn = urlSearchParams.get('subject');
  const { t } = useTranslation();
  const { paperId } = useParams<{ paperId: string }>();

  const paperQuery = useExamPaperDetail(paperId ?? null);
  const exercisesQuery = useExamExercises(paperId ?? null);
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

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

  const hint = useMemo(() => {
    if (parsed && confidence !== 'low') {
      const fromStructure = structuredHint(parsed, t('practice.session.hint.prefix'), t('practice.session.hint.fallback'));
      if (fromStructure) return fromStructure;
    }
    return buildHint(currentExercise?.raw_text || '', {
      prefix: t('practice.session.hint.prefix'),
      fallback: t('practice.session.hint.fallback'),
    });
  }, [parsed, confidence, currentExercise?.raw_text, t]);

  const handlePrev = () => {
    if (index === 0) return;
    setIndex((prev) => prev - 1);
    setShowHint(false);
    setShowCorrection(false);
  };

  const handleNext = () => {
    if (index >= total - 1) return;
    setIndex((prev) => prev + 1);
    setShowHint(false);
    setShowCorrection(false);
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
                {t('practice.session.focus')}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
              <ListRestart className="mr-1 h-4 w-4" />
              {t('practice.session.hub')}
            </Button>
          </div>
        </div>

        <Card className="border-border/70">
          <CardContent className="space-y-4 p-4">
            {paperQuery.isLoading ? (
              <Skeleton className="h-6 w-1/2" />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <NotebookPen className="h-4 w-4" />
                <span className="line-clamp-1">{paperQuery.data?.title || t('practice.session.titleFallback')}</span>
              </div>
            )}
            <SessionProgress current={Math.min(index + 1, Math.max(total, 1))} total={Math.max(total, 1)} />
          </CardContent>
        </Card>

        {exercisesQuery.isLoading ? (
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
            <div className="grid grid-cols-2 gap-2 md:hidden">
              <Button variant="outline" onClick={() => setShowHint((prev) => !prev)}>
                <Lightbulb className="mr-1 h-4 w-4" />
                {showHint ? t('practice.session.hideHint') : t('practice.session.showHint')}
              </Button>
              <Button variant="outline" onClick={() => setShowCorrection((prev) => !prev)}>
                {showCorrection ? t('practice.session.hideCorrection') : t('practice.session.showCorrection')}
              </Button>
            </div>
            <HintBox hint={hint} open={showHint} />
            <CorrectionReveal correction={currentExercise.correction} open={showCorrection} />

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
                <Button variant="outline" size="sm" onClick={() => setShowHint((prev) => !prev)} className="flex-1">
                  <Lightbulb className="mr-1 h-4 w-4" />
                  {showHint ? t('practice.session.hintShortHide') : t('practice.session.hintShort')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCorrection((prev) => !prev)} className="flex-1">
                  {showCorrection ? t('practice.session.correctionShortHide') : t('practice.session.correctionShort')}
                </Button>
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
