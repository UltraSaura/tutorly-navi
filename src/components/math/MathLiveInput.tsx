import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    // Dynamically import MathLive to avoid SSR issues
    const initMathField = async () => {
      try {
        const { MathfieldElement } = await import('mathlive');
        
        if (!mathfieldRef.current) return;

        // Configure MathLive
        MathfieldElement.fontsDirectory = 'https://unpkg.com/mathlive/dist/fonts/';
        MathfieldElement.soundsDirectory = 'https://unpkg.com/mathlive/dist/sounds/';

        const mathfield = mathfieldRef.current;
        
        // Set initial value
        if (value) {
          mathfield.value = value;
        }

        // Configure mathfield options
        mathfield.options = {
          virtualKeyboardMode: 'auto',
          smartMode: true,
          smartFence: true,
          smartSuperscript: true,
          readOnly: disabled,
        };

        // Set up event listeners
        mathfield.addEventListener('input', (e: any) => {
          if (onChange) {
            onChange(e.target.value);
          }
        });

        mathfield.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey && onEnter) {
            e.preventDefault();
            onEnter();
          }
        });

        if (autoFocus) {
          mathfield.focus();
        }

      } catch (error) {
        console.error('Failed to initialize MathLive:', error);
      }
    };

    initMathField();
  }, []);

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