import React, { useEffect, useRef } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Volume2, Pause, Play, Square, RotateCcw, AudioLines } from 'lucide-react';

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
  } = useSpeechSynthesis({
    lang: language,
    onEnd: () => { hasEndedRef.current = true; },
    onStart: () => { hasEndedRef.current = false; },
  });

  useEffect(() => {
    if (autoRead && text && text !== prevTextRef.current && isSupported) {
      speak(text);
    }
    prevTextRef.current = text;
  }, [text, autoRead, speak, isSupported]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  if (!isSupported) return null;

  const showEndState = hasEndedRef.current && !isSpeaking && !isPaused;

  return (
    <span className={cn('inline-flex items-center gap-1 ml-1.5 align-middle', className)}>
      {!isSpeaking && !isPaused && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => speak(text)}
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            aria-label={showEndState ? 'Read Again' : 'Read Aloud'}
          >
            {showEndState ? <RotateCcw className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAutoReadChange(!autoRead)}
            className={cn(
              "h-7 w-7 rounded-full",
              autoRead
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
            aria-label={autoRead ? 'Auto-read: on' : 'Auto-read: off'}
          >
            <AudioLines className="h-3 w-3" />
          </Button>
        </>
      )}

      {isSpeaking && !isPaused && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={pause}
            className="h-7 w-7 rounded-full text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/30"
            aria-label="Pause"
          >
            <Pause className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={stop}
            className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
            aria-label="Stop"
          >
            <Square className="h-3 w-3" />
          </Button>
        </>
      )}

      {isPaused && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={resume}
            className="h-7 w-7 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-950/30"
            aria-label="Resume"
          >
            <Play className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={stop}
            className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
            aria-label="Stop"
          >
            <Square className="h-3 w-3" />
          </Button>
        </>
      )}

      <span aria-live="polite" role="status" className="sr-only">
        {isSpeaking && !isPaused && 'Reading'}
        {isPaused && 'Paused'}
      </span>
    </span>
  );
};
