import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useStudentProductTour } from '@/hooks/useStudentProductTour';
import { Button } from '@/components/ui/button';
import { PRODUCT_TOUR_STEPS, getNextTourStepIndex, getTourCardPosition, getTourTargetSelector } from './studentProductTourUtils';

type Rect = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;

function getTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === 'undefined') return null;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(getTourTargetSelector(target)));
  return candidates.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? null;
}

export function StudentProductTour() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isEligible, isCompleted, completeTour } = useStudentProductTour();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [pendingReplay, setPendingReplay] = useState(false);
  const startedAutomatically = useRef(false);
  const step = PRODUCT_TOUR_STEPS[stepIndex];

  const finish = useCallback(async () => {
    setOpen(false);
    try {
      await completeTour();
    } catch (error) {
      console.error('[StudentProductTour] Could not persist completion:', error);
    }
    window.setTimeout(() => {
      const input = document.querySelector<HTMLElement>('[data-tour="home-input"] textarea, [data-tour="home-input"] input');
      input?.focus();
    }, 0);
  }, [completeTour]);

  useEffect(() => {
    if (isLoading || !isEligible || isCompleted || location.pathname !== '/chat' || startedAutomatically.current) return;
    startedAutomatically.current = true;
    setStepIndex(0);
    setOpen(true);
  }, [isCompleted, isEligible, isLoading, location.pathname]);

  useEffect(() => {
    const replay = () => {
      if (location.pathname !== '/chat') {
        setPendingReplay(true);
        navigate('/chat');
        return;
      }
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener('stuwy:replay-product-tour', replay);
    return () => window.removeEventListener('stuwy:replay-product-tour', replay);
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (pendingReplay && location.pathname === '/chat') {
      setPendingReplay(false);
      setStepIndex(0);
      setOpen(true);
    }
  }, [location.pathname, pendingReplay]);

  useLayoutEffect(() => {
    if (!open) return;
    let timer: number | undefined;
    let attempts = 0;
    const update = () => {
      const target = getTarget(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      } else {
        setTargetRect(null);
        if (attempts < 3) {
          attempts += 1;
          timer = window.setTimeout(update, attempts * 120);
        }
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [open, step.target, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); void finish(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); if (stepIndex === PRODUCT_TOUR_STEPS.length - 1) void finish(); else setStepIndex((value) => value + 1); }
      if (event.key === 'ArrowLeft' && stepIndex > 0) { event.preventDefault(); setStepIndex((value) => value - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish, open, stepIndex]);

  if (!open || location.pathname !== '/chat') return null;
  const cardPosition = getTourCardPosition(targetRect, step.id, { width: window.innerWidth, height: window.innerHeight });
  const next = () => stepIndex === PRODUCT_TOUR_STEPS.length - 1 ? void finish() : setStepIndex((value) => getNextTourStepIndex(value));

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="student-tour-title" aria-describedby="student-tour-description">
      <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-primary ring-4 ring-primary/25"
          aria-hidden="true"
          style={{ top: targetRect.top - 8, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 16, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.56)' }}
        />
      )}
      <section className="absolute rounded-2xl border bg-card p-5 shadow-2xl" style={{ top: cardPosition.top, left: cardPosition.left, width: cardPosition.width }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={`${stepIndex + 1} / ${PRODUCT_TOUR_STEPS.length}`}>
            {PRODUCT_TOUR_STEPS.map((item, index) => <span key={item.id} className={`h-2 rounded-full ${index === stepIndex ? 'w-5 bg-primary' : 'w-2 bg-muted'}`} />)}
          </div>
          <button type="button" onClick={() => void finish()} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={t('productTour.actions.skip')}><X className="h-4 w-4" /></button>
        </div>
        <h2 id="student-tour-title" className="text-xl font-bold text-foreground">{t(step.titleKey)}</h2>
        <p id="student-tour-description" className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.descriptionKey)}</p>
        {step.principleKey && <p className="mt-3 rounded-lg bg-primary/10 p-3 text-sm font-medium text-foreground">{t(step.principleKey)}</p>}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => void finish()} className="text-sm font-medium text-muted-foreground hover:text-foreground">{t('productTour.actions.skip')}</button>
          <div className="flex gap-2">
            {stepIndex > 0 && <Button type="button" variant="outline" onClick={() => setStepIndex((value) => value - 1)}><ArrowLeft className="mr-1 h-4 w-4" />{t('productTour.actions.previous')}</Button>}
            <Button type="button" onClick={next}>{stepIndex === 0 ? t('productTour.actions.discover') : stepIndex === PRODUCT_TOUR_STEPS.length - 1 ? <><Check className="mr-1 h-4 w-4" />{t('productTour.actions.start')}</> : <>{t('productTour.actions.next')}<ArrowRight className="ml-1 h-4 w-4" /></>}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
