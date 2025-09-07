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
  const [keyboardMode, setKeyboardMode] = useState<'numeric' | 'functions'>('numeric');

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
        
        // Define custom virtual keyboards
        const numericKeyboard = {
          label: 'Numeric',
          tooltip: 'Numeric Keyboard',
          layer: 'numeric',
          rows: [
            [
              { latex: '7', class: 'ML__keycap--numeric' },
              { latex: '8', class: 'ML__keycap--numeric' },
              { latex: '9', class: 'ML__keycap--numeric' }
            ],
            [
              { latex: '4', class: 'ML__keycap--numeric' },
              { latex: '5', class: 'ML__keycap--numeric' },
              { latex: '6', class: 'ML__keycap--numeric' }
            ],
            [
              { latex: '1', class: 'ML__keycap--numeric' },
              { latex: '2', class: 'ML__keycap--numeric' },
              { latex: '3', class: 'ML__keycap--numeric' }
            ],
            [
              { latex: '+', class: 'ML__keycap--operator' },
              { latex: '0', class: 'ML__keycap--numeric' },
              { latex: '-', class: 'ML__keycap--operator' }
            ],
            [
              { latex: '\\times', class: 'ML__keycap--operator' },
              { latex: '.', class: 'ML__keycap--numeric' },
              { latex: '\\div', class: 'ML__keycap--operator' }
            ],
            [
              { 
                latex: 'f(x)', 
                class: 'ML__keycap--action',
                command: ['switchKeyboardLayer', 'functions']
              },
              { latex: '=', class: 'ML__keycap--operator' },
              { latex: '[Backspace]', class: 'ML__keycap--action' }
            ]
          ]
        };

        const functionsKeyboard = {
          label: 'Functions',
          tooltip: 'Functions Keyboard',
          layer: 'functions',
          rows: [
            [
              { latex: '\\sqrt{#?}', class: 'ML__keycap--function' },
              { latex: '#?^{#?}', class: 'ML__keycap--function' },
              { latex: '\\frac{#?}{#?}', class: 'ML__keycap--function' }
            ],
            [
              { latex: '\\sin', class: 'ML__keycap--function' },
              { latex: '\\cos', class: 'ML__keycap--function' },
              { latex: '\\tan', class: 'ML__keycap--function' }
            ],
            [
              { latex: '\\ln', class: 'ML__keycap--function' },
              { latex: '\\log', class: 'ML__keycap--function' },
              { latex: 'e', class: 'ML__keycap--function' }
            ],
            [
              { latex: '(', class: 'ML__keycap--operator' },
              { latex: ')', class: 'ML__keycap--operator' },
              { latex: '\\pi', class: 'ML__keycap--function' }
            ],
            [
              { latex: '\\alpha', class: 'ML__keycap--function' },
              { latex: '\\beta', class: 'ML__keycap--function' },
              { latex: '\\theta', class: 'ML__keycap--function' }
            ],
            [
              { 
                latex: '123', 
                class: 'ML__keycap--action',
                command: ['switchKeyboardLayer', 'numeric']
              },
              { latex: '\\infty', class: 'ML__keycap--function' },
              { latex: '[Backspace]', class: 'ML__keycap--action' }
            ]
          ]
        };

        // Set initial value
        if (value) {
          mathfield.value = value;
        }

        // Configure mathfield options with custom virtual keyboard
        mathfield.setOptions({
          virtualKeyboardMode: 'manual',
          virtualKeyboards: 'custom',
          customVirtualKeyboards: {
            numeric: numericKeyboard,
            functions: functionsKeyboard
          },
          virtualKeyboardLayout: 'numeric',
          smartMode: true,
          smartFence: true,
          smartSuperscript: true,
          readOnly: disabled,
        });

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

        // Handle keyboard layer switching
        mathfield.addEventListener('virtual-keyboard-toggle', (e: any) => {
          const currentLayer = mathfield.getOption('virtualKeyboardLayout');
          setKeyboardMode(currentLayer === 'numeric' ? 'numeric' : 'functions');
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

  // Handle keyboard mode switching
  useEffect(() => {
    if (mathfieldRef.current) {
      mathfieldRef.current.setOptions({
        virtualKeyboardLayout: keyboardMode
      });
    }
  }, [keyboardMode]);

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
      data-keyboard-mode={keyboardMode}
    />
  );
};