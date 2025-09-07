import { BASE_KEYS, ADVANCED_KEYS, SNIPPET_LABELS } from '@/lib/mathConstants';

type Props = {
  insert: (latex: string) => void;
  next: () => void;
  backspace: () => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
};

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

// --- use this for your ⌫ button ---
const handleBackspace = () => {
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
};

export default function MathPad({ insert, next, backspace, showAdvanced, onToggleAdvanced }: Props) {
  return (
    <div className="math-pad">
      {/* Basic keys */}
      <div className="grid grid-cols-4 gap-1">
        {BASE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onTouchStart={keepFocus}
            onClick={() => insert(key)}
            className="math-key"
          >
            {key}
          </button>
        ))}
        
        {/* Next button */}
        <button
          type="button"
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onTouchStart={keepFocus}
          onClick={next}
          className="math-key"
        >
          Next ▶
        </button>
        
        {/* Backspace button */}
        <button
          type="button"
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onTouchStart={keepFocus}
          onClick={handleBackspace}
          className="math-key"
        >
          ⌫
        </button>
      </div>

      {/* Advanced keys */}
      {showAdvanced && (
        <div className="grid grid-cols-4 gap-1 mt-2">
          {ADVANCED_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={keepFocus}
              onPointerDown={keepFocus}
              onTouchStart={keepFocus}
              onClick={() => insert(key)}
              className="math-key"
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Snippet buttons */}
      <div className="grid grid-cols-4 gap-1 mt-2">
        {Object.entries(SNIPPET_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onTouchStart={keepFocus}
            onClick={() => insert(key)}
            className="math-key"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
} 