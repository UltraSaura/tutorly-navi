import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechSynthesisOptions {
  rate?: number;
  lang?: string;
  onEnd?: () => void;
  onStart?: () => void;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  setRate: (rate: number) => void;
  rate: number;
}

export function useSpeechSynthesis({
  rate: initialRate = 0.85,
  lang = 'en',
  onEnd,
  onStart,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(initialRate);
  const [isSupported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef(onEnd);
  const onStartRef = useRef(onStart);

  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const langCode = lang === 'fr' ? 'fr' : 'en';
    
    // Try to find a voice matching the language
    const match = voices.find(v => v.lang.startsWith(langCode)) || null;
    return match;
  }, [lang]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    
    const voice = getVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      onStartRef.current?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      onEndRef.current?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.warn('[useSpeechSynthesis] error:', e.error);
      }
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, lang, getVoice]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  return { speak, pause, resume, stop, isSpeaking, isPaused, isSupported, setRate, rate };
}
