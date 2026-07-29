import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { MatchQuestion } from "@/types/quiz-bank";
import { cn } from "@/lib/utils";

interface Props {
  question: MatchQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}

// ── Fraction → mini pie ───────────────────────────────────────────────────────

function MiniPie({ n, d, size = 24 }: { n: number; d: number; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;
  if (d <= 0 || n < 0) return null;
  if (n === 0) return <svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="#e5e7eb" /></svg>;
  if (n >= d) return <svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="#3b82f6" /></svg>;
  const sliceAngle = (2 * Math.PI) / d;
  const start = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
      {Array.from({ length: d }, (_, i) => {
        const a1 = start + i * sliceAngle, a2 = a1 + sliceAngle;
        const large = sliceAngle > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
        return i < n ? (
          <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
            fill="#3b82f6" stroke="#fff" strokeWidth={1} />
        ) : null;
      })}
    </svg>
  );
}

function parseFraction(s: string) {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1]), d = parseInt(m[2]);
  return d > 0 && n <= d * 3 ? { n, d } : null;
}

function parseDecimalAsFraction(s: string) {
  const val = parseFloat(s.trim());
  if (isNaN(val) || val < 0 || val > 1) return null;
  for (const d of [2, 3, 4, 5, 6, 8, 10]) {
    const n = Math.round(val * d);
    if (Math.abs(n / d - val) < 0.001) return { n, d };
  }
  return null;
}

