import { BASE_KEYS, ADVANCED_KEYS, SNIPPET_LABELS } from '@/lib/mathConstants';

type Props = {
  insert: (latex: string) => void;
  next: () => void;
  backspace: () => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
};

const keepFocus = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

// This component uses the backspace prop function passed from parent

export default function MathPad({ insert, next, backspace, showAdvanced, onToggleAdvanced }: Props) {
  return (
    <div className="math-pad">
      {/* Basic keys */}
      <div className="grid grid-cols-4 gap-1">
        {BASE_KEYS.flat().map((key, index) => (
          <button
            key={index}
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
          onClick={backspace}
          className="math-key"
        >
          ⌫
        </button>
      </div>

      {/* Advanced keys */}
      {showAdvanced && (
        <div className="grid grid-cols-4 gap-1 mt-2">
          {ADVANCED_KEYS.flat().map((key, index) => (
            <button
              key={index}
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