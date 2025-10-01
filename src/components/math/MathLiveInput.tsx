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
  onKeyboardChange?: (isVisible: boolean, height: number) => void;
}

export const MathLiveInput = ({
  value = '',
  onChange,
  onEnter,
  onEscape,
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
  const keyboardHeight = useRef<number>(0);

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
        
        // Configure for proper rendering - enable virtual keyboards with layout awareness
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                              window.screen.width < 768;
        
        mf.virtualKeyboardPolicy = isMobileDevice ? 'manual' : 'auto';
        mf.virtualKeyboards = 'all';  // Enable virtual keyboards
        mf.smartFence = true;
        mf.smartSuperscript = true;
        mf.removeExtraneousParentheses = true;
        
        // Force keyboard to show on focus for mobile
        if (isMobileDevice) {
          mf.addEventListener('focus', () => {
            console.log('[DEBUG] MathLive focused, showing keyboard');
            mf.virtualKeyboardVisible = true;
          });
          
          mf.addEventListener('blur', () => {
            console.log('[DEBUG] MathLive blurred, hiding keyboard');
            mf.virtualKeyboardVisible = false;
          });
        }
        
        // Robust keyboard detection using MutationObserver
        const keyboardObserver = new MutationObserver(() => {
          const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard, .ML__virtual-keyboard');
          if (keyboardElement) {
            const rect = keyboardElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(keyboardElement);
            const isVisible = rect.height > 0 && 
                            computedStyle.display !== 'none' &&
                            computedStyle.visibility !== 'hidden' &&
                            rect.bottom > 0 &&
                            rect.top < window.innerHeight;
            
            // Get actual keyboard height (capped at 40% of viewport)
            let height = 0;
            if (isVisible) {
              // Check if keyboard is near the bottom (within 5px tolerance)
              if (Math.abs(rect.bottom - window.innerHeight) < 5) {
                // Keyboard is anchored to bottom, use its actual height
                height = Math.min(rect.height, window.innerHeight * 0.4);
              } else if (rect.top > window.innerHeight * 0.5) {
                // Keyboard is in lower half of screen
                height = Math.min(window.innerHeight - rect.top, window.innerHeight * 0.4);
              } else {
                // Keyboard is visible but position unclear, use rect height
                height = Math.min(rect.height, window.innerHeight * 0.4);
              }
            }
            
            console.log('[DEBUG] Keyboard detection:', { 
              isVisible, 
              height,
              rectHeight: rect.height,
              top: rect.top,
              bottom: rect.bottom,
              isAnchoredToBottom: Math.abs(rect.bottom - window.innerHeight) < 5,
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              viewportHeight: window.innerHeight,
              maxAllowedHeight: window.innerHeight * 0.4
            });
            
            if (isVisible !== keyboardVisible || Math.abs(height - keyboardHeight.current) > 10) {
              setKeyboardVisible(isVisible);
              keyboardHeight.current = height;
              onKeyboardChange?.(isVisible, height);
            }
          }
        });
        
        // Start observing for keyboard changes
        keyboardObserver.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
        
        // Additional detection via window resize
        const handleResize = () => {
          const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard, .ML__virtual-keyboard');
          if (keyboardElement) {
            const rect = keyboardElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(keyboardElement);
            const isVisible = rect.height > 0 && 
                            computedStyle.display !== 'none' &&
                            computedStyle.visibility !== 'hidden' &&
                            rect.bottom > 0 &&
                            rect.top < window.innerHeight;
            
            // Get actual keyboard height (capped at 40% of viewport)
            let height = 0;
            if (isVisible) {
              // Check if keyboard is near the bottom (within 5px tolerance)
              if (Math.abs(rect.bottom - window.innerHeight) < 5) {
                // Keyboard is anchored to bottom, use its actual height
                height = Math.min(rect.height, window.innerHeight * 0.4);
              } else if (rect.top > window.innerHeight * 0.5) {
                // Keyboard is in lower half of screen
                height = Math.min(window.innerHeight - rect.top, window.innerHeight * 0.4);
              } else {
                // Keyboard is visible but position unclear, use rect height
                height = Math.min(rect.height, window.innerHeight * 0.4);
              }
            }
            
            console.log('[DEBUG] Window resize keyboard check:', { 
              isVisible, 
              height,
              rectHeight: rect.height,
              rect: { top: rect.top, bottom: rect.bottom },
              fromBottom: window.innerHeight - rect.top,
              viewportHeight: window.innerHeight
            });
            
            if (isVisible !== keyboardVisible || Math.abs(height - keyboardHeight.current) > 10) {
              setKeyboardVisible(isVisible);
              keyboardHeight.current = height;
              onKeyboardChange?.(isVisible, height);
            }
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Focus detection for additional keyboard state tracking
        const handleFocus = () => {
          setTimeout(() => {
            const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard');
            if (keyboardElement) {
              const rect = keyboardElement.getBoundingClientRect();
              const isVisible = rect.height > 0 && window.getComputedStyle(keyboardElement).display !== 'none';
              // Get actual keyboard height (capped at 40% of viewport)
              let height = 0;
              if (isVisible) {
                // Check if keyboard is near the bottom (within 5px tolerance)
                if (Math.abs(rect.bottom - window.innerHeight) < 5) {
                  // Keyboard is anchored to bottom
                  height = Math.min(rect.height, window.innerHeight * 0.4);
                } else if (rect.top > window.innerHeight * 0.5) {
                  // Keyboard is in lower half of screen
                  height = Math.min(window.innerHeight - rect.top, window.innerHeight * 0.4);
                } else {
                  // Keyboard is visible, use rect height
                  height = Math.min(rect.height, window.innerHeight * 0.4);
                }
              }
              
              console.log('[DEBUG] Focus keyboard check:', { isVisible, height });
              setKeyboardVisible(isVisible);
              onKeyboardChange?.(isVisible, height);
            }
          }, 100);
        };
        
        mf.addEventListener('focus', handleFocus);
        
        // Cleanup function
        const cleanup = () => {
          keyboardObserver.disconnect();
          window.removeEventListener('resize', handleResize);
          mf.removeEventListener('focus', handleFocus);
        };
        
        // Store cleanup for later use
        (mf as any)._keyboardCleanup = cleanup;
        
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
              onKeyboardChange?.(false, 0);
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
              onKeyboardChange?.(false, 0);
            }
            mf.blur(); // Remove focus from the field
            onEscape?.();
          }
        });

        // Monitor virtual keyboard state (fallback detection)
        mf.addEventListener('virtual-keyboard-toggle', (event: any) => {
          console.log('[DEBUG] Virtual keyboard toggle event:', event);
          const isVisible = event?.detail?.visible ?? false;
          
          // Get actual keyboard height from DOM if possible
          let keyboardHeight = 280; // Default fallback
          setTimeout(() => {
            const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard');
            if (keyboardElement) {
              const rect = keyboardElement.getBoundingClientRect();
              // Calculate height properly, capped at 40% of viewport
              if (Math.abs(rect.bottom - window.innerHeight) < 5) {
                // Near bottom
                keyboardHeight = Math.min(rect.height, window.innerHeight * 0.4);
              } else if (rect.top > window.innerHeight * 0.5) {
                // In lower half
                keyboardHeight = Math.min(window.innerHeight - rect.top, window.innerHeight * 0.4);
              } else {
                // Default case
                keyboardHeight = Math.min(rect.height || 280, window.innerHeight * 0.4);
              }
              console.log('[DEBUG] Virtual keyboard measured after toggle:', { 
                isVisible, 
                keyboardHeight,
                rect: { top: rect.top, bottom: rect.bottom }
              });
              setKeyboardVisible(isVisible);
              onKeyboardChange?.(isVisible, keyboardHeight);
            }
          }, 100); // Small delay to let keyboard render
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
    
    // Cleanup on unmount
    return () => {
      if (mathfieldRef.current && (mathfieldRef.current as any)._keyboardCleanup) {
        (mathfieldRef.current as any)._keyboardCleanup();
      }
    };
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
      // Notify parent that keyboard is dismissed
      onKeyboardChange?.(false, 0);
    }
    if (mathfieldRef.current) {
      mathfieldRef.current.blur();
    }
  };
  
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
      
      {/* Keyboard Toggle Buttons */}
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