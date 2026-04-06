import React, { useEffect, useRef } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Volume2, Pause, Play, Square, RotateCcw } from 'lucide-react';

interface MathExplanationReaderProps {
  text: string;
  language: string;
  autoRead: boolean;
  onAutoReadChange: (value: boolean) => void;
  className?: string;
}

export const MathExplanationReader: React.FC<MathExplanationReaderProps> = ({
  text,
  language,
  autoRead,
  onAutoReadChange,
  className,
}) => {
  const isFr = language === 'fr';
  const prevTextRef = useRef(text);
  const hasEndedRef = useRef(false);

  const {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isSupported,
    setRate,
    rate,
  } = useSpeechSynthesis({
    lang: language,
    onEnd: () => { hasEndedRef.current = true; },
    onStart: () => { hasEndedRef.current = false; },
  });

  // Auto-read when text changes
  useEffect(() => {
    if (autoRead && text && text !== prevTextRef.current && isSupported) {
      speak(text);
    }
    prevTextRef.current = text;
  }, [text, autoRead, speak, isSupported]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  if (!isSupported) return null;

  const showEndState = hasEndedRef.current && !isSpeaking && !isPaused;

  return (
    <div className={cn('mt-3 space-y-2', className)}>
      {/* Main controls row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {!isSpeaking && !isPaused && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => speak(text)}
            className="min-h-[40px] rounded-full gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
            aria-label={showEndState 
              ? (isFr ? 'Réécouter' : 'Read Again')
              : (isFr ? 'Écouter' : 'Read Aloud')
            }
          >
            {showEndState ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                {isFr ? 'Réécouter' : 'Read Again'}
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                {isFr ? 'Écouter' : 'Read Aloud'}
              </>
            )}
          </Button>
        )}

        {isSpeaking && !isPaused && (
          <Button
            variant="outline"
            size="sm"
            onClick={pause}
            className="min-h-[40px] rounded-full gap-1.5 text-xs font-medium border-amber-400/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            aria-label={isFr ? 'Pause' : 'Pause'}
          >
            <Pause className="h-3.5 w-3.5" />
            {isFr ? 'Pause' : 'Pause'}
          </Button>
        )}

        {isPaused && (
          <Button
            variant="outline"
            size="sm"
            onClick={resume}
            className="min-h-[40px] rounded-full gap-1.5 text-xs font-medium border-green-400/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
            aria-label={isFr ? 'Reprendre' : 'Resume'}
          >
            <Play className="h-3.5 w-3.5" />
            {isFr ? 'Reprendre' : 'Resume'}
          </Button>
        )}

        {(isSpeaking || isPaused) && (
          <Button
            variant="outline"
            size="sm"
            onClick={stop}
            className="min-h-[40px] rounded-full gap-1.5 text-xs font-medium border-destructive/30 text-destructive hover:bg-destructive/10"
            aria-label={isFr ? 'Arrêter' : 'Stop'}
          >
            <Square className="h-3.5 w-3.5" />
            {isFr ? 'Arrêter' : 'Stop'}
          </Button>
        )}

        {/* Rate slider - compact */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{rate.toFixed(1)}x</span>
          <Slider
            value={[rate]}
            min={0.5}
            max={1.5}
            step={0.05}
            onValueChange={([v]) => setRate(v)}
            className="w-14"
            aria-label={isFr ? 'Vitesse de lecture' : 'Speech rate'}
          />
        </div>
      </div>

      {/* Auto-read toggle */}
      <div className="flex items-center justify-center gap-2">
        <Switch
          id="auto-read"
          checked={autoRead}
          onCheckedChange={onAutoReadChange}
          aria-label={isFr ? 'Lecture automatique' : 'Auto-read next step'}
        />
        <label htmlFor="auto-read" className="text-[11px] text-muted-foreground cursor-pointer select-none">
          {isFr ? 'Lecture auto' : 'Auto-read'}
        </label>
      </div>

      {/* ARIA live region for status */}
      <div aria-live="polite" role="status" className="sr-only">
        {isSpeaking && !isPaused && (isFr ? 'Lecture en cours' : 'Reading started')}
        {isPaused && (isFr ? 'Lecture en pause' : 'Reading paused')}
      </div>
    </div>
  );
};
