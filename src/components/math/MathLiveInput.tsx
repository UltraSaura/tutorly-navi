import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MathLiveInputProps {
  value?: string;
  onChange?: (latex: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const MathLiveInput = ({
  value = '',
  onChange,
  onEnter,
  placeholder = '',
  className,
  disabled = false,
  autoFocus = false
}: MathLiveInputProps) => {
  const mathfieldRef = useRef<any>(null);
  const [isMathLiveReady, setIsMathLiveReady] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  useEffect(() => {
    const initMathField = async () => {
      try {
        const mathlive = await import('mathlive');
        const { MathfieldElement } = mathlive;
        
        if (!mathfieldRef.current) return;

        // Use local fonts that are copied by postinstall script
        MathfieldElement.fontsDirectory = '/mathlive/fonts/';
        MathfieldElement.soundsDirectory = '/mathlive/sounds/';
        (MathfieldElement as any).soundEnabled = false;
        
        // Set up the math field
        const mf = mathfieldRef.current;
        
        // Configure for proper rendering
        mf.virtualKeyboardPolicy = 'manual';
        mf.virtualKeyboards = 'numbers functions';
        mf.smartFence = true;
        mf.smartSuperscript = true;
        mf.removeExtraneousParentheses = true;
        
        // Set up event listeners
        const handleInput = () => {
          const latex = mf.getValue('latex') || '';
          console.log('[DEBUG] MathLive input changed:', latex);
          setLastValue(latex);
          onChange?.(latex);
        };

        // Add event listeners
        mf.addEventListener('input', handleInput);
        mf.addEventListener('change', handleInput);
        mf.addEventListener('blur', handleInput);

        // Add Enter key handler for submission
        mf.addEventListener('keydown', (event: KeyboardEvent) => {
          console.log('[DEBUG] MathLive keydown:', event.key);
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            console.log('[DEBUG] MathLive Enter pressed, calling onEnter');
            onEnter?.();
          }
        });

        // Set initial value
        if (value) {
          mf.value = value;
        }

        // Virtual keyboard configuration skipped for compatibility

        setIsMathLiveReady(true);
        console.log('[DEBUG] MathLive initialized successfully');

      } catch (error) {
        console.error('Error initializing MathLive:', error);
        setIsMathLiveReady(false);
      }
    };

    initMathField();
  }, [value, onChange, onEnter]);

  // Update value when prop changes
  useEffect(() => {
    if (mathfieldRef.current && mathfieldRef.current.value !== value) {
      mathfieldRef.current.value = value;
    }
  }, [value]);

  // Update disabled state
  useEffect(() => {
    if (mathfieldRef.current) {
      mathfieldRef.current.readOnly = disabled;
    }
  }, [disabled]);

  // Poll for changes as a fallback - but only if MathLive is ready
  useEffect(() => {
    if (!isMathLiveReady) return;
    
    const pollInterval = setInterval(() => {
      if (mathfieldRef.current && typeof mathfieldRef.current.getValue === 'function') {
        const currentValue = mathfieldRef.current.getValue('latex') || '';
        if (currentValue !== lastValue) {
          console.log('[DEBUG] MathLive polled value changed:', currentValue);
          setLastValue(currentValue);
          onChange?.(currentValue);
        }
      }
    }, 100); // Reduced frequency to avoid errors
    return () => clearInterval(pollInterval);
  }, [lastValue, onChange, isMathLiveReady]);

  return (
    <math-field
      ref={mathfieldRef}
      className={cn(
        "mathlive-input min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ 
        fontSize: '16px',
        '--ml-hue': '221',
        '--ml-contains-size': 'size',
        '--ml-font-family': 'KaTeX_Main, "Times New Roman", serif',
        '--ml-font-size': '16px'
      } as any}
    />
  );
};