function PairLabel({ text, hideLabel = false }: { text: string; hideLabel?: boolean }) {
  const frac = parseFraction(text) ?? parseDecimalAsFraction(text);
  if (frac) {
    return (
      <span className="flex items-center gap-1.5">
        <MiniPie n={frac.n} d={frac.d} size={22} />
        {!hideLabel && <span>{text}</span>}
      </span>
    );
  }
  return <span>{text}</span>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

// ── SVG curved line ───────────────────────────────────────────────────────────

function CurvedLine({
  from, to, color = "#6366f1", dashed = false, onClick,
}: {
  from: Point; to: Point; color?: string; dashed?: boolean; onClick?: () => void;
}) {
  const dx = to.x - from.x;
  const c1 = { x: from.x + dx * 0.45, y: from.y };
  const c2 = { x: to.x - dx * 0.45, y: to.y };
  const d = `M${from.x},${from.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${to.x},${to.y}`;
  return (
    <g onClick={onClick} className={onClick ? "cursor-pointer" : undefined}>
      {/* Wide invisible hit target */}
      {onClick && (
        <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={dashed ? 2 : 2.5}
        strokeDasharray={dashed ? "6 4" : undefined}
        strokeLinecap="round"
        opacity={dashed ? 0.6 : 1}
      />
      {/* Arrow head */}
      {!dashed && (
        <circle cx={to.x} cy={to.y} r={4} fill={color} />
      )}
    </g>
  );
}

// ── Palette for pair lines ────────────────────────────────────────────────────

const LINE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4",
];

// ── Main component ────────────────────────────────────────────────────────────

export function MatchQuestionView({ question, value, onChange }: Props) {
  const hideLabel = question.hide_labels === true;
  const confirmedPairs: string[] = Array.isArray(value) ? value : [];
  const pairedLeftIds  = confirmedPairs.map(p => p.split(":")[0]);
  const pairedRightIds = confirmedPairs.map(p => p.split(":")[1]);

  // Drag state
  const [dragging, setDragging] = useState<{ leftId: string; cursor: Point } | null>(null);

  // Container + item refs for measuring positions
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs  = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rightRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Re-render trigger when sizes settle (e.g. after fonts load)
  const [, setTick] = useState(0);
  useEffect(() => { setTick(t => t + 1); }, [confirmedPairs.length]);

  // ── Geometry helpers ────────────────────────────────────────────────────────

  const getPoint = useCallback((el: HTMLElement | undefined, side: "right" | "left"): Point | null => {
    if (!el || !containerRef.current) return null;
    const er = el.getBoundingClientRect();
    const cr = containerRef.current.getBoundingClientRect();
    return {
      x: side === "right" ? er.right - cr.left : er.left - cr.left,
      y: er.top + er.height / 2 - cr.top,
    };
  }, []);

  // ── Pointer events ──────────────────────────────────────────────────────────

  const handleLeftPointerDown = (e: React.PointerEvent, leftId: string) => {
    if (pairedLeftIds.includes(leftId)) return; // already matched
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const cr = containerRef.current!.getBoundingClientRect();
    setDragging({ leftId, cursor: { x: e.clientX - cr.left, y: e.clientY - cr.top } });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    setDragging(d => d ? { ...d, cursor: { x: e.clientX - cr.left, y: e.clientY - cr.top } } : null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    // Hit-test all right items
    for (const [rightId, el] of rightRefs.current) {
      const r = el.getBoundingClientRect();
      if (
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top  && e.clientY <= r.bottom
      ) {
        if (!pairedRightIds.includes(rightId)) {
          onChange([...confirmedPairs, `${dragging.leftId}:${rightId}`]);
        }
        break;
      }
    }
    setDragging(null);
  };

  const removePair = (pair: string) => {
    onChange(confirmedPairs.filter(p => p !== pair));
  };

  // ── Compute line endpoints for confirmed pairs ───────────────────────────────

  const confirmedLines = confirmedPairs.map((pair, i) => {
    const [lid, rid] = pair.split(":");
    const from = getPoint(leftRefs.current.get(lid),  "right");
    const to   = getPoint(rightRefs.current.get(rid), "left");
    return { pair, from, to, color: LINE_COLORS[i % LINE_COLORS.length] };
  }).filter(l => l.from && l.to) as { pair: string; from: Point; to: Point; color: string }[];

  // In-progress drag line
  const dragLine = dragging
    ? { from: getPoint(leftRefs.current.get(dragging.leftId), "right"), to: dragging.cursor }
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragging(null)}
    >
      {/* SVG overlay for lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* Confirmed pair lines */}
        {confirmedLines.map(({ pair, from, to, color }) => (
          <CurvedLine
            key={pair}
            from={from} to={to}
            color={color}
            onClick={() => removePair(pair)}
          />
        ))}
        {/* In-progress drag line */}
        {dragLine?.from && (
          <CurvedLine from={dragLine.from} to={dragLine.to} dashed />
        )}
      </svg>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-2">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, i) => {
            const isPaired   = pairedLeftIds.includes(pair.leftId);
            const isDragging = dragging?.leftId === pair.leftId;
            const color = isPaired
              ? LINE_COLORS[confirmedPairs.findIndex(p => p.startsWith(pair.leftId + ":")) % LINE_COLORS.length]
              : undefined;
            return (
              <motion.button
                key={pair.leftId}
                ref={el => { if (el) leftRefs.current.set(pair.leftId, el); else leftRefs.current.delete(pair.leftId); }}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 220, damping: 22 }}
                onPointerDown={e => handleLeftPointerDown(e, pair.leftId)}
                style={isPaired ? { borderColor: color, backgroundColor: color + "18" } : undefined}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors touch-none",
                  isPaired
                    ? "opacity-80"
                    : isDragging
                    ? "border-primary bg-primary/10 shadow-md scale-[0.98]"
                    : "border-neutral-300 hover:border-primary/50 cursor-grab active:cursor-grabbing"
                )}
              >
                <PairLabel text={pair.left} hideLabel={hideLabel} />
              </motion.button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {/* Shuffle right items so order doesn't give away matches */}
          {question.pairs.map((pair, i) => {
            const isPaired = pairedRightIds.includes(pair.rightId);
            const isTarget = !!dragging && !isPaired;
            const color = isPaired
              ? LINE_COLORS[confirmedPairs.findIndex(p => p.endsWith(":" + pair.rightId)) % LINE_COLORS.length]
              : undefined;
            return (
              <motion.button
                key={pair.rightId}
                ref={el => { if (el) rightRefs.current.set(pair.rightId, el); else rightRefs.current.delete(pair.rightId); }}
                type="button"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 220, damping: 22 }}
                style={isPaired ? { borderColor: color, backgroundColor: color + "18" } : undefined}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all pointer-events-none",
                  isPaired
                    ? "opacity-80"
                    : isTarget
                    ? "border-primary/50 bg-primary/5 scale-[1.02] shadow-sm"
                    : "border-neutral-300"
                )}
              >
                <PairLabel text={pair.right} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Counter + hint */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {confirmedPairs.length}/{question.pairs.length} paires — tire un trait pour relier
        </p>
        {confirmedPairs.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Instruction on first interaction */}
      {confirmedPairs.length === 0 && !dragging && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-primary/70 mt-1"
        >
          Appuie et fais glisser depuis la gauche vers la droite
        </motion.p>
      )}
    </div>
  );
}
