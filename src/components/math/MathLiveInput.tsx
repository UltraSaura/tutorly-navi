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
  const [lastValue, setLastValue] = useState(value); // New state to track last value

  useEffect(() => {
    const initMathField = async () => {
      try {
        const { MathfieldElement, mathVirtualKeyboard } = await import('mathlive');
        
        if (!mathfieldRef.current) return;

        // Configure MathLive properly
        MathfieldElement.fontsDirectory = 'https://unpkg.com/mathlive@0.107.0/dist/fonts/';
        MathfieldElement.soundsDirectory = 'https://unpkg.com/mathlive@0.107.0/dist/sounds/';
        
        // Disable sounds to avoid CORS issues
        MathfieldElement.soundEnabled = false;
        
        // Set up the math field
        const mf = mathfieldRef.current as MathfieldElement;
        
        // Configure virtual keyboard - this is the key fix
        mf.virtualKeyboardPolicy = 'manual';
        mf.virtualKeyboards = 'numbers functions';
        
        // Set up event listeners
        const handleInput = (event: any) => {
          const latex = mf.getValue('latex') || ''; // FIX: Use mf.getValue('latex') instead of event.target.value
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

        // Add focus event for debugging
        mf.addEventListener('focus', () => {
          console.log('[DEBUG] MathLive focused');
        });

        // Set initial value
        if (value) {
          mf.value = value;
        }

        // Configure virtual keyboard globally - this is crucial
        if (mathVirtualKeyboard) {
          mathVirtualKeyboard.layouts = ['numbers', 'functions'];
          mathVirtualKeyboard.editToolbar = 'none';
          console.log('[DEBUG] Virtual keyboard configured');
        }

        // Add a click handler to show the virtual keyboard
        mf.addEventListener('click', () => {
          console.log('[DEBUG] MathLive clicked, showing virtual keyboard');
          if (mathVirtualKeyboard) {
            mathVirtualKeyboard.show();
          }
        });

        // Add a focus handler to show the virtual keyboard
        mf.addEventListener('focus', () => {
          console.log('[DEBUG] MathLive focused, showing virtual keyboard');
          if (mathVirtualKeyboard) {
            mathVirtualKeyboard.show();
          }
        });

        // Add a touch handler for mobile devices
        mf.addEventListener('touchstart', () => {
          console.log('[DEBUG] MathLive touched, showing virtual keyboard');
          if (mathVirtualKeyboard) {
            mathVirtualKeyboard.show();
          }
        });

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

  // Poll for changes as a fallback - more aggressive polling
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (mathfieldRef.current) {
        const currentValue = mathfieldRef.current.getValue('latex') || ''; // FIX: Use mf.getValue('latex') instead of mf.value
        if (currentValue !== lastValue) {
          console.log('[DEBUG] MathLive polled value changed:', currentValue);
          setLastValue(currentValue);
          onChange?.(currentValue);
        }
      }
    }, 50); // More frequent polling

    return () => clearInterval(pollInterval);
  }, [lastValue, onChange]);

  return (
    <math-field
      ref={mathfieldRef}
      className={cn(
        "mathlive-input min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ 
        fontSize: '14px',
        '--ml-hue': '221',
        '--ml-contains-size': 'size'
      } as any}
    />
  );
};