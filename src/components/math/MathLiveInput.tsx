import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

export const MathLiveInput = ({
  value = '',
  onChange,
  onEnter,
  placeholder = '',
  className,
  disabled = false,
  autoFocus = false,
  onKeyboardChange
}: MathLiveInputProps) => {
  const mathfieldRef = useRef<any>(null);
  const [isMathLiveReady, setIsMathLiveReady] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardHeight = useRef<number>(0); // Use ref to avoid re-renders

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
        
        // Force manual keyboard control on mobile
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                              window.screen.width < 768;

        mf.virtualKeyboardPolicy = isMobileDevice ? 'manual' : 'auto';
        mf.virtualKeyboards = 'all';
        mf.smartFence = true;
        mf.smartSuperscript = true;
        mf.removeExtraneousParentheses = true;
        
        // Force keyboard to show on focus for mobile
        if (isMobileDevice) {
          mf.addEventListener('focus', () => {
            console.log('[DEBUG] MathLive focused, showing keyboard');
            mf.virtualKeyboardVisible = true;
            
            // Improved keyboard detection with actual visible height
            setTimeout(() => {
              const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard, .ML__virtual-keyboard');
              if (keyboardElement) {
                const rect = keyboardElement.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(keyboardElement);
                const isVisible = rect.height > 0 && 
                                computedStyle.display !== 'none' &&
                                computedStyle.visibility !== 'hidden';
                
                // Get actual keyboard height (capped at 40% of viewport)
                // Only count as keyboard height if it's actually visible from the bottom
                let height = 0;
                
                // More lenient check - allow 5px tolerance for rounding
                const isAtBottom = Math.abs(rect.bottom - window.innerHeight) < 5;
                
                if (isVisible && isAtBottom) {
                  // Keyboard is anchored to bottom, use its actual height
                  height = Math.min(rect.height, window.innerHeight * 0.4);
                  console.log('[DEBUG] Keyboard anchored to bottom, using rect.height:', rect.height);
                } else if (isVisible && rect.top > window.innerHeight * 0.5) {
                  // Keyboard is in lower half of screen
                  height = Math.min(window.innerHeight - rect.top, window.innerHeight * 0.4);
                  console.log('[DEBUG] Keyboard in lower half, calculated height:', height);
                }
                
                console.log('[DEBUG] Keyboard detection:', {
                  isVisible, 
                  height,
                  rectHeight: rect.height,
                  top: rect.top,
                  bottom: rect.bottom,
                  isAnchoredToBottom: isAtBottom,
                  bottomDiff: Math.abs(rect.bottom - window.innerHeight),
                  display: computedStyle.display,
                  visibility: computedStyle.visibility,
                  viewportHeight: window.innerHeight,
                  maxAllowedHeight: window.innerHeight * 0.4
                });
                
                // Only update if visibility changed or height changed significantly (>10px)
                if (height > 0 && (isVisible !== keyboardVisible || Math.abs(height - keyboardHeight.current) > 10)) {
                  setKeyboardVisible(isVisible);
                  keyboardHeight.current = height;
                  onKeyboardChange?.(isVisible, height);
                  console.log('[DEBUG] ✅ Keyboard state updated - visible:', isVisible, 'height:', height);
                } else if (height === 0 && keyboardVisible) {
                  // Keyboard not properly detected, hide it
                  setKeyboardVisible(false);
                  keyboardHeight.current = 0;
                  onKeyboardChange?.(false, 0);
                  console.log('[DEBUG] ⚠️ Keyboard height is 0, hiding input');
                }
              }
            }, 200); // Increased timeout to let keyboard fully render
          });
          
          mf.addEventListener('blur', () => {
            console.log('[DEBUG] MathLive blurred, hiding keyboard');
            mf.virtualKeyboardVisible = false;
            
            // Only update if visibility actually changed
            if (keyboardVisible) {
              setKeyboardVisible(false);
              keyboardHeight.current = 0;
              onKeyboardChange?.(false, 0);
            }
          });
        }
        
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

        // Scroll input into view when keyboard shows
        mf.addEventListener('focus', () => {
          setTimeout(() => {
            // Scroll the input into view above keyboard
            const inputElement = mf.closest('.fixed');
            if (inputElement) {
              inputElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }

            // Also adjust the body scroll if needed
            if (window.visualViewport) {
              const keyboardHeight = window.innerHeight - window.visualViewport.height;
              if (keyboardHeight > 0) {
                document.body.style.paddingBottom = `${keyboardHeight}px`;
              }
            }
          }, 300);
        });

        // Reset padding when keyboard hides
        mf.addEventListener('blur', () => {
          document.body.style.paddingBottom = '0px';
        });

        // Set initial value
        if (value) {
          mf.value = value;
        }

        setIsMathLiveReady(true);
        console.log('[DEBUG] MathLive initialized successfully');

      } catch (error) {
        console.error('Error initializing MathLive:', error);
        setIsMathLiveReady(false);
      }
    };

    initMathField();
  }, [value, onChange, onEnter, onKeyboardChange]);

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
    }, 100);
    return () => clearInterval(pollInterval);
  }, [lastValue, onChange, isMathLiveReady]);

  // Show keyboard function
  const showKeyboard = () => {
    if (mathfieldRef.current) {
      mathfieldRef.current.focus();
      mathfieldRef.current.virtualKeyboardVisible = true;
      setKeyboardVisible(true);
    }
  };

  return (
    <div className="relative">
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
      
      {/* Keyboard toggle button for mobile */}
      {!keyboardVisible && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={showKeyboard}
          className="absolute top-2 right-2 h-6 px-2 bg-background/80 backdrop-blur-sm text-xs"
          title="Show keyboard"
        >
          ⌨️
        </Button>
      )}
    </div>
  );
};