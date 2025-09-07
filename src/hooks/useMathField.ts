import { useCallback, useRef } from 'react';
import type { MathfieldElement } from 'mathlive';
import { MATH_SNIPPETS } from '@/lib/mathConstants';

// --- helpers ---
type MFLike = any;

function getMathfield(ref: React.MutableRefObject<MFLike | null>): MFLike | null {
  let f: MFLike | null = ref.current ?? null;
  if (!f) return null;

  // react-mathlive <MathfieldComponent/> stores the element on `.element`
  if (f && 'element' in f) f = (f as any).element;

  // If the ref is a wrapper node, find the <math-field> inside
  if (f && f.tagName !== 'MATH-FIELD' && typeof (f as any).querySelector === 'function') {
    const inner = (f as any).querySelector('math-field');
    if (inner) f = inner;
  }

  return f;
}

const keepFocus = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export function useMathField() {
  const mfRef = useRef<MathfieldElement>(null);
  
  // Tracks whether the last Next() already stepped out of a structure
  const steppedOutOnceRef = useRef(false);

  // Reset the flag whenever we *successfully* advance to a placeholder
  const resetStepOutFlag = useCallback(() => { 
    steppedOutOnceRef.current = false; 
  }, []);

  const insert = useCallback((snippet: string) => {
    const f = mfRef.current as any;
    if (!f) return;

    f.focus();

    if (typeof f.insert === 'function') f.insert(snippet);
    else mfRef.current!.executeCommand?.('insert', snippet);

    // Jump into the first placeholder so the next click goes to denominator
    const advanced = mfRef.current!.executeCommand?.('nextPlaceholder') === true;
    if (advanced) resetStepOutFlag();

    mfRef.current!.focus();
  }, [resetStepOutFlag]);

  const insertSnippet = useCallback((snippetKey: keyof typeof MATH_SNIPPETS) => {
    insert(MATH_SNIPPETS[snippetKey]);
  }, [insert]);

  const next = useCallback(() => {
    const f = mfRef.current as any;
    if (!f) return;

    // Keep focus on the mathfield
    f.focus();

    // Run after click so no blur interferes
    requestAnimationFrame(() => {
      const tryCmd = (name: string) => {
        const ok = f.executeCommand?.(name) === true;
        console.log('[NEXT]', name, ok);
        return ok;
      };

      // 1) First, try to advance to the next placeholder in the current structure
      if (tryCmd('nextPlaceholder') || tryCmd('moveToNextPlaceholder') || tryCmd('selectNextPlaceholder')) {
        resetStepOutFlag(); // Reset since we found a placeholder
        return;
      }

      // 2) No placeholders in current structure - step out once if we haven't already
      if (!steppedOutOnceRef.current) {
        console.log('[NEXT] Stepping out of current structure');
        tryCmd('moveToGroupEnd');     // Move to end of current group
        tryCmd('moveToNextChar');     // Move right past the structure
        steppedOutOnceRef.current = true;
        
        // After stepping out, try to find the next placeholder
        if (tryCmd('selectNextPlaceholder') || tryCmd('nextPlaceholder') || tryCmd('moveToNextPlaceholder')) {
          resetStepOutFlag(); // Found a new placeholder sequence
          return;
        }
      }

      // 3) Look for any placeholder in the entire expression
      if (tryCmd('selectNextPlaceholder') || tryCmd('nextPlaceholder') || tryCmd('moveToNextPlaceholder')) {
        resetStepOutFlag(); // Found a placeholder
        return;
      }

      // 4) No placeholders anywhere - just keep moving right
      console.log('[NEXT] No placeholders found, moving right');
      tryCmd('moveToNextChar');
    });
  }, [resetStepOutFlag]);

  const backspace = useCallback(() => {
    const f = getMathfield(mfRef);
    if (!f) return;

    // Make sure the field has focus before issuing commands
    if (typeof f.focus === 'function') f.focus();

    // Prefer executeCommand; returns true if it did something
    if (typeof f.executeCommand === 'function') {
      if (f.executeCommand('deleteBackward')) return;

      // Nudge left then try again (helps when caret is right after a group)
      for (let i = 0; i < 4; i++) {
        if (!f.executeCommand('moveToPreviousChar')) break;
        if (f.executeCommand('deleteBackward')) return;
      }
      f.executeCommand('deleteForward');
      return;
    }

    // Fallback (older builds): try keystroke only if it exists
    if (typeof f.keystroke === 'function') {
      if (f.keystroke('Backspace')) return;
      for (let i = 0; i < 4; i++) {
        if (!f.keystroke('Left')) break;
        if (f.keystroke('Backspace')) return;
      }
      f.keystroke('Delete');
    }
  }, []);

  const clear = useCallback(() => {
    mfRef.current?.executeCommand?.('selectAll');
    mfRef.current?.executeCommand?.('deleteSelection');
    resetStepOutFlag(); // Reset when clearing
  }, [resetStepOutFlag]);

  const getValue = useCallback(() => {
    return mfRef.current?.getValue('latex-expanded') || '';
  }, []);

  const setValue = useCallback((value: string) => {
    if (mfRef.current) {
      mfRef.current.value = value;
      resetStepOutFlag(); // Reset when setting new value
    }
  }, [resetStepOutFlag]);

  return {
    mfRef,
    insert,
    insertSnippet,
    next,
    backspace,
    clear,
    getValue,
    setValue,
    resetStepOutFlag
  };
} 