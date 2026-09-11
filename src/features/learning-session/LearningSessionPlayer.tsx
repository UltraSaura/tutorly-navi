import React, { useState, useMemo } from 'react';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import type { LearningUnit } from '@/types/learning-unit';
import { LearningUnitRenderer } from './LearningUnitRenderer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X, CheckCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface LearningSessionPlayerProps {
  /** Ordered sequence of learning units to play */
  units: LearningUnit[];
  /** Optional index of the starting unit */
  initialUnitIndex?: number;
  /** Callback fired whenever an individual unit is finished */
  onUnitComplete?: (unit: LearningUnit, result?: unknown) => void;
  /** Callback fired when all units in the session are finished */
  onSessionComplete?: () => void;
  /** Optional callback to exit or dismiss the session */
  onExit?: () => void;
  /** Optional session title displayed in header */
  sessionTitle?: string;
  /** Whether the user can navigate backward to previous units */
  allowBackwardNavigation?: boolean;
}

export function LearningSessionPlayer({
  units = [],
  initialUnitIndex = 0,
  onUnitComplete,
  onSessionComplete,
  onExit,
  sessionTitle,
  allowBackwardNavigation = true,
}: LearningSessionPlayerProps) {
  const ui = useInterfaceTranslation();
  const reducedMotion = useReducedMotion();
  // Clamped initial index
  const safeInitialIndex = useMemo(() => {
    if (units.length === 0) return 0;
    return Math.max(0, Math.min(initialUnitIndex, units.length - 1));
  }, [units.length, initialUnitIndex]);

  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
  const [completedUnitIds, setCompletedUnitIds] = useState<Set<string>>(new Set());
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Safety guard against empty units array
  if (!units || units.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto p-6 text-center space-y-4 bg-card border rounded-2xl shadow-sm">
        <p className="text-sm text-muted-foreground">{ui("Aucune unité d’apprentissage disponible pour cette session.")}</p>
        {onExit && (
          <Button onClick={onExit} variant="outline" size="sm">
            {ui("Fermer")}
          </Button>
        )}
      </div>
    );
  }

  const currentUnit = units[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / units.length) * 100);

  const handleUnitAdvance = (result?: unknown) => {
    if (currentUnit) {
      setCompletedUnitIds((prev) => new Set(prev).add(currentUnit.id));
      if (onUnitComplete) {
        onUnitComplete(currentUnit, result);
      }
    }

    if (currentIndex < units.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSessionFinished(true);
      if (onSessionComplete) {
        onSessionComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && allowBackwardNavigation) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (isSessionFinished) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 text-center space-y-5 bg-card border rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-[#12C6A0]">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">{ui("Session terminée !")}</h3>
          <p className="text-sm text-muted-foreground">
            {ui('You completed all {{count}} steps in this session.', { count: units.length })}
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button
            onClick={() => {
              setCurrentIndex(0);
              setIsSessionFinished(false);
            }}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{ui("Recommencer")}</span>
          </Button>
          {onExit && (
            <Button
              onClick={onExit}
              className="bg-[#12C6A0] hover:bg-[#0F6E56] text-white"
            >
              {ui("Terminer")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Session Header / Progress Bar */}
      <header className="flex flex-col gap-2 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allowBackwardNavigation && currentIndex > 0 && (
              <Button
                onClick={handlePrevious}
                variant="ghost"
                size="sm"
                aria-label={ui("Étape précédente")}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {sessionTitle || ui('Session d’apprentissage')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="text-xs font-bold text-[#12C6A0] bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full"
              aria-label={ui('Step {{current}} of {{total}}', { current: currentIndex + 1, total: units.length })}
            >
              {currentIndex + 1} / {units.length}
            </span>
            {onExit && (
              <Button
                onClick={onExit}
                variant="ghost"
                size="sm"
                aria-label={ui("Quitter la session")}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Minimal accessible progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ui("Progression de la session")}
          className="w-full h-1.5 bg-muted rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-[#12C6A0] transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Unit Render Area */}
      <main className="min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentUnit.id}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
          >
            <LearningUnitRenderer
              unit={currentUnit}
              onComplete={handleUnitAdvance}
            />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
