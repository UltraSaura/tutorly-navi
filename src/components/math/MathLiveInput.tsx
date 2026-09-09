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
  onKeyboardChange?: (visible: boolean, height?: number) => void;
}

const MathLiveInputComponent = ({
  value = '',
  onChange,
  onEnter,
  placeholder = '',
  className,
  disabled = false,
  autoFocus = false,
  onKeyboardChange,
}: MathLiveInputProps) => {
  const mathfieldRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const onEnterRef = useRef(onEnter);
  const onKeyboardChangeRef = useRef(onKeyboardChange);
  const lastValueRef = useRef(value);
  const keyboardVisibleRef = useRef(false);
  const keyboardHeightRef = useRef(0);
  const [isMathLiveReady, setIsMathLiveReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    onKeyboardChangeRef.current = onKeyboardChange;
  }, [onKeyboardChange]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const initMathField = async () => {
      try {
        const mathlive = await import('mathlive');
        const { MathfieldElement } = mathlive;

        if (disposed || !mathfieldRef.current) return;

        MathfieldElement.fontsDirectory = '/mathlive/fonts/';
        MathfieldElement.soundsDirectory = '/mathlive/sounds/';
        (MathfieldElement as any).soundEnabled = false;

        const mf = mathfieldRef.current;
        mf.mathVirtualKeyboardPolicy = 'auto';
        mf.virtualKeyboardMode = 'onfocus';
        mf.virtualKeyboards = 'numeric symbols';
        mf.smartFence = true;
        mf.smartSuperscript = true;
        mf.removeExtraneousParentheses = true;
        mf.readOnly = disabled;
        mf.setAttribute('aria-label', placeholder || 'Math input');

        const showVirtualKeyboard = () => {
          if (typeof window !== 'undefined' && (window as any).mathVirtualKeyboard) {
            (window as any).mathVirtualKeyboard.show();
          } else if ('virtualKeyboardVisible' in mf) {
            mf.virtualKeyboardVisible = true;
          }
        };

        const syncValue = () => {
          const latex = mf.getValue?.('latex') || '';
          if (latex !== lastValueRef.current) {
            lastValueRef.current = latex;
            onChangeRef.current?.(latex);
          }
          return latex;
        };

        const updateKeyboardState = () => {
          window.setTimeout(() => {
            const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard, .ML__virtual-keyboard');
            if (!keyboardElement) return;

            const rect = keyboardElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(keyboardElement);
            const isVisible =
              rect.height > 0 &&
              computedStyle.display !== 'none' &&
              computedStyle.visibility !== 'hidden';

            let height = 0;
            const isAtBottom = Math.abs(rect.bottom - window.innerHeight) < 10;
            if (isVisible && isAtBottom) {
              height = Math.min(rect.height, window.innerHeight * 0.45);
            } else if (isVisible && rect.top > window.innerHeight * 0.4) {
              height = Math.min(window.innerHeight - rect.top, window.innerHeight * 0.45);
            }

            if (height > 0) {
              keyboardVisibleRef.current = true;
              keyboardHeightRef.current = height;
              onKeyboardChangeRef.current?.(true, height);
              return;
            }

            if (keyboardVisibleRef.current) {
              keyboardVisibleRef.current = false;
              keyboardHeightRef.current = 0;
              onKeyboardChangeRef.current?.(false, 0);
            }
          }, 150);
        };

        const handleFocus = () => {
          showVirtualKeyboard();
          updateKeyboardState();

          window.setTimeout(() => {
            const inputElement = mf.closest('.fixed');
            if (inputElement) {
              inputElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }

            if (window.visualViewport) {
              const viewportKeyboardHeight = window.innerHeight - window.visualViewport.height;
              if (viewportKeyboardHeight > 0) {
                document.body.style.paddingBottom = `${viewportKeyboardHeight}px`;
              }
            }
          }, 300);
        };

        const handleBlur = () => {
          syncValue();
          document.body.style.paddingBottom = '0px';
          if (keyboardVisibleRef.current) {
            keyboardVisibleRef.current = false;
            keyboardHeightRef.current = 0;
            onKeyboardChangeRef.current?.(false, 0);
          }
        };

        const handleInput = () => {
          syncValue();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            syncValue();
            onEnterRef.current?.();
          }
        };

        mf.addEventListener('focus', handleFocus);
        mf.addEventListener('click', handleFocus);
        mf.addEventListener('blur', handleBlur);
        mf.addEventListener('input', handleInput);
        mf.addEventListener('change', handleInput);
        mf.addEventListener('keydown', handleKeyDown);

        if (value) {
          mf.value = value;
          lastValueRef.current = value;
        }

        if (autoFocus) {
          window.setTimeout(() => {
            if (!disposed) {
              mf.focus();
              showVirtualKeyboard();
            }
          }, 50);
        }

        cleanup = () => {
          mf.removeEventListener('focus', handleFocus);
          mf.removeEventListener('click', handleFocus);
          mf.removeEventListener('blur', handleBlur);
          mf.removeEventListener('input', handleInput);
          mf.removeEventListener('change', handleInput);
          mf.removeEventListener('keydown', handleKeyDown);
          document.body.style.paddingBottom = '0px';
        };

        setIsMathLiveReady(true);
      } catch (error) {
        console.error('Error initializing MathLive:', error);
        setIsMathLiveReady(false);
      }
    };

    void initMathField();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [autoFocus, disabled, placeholder]);

  useEffect(() => {
    const mf = mathfieldRef.current;
    if (!mf) return;

    if ((mf.getValue?.('latex') || '') !== value) {
      mf.value = value;
      lastValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    const mf = mathfieldRef.current;
    if (!mf) return;
    mf.readOnly = disabled;
  }, [disabled]);

  useEffect(() => {
    if (!isMathLiveReady) return;

    const pollInterval = window.setInterval(() => {
      const mf = mathfieldRef.current;
      if (!mf || typeof mf.getValue !== 'function') return;

      const currentValue = mf.getValue('latex') || '';
      if (currentValue !== lastValueRef.current) {
        lastValueRef.current = currentValue;
        onChangeRef.current?.(currentValue);
      }
    }, 100);

    return () => window.clearInterval(pollInterval);
  }, [isMathLiveReady]);

  return (
    <div className="relative w-full">
      <math-field
        ref={mathfieldRef}
        placeholder={placeholder}
        className={cn(
          'mathlive-input min-h-[40px] w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{
          fontSize: '16px',
          '--ml-hue': '221',
          '--ml-contains-size': 'size',
          '--ml-font-family': 'KaTeX_Main, "Times New Roman", serif',
          '--ml-font-size': '16px',
        } as any}
      />
    </div>
  );
};

export const MathLiveInput = MathLiveInputComponent;
export default MathLiveInputComponent;
