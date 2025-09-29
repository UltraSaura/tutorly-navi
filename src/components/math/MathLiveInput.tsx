import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';

interface MathLiveInputProps {
  value?: string;
  onChange?: (latex: string) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const MathLiveInput = ({
  value = '',
  onChange,
  onEnter,
  onEscape,
  placeholder = '',
  className,
  disabled = false,
  autoFocus = false
}: MathLiveInputProps) => {
  const mathfieldRef = useRef<any>(null);
  const [isMathLiveReady, setIsMathLiveReady] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
        
        // Configure for proper rendering - disable virtual keyboards completely
        mf.virtualKeyboardPolicy = 'manual';
        mf.virtualKeyboards = 'none';  // Disable virtual keyboards
        mf.smartFence = true;
        mf.smartSuperscript = true;
        mf.removeExtraneousParentheses = true;
        
        // On mobile platforms, ensure no virtual keyboard appears
        if (Capacitor.isNativePlatform()) {
          mf.virtualKeyboardPolicy = 'manual';
          mf.virtualKeyboards = 'none';
          // Prevent focus from triggering virtual keyboard
          mf.addEventListener('focus', () => {
            if (mf.virtualKeyboard) {
              mf.virtualKeyboard.hide();
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

        // Add keyboard event handlers
        mf.addEventListener('keydown', (event: KeyboardEvent) => {
          console.log('[DEBUG] MathLive keydown:', event.key);
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            console.log('[DEBUG] MathLive Enter pressed, calling onEnter');
            // Hide virtual keyboard if it's visible
            if (mf.virtualKeyboard && mf.virtualKeyboard.visible) {
              mf.virtualKeyboard.hide();
              setKeyboardVisible(false);
            }
            onEnter?.();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            console.log('[DEBUG] MathLive Escape pressed');
            // Hide virtual keyboard and call escape handler
            if (mf.virtualKeyboard && mf.virtualKeyboard.visible) {
              mf.virtualKeyboard.hide();
              setKeyboardVisible(false);
            }
            mf.blur(); // Remove focus from the field
            onEscape?.();
          }
        });

        // Monitor virtual keyboard state
        mf.addEventListener('virtual-keyboard-toggle', (event: any) => {
          console.log('[DEBUG] Virtual keyboard toggle:', event.detail);
          setKeyboardVisible(event.detail.visible);
        });

        // Set initial value
        if (value) {
          mf.value = value;
        }

        // Ensure virtual keyboard stays hidden
        if (mf.virtualKeyboard) {
          mf.virtualKeyboard.hide();
        }

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

  const dismissKeyboard = () => {
    if (mathfieldRef.current?.virtualKeyboard && mathfieldRef.current.virtualKeyboard.visible) {
      mathfieldRef.current.virtualKeyboard.hide();
      setKeyboardVisible(false);
    }
    if (mathfieldRef.current) {
      mathfieldRef.current.blur();
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
      
      {/* Keyboard Dismiss Button - only show if keyboard is visible */}
      {keyboardVisible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={dismissKeyboard}
          className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
          title="Close keyboard"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};