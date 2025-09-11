// src/components/user/ChatInput.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import ChatMathField from "@/components/math/ChatMathField";

type Mode = 'math' | 'text';
type Tab  = 'numbers' | 'functions';

// ✅ helper snippets with placeholders
const SNIPPETS = {
  frac: '\\frac{\\placeholder{}}{\\placeholder{}}',
  sqrt: '\\sqrt{\\placeholder{}}',
  nroot: '\\sqrt[\\placeholder{}]{\\placeholder{}}',
  ln:   '\\ln\\left(\\placeholder{}\\right)',
  log:  '\\log\\left(\\placeholder{}\\right)',
  sin:  '\\sin\\left(\\placeholder{}\\right)',
  cos:  '\\cos\\left(\\placeholder{}\\right)',
  tan:  '\\tan\\left(\\placeholder{}\\right)',
  parens: '\\left(\\placeholder{}\\right)',
  power: '^{\\placeholder{}}',
  hole: '\\placeholder{}'
};

// --- helpers ---
// keeps focus on the mathfield without triggering passive touch warnings
const keepFocus = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
}

export default function ChatInput({ 
  inputMessage, 
  setInputMessage, 
  handleSendMessage, 
  isLoading 
}: ChatInputProps) {
  const [mode, setMode] = useState<Mode>('math');          // default: math (no OS keyboard)
  const [tab, setTab]   = useState<Tab>('numbers');        // default: numbers (Frame-63)
  const [latex, setLatex] = useState("");
  const [isApplyingExternal, setIsApplyingExternal] = useState(false);

  // keep one ref
  const mfRef = useRef<MathfieldElement | null>(null);
  const textRef = useRef<HTMLInputElement | null>(null);
  
  // Tracks whether the last Next() already stepped out of a structure
  const steppedOutOnceRef = useRef(false);

  // normalize the ref to the actual <math-field> element
  function getMF() {
    let el: any = mfRef.current;
    if (!el) return null;
    if (el.element) el = el.element;             // react-mathlive wrapper
    if (el.tagName !== 'MATH-FIELD') {
      const inner = el.querySelector?.('math-field');
      if (inner) el = inner;
    }
    return el;
  }

  // Focus the right field when mode changes
  useEffect(() => {
    if (mode === 'math') {
      mfRef.current?.blur();           // ensure OS keyboard does not pop
      // do NOT focus here; we only focus AFTER user inserts something
    } else {
      setTimeout(() => textRef.current?.focus(), 0);
    }
  }, [mode]);

  // Handle external latex changes (from props)
  useEffect(() => {
    const f = getMF();
    if (!f || isApplyingExternal) return;
    
    const currentLatex = f.getValue('latex');
    if (currentLatex !== inputMessage) {
      setIsApplyingExternal(true);
      f.setValue(inputMessage, { silenceNotifications: true });
      setLatex(inputMessage);
      // Reset the flag after a microtask
      queueMicrotask(() => setIsApplyingExternal(false));
    }
  }, [inputMessage, isApplyingExternal]);

  // Handle MathLive input changes
  const handleMathChange = useCallback(() => {
    if (isApplyingExternal) return; // Prevent loops during external updates
    
    const f = getMF();
    if (f) {
      const newLatex = f.getValue('latex');
      setLatex(newLatex);
    }
  }, [isApplyingExternal]);

  // ---- Helpers for Mathlive ----
  // Simple insert function - just insert the snippet
  const insert = useCallback((snippet: string) => {
    const f = getMF();
    if (!f) return;
    f.focus?.();
    if (typeof f.insert === 'function') f.insert(snippet);
    else f.executeCommand?.('insert', snippet);
    f.focus?.();
  }, []);

  // Simple next function - just use Tab key
  const next = useCallback(() => {
    const f = getMF();
    if (!f) return;

    f.focus?.();

    requestAnimationFrame(() => {
      // Just use Tab key - MathLive handles placeholder navigation
      if (typeof f.keystroke === 'function') {
        console.log('[NEXT] Using Tab keystroke');
        f.keystroke('Tab');
      } else {
        // Fallback: try basic commands
        try {
          f.executeCommand?.('moveToNextChar');
        } catch (e) {
          console.log('[NEXT] Fallback failed:', e.message);
        }
      }
    });
  }, []);

  // Simple previous function - use Shift+Tab
  const previous = useCallback(() => {
    const f = getMF();
    if (!f) return;

    f.focus?.();

    requestAnimationFrame(() => {
      // Use Shift+Tab for previous
      if (typeof f.keystroke === 'function') {
        console.log('[PREV] Using Shift+Tab keystroke');
        f.keystroke('Shift+Tab');
      } else {
        // Fallback: try basic commands
        try {
          f.executeCommand?.('moveToPreviousChar');
        } catch (e) {
          console.log('[PREV] Fallback failed:', e.message);
        }
      }
    });
  }, []);

  // Improved backspace function
  const backspace = useCallback(() => {
    const f = getMF();
    if (!f) return;

    f.focus?.();

    // Prefer the command API
    if (typeof f.executeCommand === 'function') {
      // try normal smart delete first
      if (f.executeCommand('deleteBackward')) return;

      // nudge left a few times, then try again (handles caret after groups/placeholders)
      for (let i = 0; i < 3; i++) {
        if (!f.executeCommand('moveToPreviousChar')) break;
        if (f.executeCommand('deleteBackward')) return;
      }
      // last resort
      f.executeCommand('deleteForward');
      return;
    }

    // very old builds: optional fallback
    if (typeof f.keystroke === 'function') {
      f.keystroke('Backspace');
    }
  }, []);

  // Clear all function for double-click
  const clearAll = useCallback(() => {
    const f = getMF();
    if (f) {
      f.setValue?.('', { silenceNotifications: true });
      f.focus?.();
    }
  }, []);

  const undo = () => getMF()?.undo?.();
  const redo = () => getMF()?.redo?.();

  // Toggle between math pad and phone keyboard
  const toggleMode = () => {
    if (mode === 'math') {
      setMode('text');  // open phone keyboard
    } else {
      setMode('math');  // show our math pad
      setTab('numbers');
      mfRef.current?.blur();
    }
  };

  const send = () => {
    const f = getMF();
    const payload = mode === 'math'
      ? (f?.getValue?.('latex-expanded') ?? latex)
      : inputMessage.trim();

    if (!payload) return;
    console.log('SEND:', payload);

    // Set the message in the parent component
    setInputMessage(payload);
    // Call the parent's send handler
    handleSendMessage();

    // Clear the inputs
    if (mode === 'math') {
      setLatex("");
      if (f) f.setValue?.('', { silenceNotifications: true });
      steppedOutOnceRef.current = false;
    } else {
      setInputMessage(""); // Clear the parent's state
    }
  };

  // Build small matrix with placeholders (1x2, 2x1, 2x2 as examples)
  const insertMatrix = (r: number, c: number) => {
    const row = Array(c).fill('\\placeholder{}').join(' & ');
    const body = Array(r).fill(row).join(' \\\\ ');
    insert(`\\begin{matrix} ${body} \\end{matrix}`);
  };

  return (
    <div className="tn-chat-wrapper">
      {/* Suggested actions (optional) */}
      <div className="tn-suggestions">
        {['Simplify the expression','Factorize','Find derivative','Convert to decimal'].map(s=>(
          <button 
            key={s} 
            type="button" 
            className="tn-chip" 
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onClick={() => {}} // Add click handler if needed
          >{s}</button>
        ))}
      </div>

      {/* CHAT BUBBLE */}
      <div className="tn-bubble">
        <button 
          type="button" 
          className="tn-plus" 
          title="Add" 
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={() => {}} // Add click handler if needed
        >＋</button>

        {/* SINGLE toggle (stacked): in math mode show text-keyboard icon; in text mode show numeric-pad icon */}
        <button 
          type="button" 
          className="tn-plus" 
          title="Toggle keyboard" 
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={toggleMode}
        >
          {mode === 'math' ? '⌨️' : ''}
        </button>

        {/* Editable area: Mathlive when in math mode; text input when in text mode */}
        {mode === 'math' ? (
          <math-field 
            ref={mfRef} 
            defaultValue={latex}
            onInput={handleMathChange}
            className="tn-chat-mathfield"
            {...({ 'virtual-keyboard-policy': 'manual' } as any)}
            placeholder="Type your exercise or question…"
          />
        ) : (
          <input
            ref={textRef}
            className="tn-text-input"
            placeholder="Type your exercise or question…"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
          />
        )}

        <button 
          type="button" 
          className="tn-send" 
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={send}
          title="Send"
        >➤</button>
      </div>

      {/* OUR PAD: visible only in math mode */}
      {mode === 'math' && (
        <div className="tn-pad">
          {/* Top row: tab switch + editing controls */}
          <div className="tn-row" style={{justifyContent:'space-between'}}>
            <div className="flex gap-2">
              <button
                type="button"
                className={`tn-tab ${tab==='numbers'?'tn-active':''}`}
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={() => setTab('numbers')}
              >123</button>
              <button
                type="button"
                className={`tn-tab ${tab==='functions'?'tn-active':''}`}
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={() => setTab('functions')}
              >ƒ</button>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                className="tn-btn" 
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={undo}
              >↶</button>
              <button 
                type="button" 
                className="tn-btn" 
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={redo}
              >↷</button>
              <button 
                type="button" 
                className="tn-btn" 
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={backspace}
              >⌫</button>
              <button 
                type="button" 
                className="tn-btn" 
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={() => { 
                  const f = getMF();
                  if (f) {
                    f.setValue?.('', { silenceNotifications: true });
                    f.focus?.();
                  }
                  steppedOutOnceRef.current = false; 
                }}
              >Clear</button>
              <button 
                type="button" 
                className="tn-btn" 
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={previous}
              >◀ Prev</button>
              <button 
                type="button" 
                className="tn-btn tn-next" 
                onMouseDown={keepFocus}
                onPointerDown={keepFocus}
                onClick={next}
              >Next ▶</button>
            </div>
          </div>

          {/* NUMBERS (Frame-63 default) */}
          {tab === 'numbers' && (
            <div className="tn-grid" style={{marginTop:'.5rem'}}>
              {["7","8","9","\\times","4","5","6","\\div","1","2","3","+","0",".","-","("].map(k=>(
                <button 
                  key={k} 
                  type="button" 
                  className="tn-key" 
                  onMouseDown={keepFocus}
                  onPointerDown={keepFocus}
                  onClick={()=>insert(k)}
                >
                  {label(k)}
                </button>
              ))}
            </div>
          )}

          {/* FUNCTIONS (Frame-3) */}
          {tab === 'functions' && (
            <div className="space-y-2" style={{marginTop:'.5rem'}}>
              <div className="tn-grid">
                {[
                  SNIPPETS.frac, SNIPPETS.sqrt, SNIPPETS.nroot, SNIPPETS.power,
                  SNIPPETS.ln, SNIPPETS.log, "\\pi", "e",
                  SNIPPETS.sin, SNIPPETS.cos, SNIPPETS.tan, SNIPPETS.parens,
                  SNIPPETS.hole
                ].map(k=>(
                  <button 
                    key={k} 
                    type="button" 
                    className="tn-key" 
                    onMouseDown={keepFocus}
                    onPointerDown={keepFocus}
                    onClick={()=>insert(k)}
                  >
                    {label(k)}
                  </button>
                ))}
              </div>

              {/* Matrix quick buttons (1×2 / 2×1 / 2×2) */}
              <div className="tn-row">
                <button 
                  type="button" 
                  className="tn-btn" 
                  onMouseDown={keepFocus}
                  onPointerDown={keepFocus}
                  onClick={()=>insertMatrix(1,2)}
                >□ □</button>
                <button 
                  type="button" 
                  className="tn-btn" 
                  onMouseDown={keepFocus}
                  onPointerDown={keepFocus}
                  onClick={()=>insertMatrix(2,1)}
                >□↵□</button>
                <button 
                  type="button" 
                  className="tn-btn" 
                  onMouseDown={keepFocus}
                  onPointerDown={keepFocus}
                  onClick={()=>insertMatrix(2,2)}
                >□ □ ↵ □ □</button>
                {/* back to numbers */}
                <button 
                  type="button" 
                  className="tn-btn" 
                  onMouseDown={keepFocus}
                  onPointerDown={keepFocus}
                  onClick={()=>setTab('numbers')}
                >123</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function label(src: string) {
  const map: Record<string,string> = {
    [SNIPPETS.frac]: 'a⁄b',
    [SNIPPETS.sqrt]: '√',
    [SNIPPETS.nroot]: 'ⁿ√',
    [SNIPPETS.power]: 'x^n',
    [SNIPPETS.parens]: '(  )',
    [SNIPPETS.ln]: 'ln( )',
    [SNIPPETS.log]: 'log( )',
    [SNIPPETS.sin]: 'sin( )',
    [SNIPPETS.cos]: 'cos( )',
    [SNIPPETS.tan]: 'tan( )',
    [SNIPPETS.hole]: '□',
    '\\times': '×', '\\div': '÷'
  };
  return map[src] ?? src;
} 