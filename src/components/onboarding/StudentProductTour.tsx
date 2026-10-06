import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useStudentProductTour } from '@/hooks/useStudentProductTour';
import { Button } from '@/components/ui/button';
import { PRODUCT_TOUR_STEPS, getNextTourStepIndex, getTourCardPosition, getTourTargetSelector } from './studentProductTourUtils';

type Rect = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;
type Viewport = { width: number; height: number };

function getViewport(): Viewport {
  if (typeof window === 'undefined') return { width: 390, height: 844 };
  const visualViewport = window.visualViewport;
  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
  };
}

function getTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === 'undefined') return null;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(getTourTargetSelector(target)));
  return candidates.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? null;
}

function getRadius(target: HTMLElement | null) {
  if (!target || typeof window === 'undefined') return 12;
  const radius = Number.parseFloat(window.getComputedStyle(target).borderTopLeftRadius);
  return Number.isFinite(radius) ? Math.min(radius + 8, 24) : 12;
}

function setAttachmentMenuOpen(open: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('stuwy:product-tour-attachment', { detail: { open } }));
  }
}

export function StudentProductTour() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isEligible, isCompleted, completeTour } = useStudentProductTour();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [targetRadius, setTargetRadius] = useState(12);
  const [viewport, setViewport] = useState<Viewport>(() => getViewport());
  const [cardHeight, setCardHeight] = useState(300);
  const [pendingReplay, setPendingReplay] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const startedAutomatically = useRef(false);
  const step = PRODUCT_TOUR_STEPS[stepIndex];

  const finish = useCallback(async () => {
    setOpen(false);
    setAttachmentMenuOpen(false);
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
    if (!open) return;
    setAttachmentMenuOpen(step.id === 'photo');
    return () => setAttachmentMenuOpen(false);
  }, [open, step.id]);

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
      setViewport(getViewport());
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
        setTargetRadius(getRadius(target));
      } else {
        setTargetRect(null);
        setTargetRadius(12);
        if (attempts < 3) {
          attempts += 1;
          timer = window.setTimeout(update, attempts * 120);
        }
      }
    };
    update();
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }, [open, step.target, stepIndex]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const updateHeight = () => setCardHeight(cardRef.current?.getBoundingClientRect().height ?? 300);
    updateHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    observer?.observe(cardRef.current);
    return () => observer?.disconnect();
  }, [open, stepIndex, viewport.height]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); void finish(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); if (stepIndex === PRODUCT_TOUR_STEPS.length - 1) void finish(); else setStepIndex((value) => getNextTourStepIndex(value)); }
      if (event.key === 'ArrowLeft' && stepIndex > 0) { event.preventDefault(); setStepIndex((value) => value - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish, open, stepIndex]);

  if (!open || location.pathname !== '/chat') return null;
  const cardPosition = getTourCardPosition(targetRect, step.id, viewport, cardHeight);
  const next = () => stepIndex === PRODUCT_TOUR_STEPS.length - 1 ? void finish() : setStepIndex((value) => getNextTourStepIndex(value));
  const spotlightPadding = 8;
  const spotlight = targetRect ? {
    top: targetRect.top - spotlightPadding,
    left: targetRect.left - spotlightPadding,
    width: targetRect.width + spotlightPadding * 2,
    height: targetRect.height + spotlightPadding * 2,
  } : null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="student-tour-title" aria-describedby="student-tour-description">
      {spotlight ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/60" style={{ height: spotlight.top }} aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/60" style={{ height: Math.max(0, viewport.height - spotlight.top - spotlight.height) }} aria-hidden="true" />
          <div className="pointer-events-none absolute bg-slate-950/60" style={{ top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height }} aria-hidden="true" />
          <div className="pointer-events-none absolute bg-slate-950/60" style={{ top: spotlight.top, left: spotlight.left + spotlight.width, right: 0, height: spotlight.height }} aria-hidden="true" />
          <div className="pointer-events-none absolute rounded-xl border-2 border-primary ring-4 ring-primary/30" aria-hidden="true" style={{ ...spotlight, borderRadius: targetRadius, boxShadow: '0 0 0 2px rgba(22, 199, 163, 0.4), 0 0 24px rgba(22, 199, 163, 0.55)' }} />
        </>
      ) : <div className="pointer-events-none absolute inset-0 bg-slate-950/60" aria-hidden="true" />}
      <section ref={cardRef} className="absolute flex flex-col overflow-visible rounded-2xl border bg-card p-4 shadow-2xl transition-[top,left] duration-200 motion-reduce:transition-none sm:p-5" style={{ top: cardPosition.top, left: cardPosition.left, width: cardPosition.width, maxHeight: Math.max(0, viewport.height - 24) }}>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3 sm:mb-3">
          <div className="flex gap-1.5" aria-label={`${stepIndex + 1} / ${PRODUCT_TOUR_STEPS.length}`}>
            {PRODUCT_TOUR_STEPS.map((item, index) => <span key={item.id} className={`h-2 rounded-full ${index === stepIndex ? 'w-5 bg-primary' : 'w-2 bg-muted'}`} />)}
          </div>
          <button type="button" onClick={() => void finish()} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={t('productTour.actions.skip')}><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <h2 id="student-tour-title" className="text-lg font-bold leading-tight text-foreground sm:text-xl">{t(step.titleKey)}</h2>
          <p id="student-tour-description" className="mt-2 text-sm leading-5 text-muted-foreground sm:leading-6">{t(step.descriptionKey)}</p>
          {step.principleKey && <p className="mt-3 rounded-lg bg-primary/10 p-2.5 text-sm font-medium leading-5 text-foreground sm:p-3">{t(step.principleKey)}</p>}
        </div>
        <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t pt-3">
          <button type="button" onClick={() => void finish()} className="text-sm font-medium text-muted-foreground hover:text-foreground">{t('productTour.actions.skip')}</button>
          <div className="flex gap-2">
            {stepIndex > 0 && <Button type="button" size="sm" variant="outline" onClick={() => setStepIndex((value) => value - 1)}><ArrowLeft className="mr-1 h-4 w-4" />{t('productTour.actions.previous')}</Button>}
            <Button type="button" size="sm" onClick={next}>{stepIndex === 0 ? t('productTour.actions.discover') : stepIndex === PRODUCT_TOUR_STEPS.length - 1 ? <><Check className="mr-1 h-4 w-4" />{t('productTour.actions.start')}</> : <>{t('productTour.actions.next')}<ArrowRight className="ml-1 h-4 w-4" /></>}</Button>
          </div>
        </div>
        {targetRect && cardPosition.placement !== 'center' && <span className={`pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-x-transparent ${cardPosition.placement === 'above' ? '-bottom-2 border-t-[10px] border-t-card' : '-top-2 border-b-[10px] border-b-card'}`} aria-hidden="true" />}
      </section>
    </div>
  );
}
