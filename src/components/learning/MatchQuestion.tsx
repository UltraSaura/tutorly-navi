import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchQuestion } from "@/types/quiz-bank";
import { cn } from "@/lib/utils";

interface Props {
  question: MatchQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}

// ── Smart label: detects fractions like "1/2", "3/4" and renders a mini pie ──

function MiniPie({ n, d, size = 28 }: { n: number; d: number; size?: number }) {
  if (d <= 0 || n < 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;
  const filled = Math.min(n, d);

  if (filled === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" stroke="#d1d5db" strokeWidth={1} />
      </svg>
    );
  }
  if (filled >= d) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="#3b82f6" stroke="#2563eb" strokeWidth={1} />
      </svg>
    );
  }

  const slices: React.ReactNode[] = [];
  const sliceAngle = (2 * Math.PI) / d;
  const startOffset = -Math.PI / 2; // start from top

  for (let i = 0; i < d; i++) {
    const a1 = startOffset + i * sliceAngle;
    const a2 = a1 + sliceAngle;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const large = sliceAngle > Math.PI ? 1 : 0;
    const colored = i < filled;
    slices.push(
      <path
        key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
        fill={colored ? "#3b82f6" : "#e5e7eb"}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
      {slices}
    </svg>
  );
}

// Parses "3/4" → {n:3, d:4} or null
function parseFraction(s: string): { n: number; d: number } | null {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1]);
  const d = parseInt(m[2]);
  if (d === 0 || n > d * 3) return null; // sanity check
  return { n, d };
}

// Detects decimals like "0.5", "0.25" and expresses as fraction for display
function parseDecimalAsFraction(s: string): { n: number; d: number } | null {
  const val = parseFloat(s.trim());
  if (isNaN(val) || val < 0 || val > 1) return null;
  // Only render pie for common simple fractions
  const candidates = [2, 3, 4, 5, 6, 8, 10];
  for (const d of candidates) {
    const n = Math.round(val * d);
    if (Math.abs(n / d - val) < 0.001) return { n, d };
  }
  return null;
}

function PairLabel({ text }: { text: string }) {
  // Try fraction first
  const frac = parseFraction(text);
  if (frac) {
    return (
      <span className="flex items-center gap-1.5">
        <MiniPie n={frac.n} d={frac.d} size={26} />
        <span>{text}</span>
      </span>
    );
  }
  // Try decimal that maps to a simple fraction
  const dec = parseDecimalAsFraction(text);
  if (dec) {
    return (
      <span className="flex items-center gap-1.5">
        <MiniPie n={dec.n} d={dec.d} size={26} />
        <span>{text}</span>
      </span>
    );
  }
  // Plain text fallback
  return <span>{text}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function MatchQuestionView({ question, value, onChange }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const confirmedPairs: string[] = Array.isArray(value) ? value : [];
  const pairedLeftIds  = confirmedPairs.map(p => p.split(":")[0]);
  const pairedRightIds = confirmedPairs.map(p => p.split(":")[1]);

  const handleLeftTap = (leftId: string) => {
    if (pairedLeftIds.includes(leftId)) return;
    setSelectedLeft(prev => prev === leftId ? null : leftId);
  };

  const handleRightTap = (rightId: string) => {
    if (!selectedLeft) return;
    if (pairedRightIds.includes(rightId)) return;
    onChange([...confirmedPairs, `${selectedLeft}:${rightId}`]);
    setSelectedLeft(null);
  };

  const removePair = (pair: string) => {
    onChange(confirmedPairs.filter(p => p !== pair));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, i) => {
            const isPaired   = pairedLeftIds.includes(pair.leftId);
            const isSelected = selectedLeft === pair.leftId;
            return (
              <motion.button
                key={pair.leftId}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleLeftTap(pair.leftId)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                  isPaired
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 opacity-60"
                    : isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-neutral-300 hover:border-primary/50"
                )}
              >
                <PairLabel text={pair.left} />
              </motion.button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, i) => {
            const isPaired = pairedRightIds.includes(pair.rightId);
            return (
              <motion.button
                key={pair.rightId}
                type="button"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRightTap(pair.rightId)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                  isPaired
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 opacity-60"
                    : selectedLeft
                    ? "border-primary/40 hover:border-primary hover:bg-primary/5"
                    : "border-neutral-300"
                )}
              >
                <PairLabel text={pair.right} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Confirmed pairs summary */}
      <AnimatePresence>
        {confirmedPairs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1"
          >
            <p className="text-xs text-muted-foreground mb-1">
              {confirmedPairs.length}/{question.pairs.length} paires
            </p>
            {confirmedPairs.map(pair => {
              const [lid, rid] = pair.split(":");
              const left  = question.pairs.find(p => p.leftId  === lid)?.left;
              const right = question.pairs.find(p => p.rightId === rid)?.right;
              return (
                <motion.div
                  key={pair}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/20
                             border border-green-200 rounded-lg px-3 py-1.5"
                >
                  <span className="font-medium flex items-center gap-1">
                    {left && <PairLabel text={left} />}
                  </span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium flex items-center gap-1">
                    {right && <PairLabel text={right} />}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePair(pair)}
                    className="ml-auto text-muted-foreground hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedLeft && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-primary font-medium"
        >
          Maintenant sélectionne un élément à droite
        </motion.p>
      )}
    </div>
  );
}
