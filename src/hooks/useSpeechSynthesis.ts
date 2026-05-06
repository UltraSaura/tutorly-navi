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

const rankVoice = (v: SpeechSynthesisVoice): number => {
  const name = v.name.toLowerCase();
  if (/natural|neural|premium|enhanced/.test(name)) return 5;
  if (/google/i.test(name)) return 4;
  if (/microsoft/i.test(name)) return 3;
  if (/samantha|thomas|amelie|daniel/i.test(name)) return 2;
  return 1;
};

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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef(onEnd);
  const onStartRef = useRef(onStart);

  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  // Load voices and listen for async voice loading
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const langCode = lang === 'fr' ? 'fr' : 'en';
    const matching = voices.filter(v => v.lang.startsWith(langCode));
    if (matching.length === 0) return null;
    matching.sort((a, b) => rankVoice(b) - rankVoice(a));
    return matching[0];
  }, [lang, voices]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

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
