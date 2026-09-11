import { useEffect, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LearningSessionPlayer } from '@/features/learning-session/LearningSessionPlayer';
import type { useTutorAdaptiveProblem } from '@/hooks/useTutorAdaptiveProblem';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

interface Props {
  tutorAdaptive: Pick<ReturnType<typeof useTutorAdaptiveProblem>, 'view' | 'start' | 'resume'>;
}

/** The production Tutor handoff. Chat and homework cards remain mounted throughout. */
export function TutorRemediationPanel({ tutorAdaptive }: Props) {
  const ui = useInterfaceTranslation();
  const { view, start, resume } = tutorAdaptive;
  const returnTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view?.phase === 'resumed') returnTarget.current?.focus();
  }, [view?.phase]);

  if (!view) return null;
  const { context, result, phase } = view;
  const unit = result.remediationUnit;
  if (!unit) return null;
  const younger = context.ageBand === 'early_primary' || context.ageBand === 'upper_primary';
  const title = younger ? ui('A quick challenge to help you') : ui('Review a prerequisite');
  const description = younger
    ? ui('Before we continue, let’s take a quick look at a skill that can help you.')
    : ui('This step may depend on a prerequisite. Review it briefly before continuing.');

  // Localize the service's descriptor without inventing a lesson or changing its identity.
  const displayUnit = {
    ...unit,
    payload: {
      ...unit.payload,
      targetProblemContext: context.originalPrompt || context.conceptName || unit.payload.targetProblemContext,
      diagnosedGap: {
        ...unit.payload.diagnosedGap,
        reason: result.remediationDecision?.reason === 'unassessed_prerequisite'
          ? ui('This prerequisite has not been assessed yet.')
          : ui('Recent attempts suggest reviewing this prerequisite.'),
      },
      remediationAction: unit.payload.remediationAction.type === 'mini_explanation'
        && unit.payload.remediationAction.content === `Renforcement ciblé du prérequis ${result.remediationDecision?.targetConceptId}`
        ? { ...unit.payload.remediationAction, content: ui('Review the prerequisite: {{concept}}.', {
          concept: unit.payload.diagnosedGap.prerequisiteName,
        }) }
        : unit.payload.remediationAction,
    },
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 break-words">
      {phase === 'offered' && (
        <Card role="region" aria-label={title}>
          <CardContent className="space-y-3 p-4" aria-live="polite">
            <h2 className="font-semibold">{title}</h2>
            <p>{description}</p>
            {context.originalPrompt && <p className="text-sm text-muted-foreground">{context.originalPrompt}</p>}
            <p className="text-sm">{unit.payload.diagnosedGap.prerequisiteName}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={start}>{younger ? ui('Start the challenge') : ui('Review prerequisite')}</Button>
              <Button variant="outline" onClick={() => resume(false)}>{ui('Continue in Tutor')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {phase === 'resumed' && (
        <div ref={returnTarget} tabIndex={-1} role="status" className="rounded-xl border bg-card p-4 outline-none focus:ring-2 focus:ring-ring">
          <p>{younger
            ? ui('Let’s go back to your exercise. Try it once more.')
            : ui('Return to the original problem and try solving it again.')}</p>
          <p className="mt-2 font-medium">{context.originalPrompt || context.conceptName}</p>
        </div>
      )}
      <Dialog open={phase === 'active'} onOpenChange={open => { if (!open && phase === 'active') resume(false); }}>
        <DialogContent
          className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto p-4 sm:p-6 motion-reduce:animate-none"
          onCloseAutoFocus={event => { event.preventDefault(); returnTarget.current?.focus(); }}
        >
          <DialogHeader className="pr-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{ui('Review this prerequisite, then return to the same homework. You can leave at any time.')}</DialogDescription>
          </DialogHeader>
          <ErrorBoundary key={unit.id} fallback={
            <div className="space-y-3">
              <p role="alert">{ui('This review could not be displayed. Your homework is still available.')}</p>
              <Button onClick={() => resume(false)}>{ui('Continue in Tutor')}</Button>
            </div>
          }>
            <MotionConfig reducedMotion="user">
              <LearningSessionPlayer
                key={unit.id}
                units={[displayUnit]}
                sessionTitle={title}
                allowBackwardNavigation={false}
                onSessionComplete={() => resume(true)}
                onExit={() => resume(false)}
              />
            </MotionConfig>
          </ErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  );
}
