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

        // Configure mathfield with simplified keyboard setup
        mathfield.setOptions({
          virtualKeyboardMode: 'manual',
          virtualKeyboards: 'numeric symbols functions',
          virtualKeyboardLayout: keyboardMode,
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

        // Add custom keyboard switching buttons
        mathfield.addEventListener('virtual-keyboard-ready', () => {
          const keyboard = document.querySelector('.ML__virtual-keyboard');
          if (keyboard && !keyboard.querySelector('.keyboard-toggle')) {
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'keyboard-toggle-container';
            
            const numericBtn = document.createElement('button');
            numericBtn.className = 'keyboard-toggle numeric-toggle';
            numericBtn.textContent = '123';
            numericBtn.onclick = () => {
              mathfield.setOptions({ virtualKeyboardLayout: 'numeric' });
              setKeyboardMode('numeric');
            };
            
            const functionsBtn = document.createElement('button');
            functionsBtn.className = 'keyboard-toggle functions-toggle';
            functionsBtn.textContent = 'f(x)';
            functionsBtn.onclick = () => {
              mathfield.setOptions({ virtualKeyboardLayout: 'functions' });
              setKeyboardMode('functions');
            };
            
            toggleContainer.appendChild(numericBtn);
            toggleContainer.appendChild(functionsBtn);
            keyboard.appendChild(toggleContainer);
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

  // Handle keyboard mode switching
  useEffect(() => {
    if (mathfieldRef.current) {
      try {
        mathfieldRef.current.setOptions({
          virtualKeyboardLayout: keyboardMode
        });
      } catch (error) {
        console.error('Error switching keyboard layout:', error);
      }
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