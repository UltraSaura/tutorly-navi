// src/components/math/ChatMathField.tsx
import { forwardRef, useEffect, useRef, useCallback } from "react";
import type { MathfieldElement } from "mathlive";

declare global {
  namespace JSX { interface IntrinsicElements { "math-field": any } }
}

type Props = {
  value?: string;
  onChange?: (latex: string) => void;
  placeholder?: string;
  showKeyboard?: boolean;
};

const ChatMathField = forwardRef<MathfieldElement, Props>(function ChatMathField(
  {
    value = "",
    onChange = () => {},
    placeholder = "Type your exercise or question…",
    showKeyboard = false,
  },
  ref
) {
  const mfRef = useRef<MathfieldElement | null>(null);
  const applyingExternal = useRef(false);

  // Push external value only when it truly changes, and silence notifications.
  useEffect(() => {
    if (value == null || !mfRef.current) return;
    const current = mfRef.current.getValue('latex');
    if (current !== value) {
      applyingExternal.current = true;
      mfRef.current.setValue(value, { silenceNotifications: true });
      queueMicrotask(() => { applyingExternal.current = false; });
    }
  }, [value]);

  const handleChange = useCallback(() => {
    if (applyingExternal.current || !mfRef.current) return; // ← prevents loop
    const v = mfRef.current.getValue('latex');
    onChange(v);               // lift state
    // DO NOT call setValue here
  }, [onChange]);

  useEffect(() => {
    const el = (ref as any)?.current as MathfieldElement | null;
    if (!el) return;
    
    mfRef.current = el; // Assign to mfRef
    el.addEventListener("input", handleChange);
    return () => el.removeEventListener("input", handleChange);
  }, [handleChange, ref]);

  return (
    <math-field
      ref={ref as any}
      class="tn-chat-mathfield"
      inlineShortcuts={false}     // prevents typed 'sqrt' → √ autocycling while debugging
      virtual-keyboard-mode="manual"
      read-only="false"
      placeholder={placeholder}
    />
  );
});

export default ChatMathField; 