import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "@/types/quiz-bank";
import { evaluateQuestion } from "@/utils/quizEvaluation";
import { cn } from "@/lib/utils";
import type { VisualAngle, VisualBar, VisualUnion, VisualPie } from "@/lib/quiz/visual-types";
import { normalizeAngle } from "@/lib/quiz/visual-geometry";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManipulativeMathRenderer } from "@/components/manipulative-maths/ManipulativeMathRenderer";
import { SliderQuestionView } from "./SliderQuestion";
import { MatchQuestionView } from "./MatchQuestion";
import { FillExprQuestionView } from "./FillExprQuestion";
import { inferPromptFigure, type PromptFigureSpec } from "@/lib/quiz/promptVisual";

interface QuestionCardProps {
  question: Question;
  onChange?: (value: any) => void;
  onFinish?: (correct: boolean, tries: number) => void;
  onSkip?: () => void;
  allowRetry?: boolean;
  submittedAnswer?: any;
  isCorrect?: boolean;
}

const choiceVariants = {
  idle:     { x: 0, backgroundColor: "transparent", borderColor: "hsl(var(--border))", scale: 1 },
  selected: { backgroundColor: "hsl(var(--primary) / 0.1)", borderColor: "hsl(var(--primary))", scale: 1 },
  correct:  { backgroundColor: "#dcfce7", borderColor: "#16a34a", scale: [1, 1.05, 1], transition: { duration: 0.35 } },
  wrong:    { x: [0, -10, 10, -7, 7, -4, 4, 0], backgroundColor: "#fee2e2", borderColor: "#ef4444", transition: { duration: 0.45 } },
  faded:    { opacity: 0.4, scale: 1 },
};

// ── Read-only context visual shown above a question ──────────────────────────
function ContextVisual({ visual }: { visual: any }) {
  if (!visual) return null;

  if (visual.subtype === "pie") {
    const segments: any[] = visual.segments ?? [];
    const colored: number =
      typeof visual.correctColoredCount === "number"
        ? visual.correctColoredCount
        : segments.filter((s: any) => s.colored).length;
    const total = segments.length;
    if (total === 0) return null;

    const size = 140;
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;
    const sliceAngle = (2 * Math.PI) / total;
    const start = -Math.PI / 2;

    return (
      <div className="flex flex-col items-center gap-1">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-sm">
          <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" />
          {Array.from({ length: total }, (_, i) => {
            const a1 = start + i * sliceAngle, a2 = a1 + sliceAngle;
            const large = sliceAngle > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
            const isColored = i < colored;
            return (
              <path key={i}
                d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
                fill={isColored ? "#3b82f6" : "#e5e7eb"}
                stroke="#fff" strokeWidth={2} />
            );
          })}
        </svg>
      </div>
    );
  }

  if (visual.subtype === "angle") {
    const size = 130;
    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const aDeg = visual.aDeg ?? 0, bDeg = visual.bDeg ?? 60;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const ax = cx + r * Math.cos(toRad(aDeg)), ay = cy - r * Math.sin(toRad(aDeg));
    const bx = cx + r * Math.cos(toRad(bDeg)), by = cy - r * Math.sin(toRad(bDeg));
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-sm bg-white rounded-xl">
        <circle cx={cx} cy={cy} r={r} fill="#f8fafc" stroke="#e2e8f0" />
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    );
  }

  if (visual.subtype === "bar") {
    const bar = visual as VisualBar;
    const total = Number(bar.totalParts) || 0;
    const colored = Number(bar.coloredParts) || 0;
    if (total <= 0 || colored < 0 || colored > total) return null;

    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="grid overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-sm"
          style={{
            gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`,
            width: "100%",
            maxWidth: "320px",
            minHeight: "88px",
            aspectRatio: "4 / 1.25",
          }}
        >
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className="border border-slate-300"
              style={{ backgroundColor: i < colored ? "#2563eb" : "#f8fafc" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function factorizeRectParts(total: number) {
  if (total <= 6) {
    return { rows: 1, cols: total };
  }
  const root = Math.floor(Math.sqrt(total));
  for (let rows = root; rows >= 1; rows -= 1) {
    if (total % rows === 0) {
      return { rows, cols: total / rows };
    }
  }
  return { rows: 1, cols: total };
}

function PromptFigure({ spec }: { spec: PromptFigureSpec }) {
  if (spec.kind === "pie") {
    const size = 150;
    const cx = size / 2, cy = size / 2, r = size / 2 - 6;
    const sliceAngle = (2 * Math.PI) / spec.total;
    const start = -Math.PI / 2;

    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1.5} />
          {Array.from({ length: spec.total }, (_, i) => {
            const a1 = start + i * sliceAngle, a2 = a1 + sliceAngle;
            const large = sliceAngle > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
            return (
              <path
                key={i}
                d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
                fill={i < spec.colored ? "#2563eb" : "#e2e8f0"}
                stroke="#ffffff"
                strokeWidth={2}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  const { rows, cols } = factorizeRectParts(spec.total);
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="grid overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-sm"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: "1fr",
          width: "100%",
          maxWidth: "320px",
          minHeight: rows === 1 ? "88px" : "140px",
          aspectRatio: rows === 1 ? "4 / 1.25" : `${Math.max(cols * 1.5, 3)} / ${Math.max(rows, 1.5)}`
        }}
      >
        {Array.from({ length: spec.total }, (_, i) => (
          <div
            key={i}
            className="border border-slate-300"
            style={{ backgroundColor: i < spec.colored ? "#2563eb" : "#f8fafc" }}
          />
        ))}
      </div>
    </div>
  );
}

function renderChoiceLabel(label: string) {
  const frac = label.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '22px', fontWeight: '800', color: 'inherit', borderBottom: '2.5px solid currentColor', paddingBottom: '3px', lineHeight: '1', display: 'block', minWidth: '20px', textAlign: 'center' }}>
          {frac[1]}
        </span>
        <span style={{ fontSize: '22px', fontWeight: '800', color: 'inherit', lineHeight: '1', display: 'block', minWidth: '20px', textAlign: 'center' }}>
          {frac[2]}
        </span>
      </div>
    );
  }
  return <span style={{ fontSize: '15px', fontWeight: '600', fontFamily: 'Poppins, sans-serif', color: 'inherit' }}>{label}</span>;
}

function choiceState(
  c: { id: string; correct?: boolean },
  currentValue: any,
  submittedAnswer: any,
  isMulti: boolean,
) {
  const isSubmitted = submittedAnswer !== undefined;
  const wasSelected = isMulti
    ? Array.isArray(submittedAnswer) && submittedAnswer.includes(c.id)
    : submittedAnswer === c.id;
  const isSelected = isMulti
    ? Array.isArray(currentValue) && currentValue.includes(c.id)
    : currentValue === c.id;

  if (!isSubmitted) {
    return { border: isSelected ? '#12C6A0' : '#EAECEF', bg: isSelected ? '#F2FBF8' : 'white', color: '#0F172A', opacity: 1, shake: false };
  }
  if (wasSelected) {
    return { border: '#F7C1C1', bg: '#FCEBEB', color: '#C0121A', opacity: 1, shake: true };
  }
  return { border: '#EAECEF', bg: 'white', color: '#9CA3AF', opacity: 0.45, shake: false };
}

function getPieSegmentsSignature(segments: VisualPie["segments"]) {
  return segments
    .map((seg) => `${Number(seg.value) || 0}:${seg.colored ? 1 : 0}`)
    .join("|");
}

export function QuestionCard({
  question,
  onChange,
  onFinish,
  onSkip,
  allowRetry = false,
  submittedAnswer,
  isCorrect: isCorrectProp
}: QuestionCardProps) {
  const initialValue = useMemo(() => {
    if (question.kind === "multi") return [];
    if (question.kind === "visual") {
      return getInitialVisualValue(question.visual);
    }
    if (question.kind === "ordering") {
      return [...(question as any).items];
    }
    if (question.kind === "numeric" && (question as any).answerFormat === "fraction") {
      return { numerator: "", denominator: "" };
    }
    if (question.kind === "slider") return "";
    if (question.kind === "match") return [];
    if (question.kind === "fill-expr") return {};
    return "";
  }, [question]);

  const [value, setValue] = useState<any>(initialValue);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [draggedOrderingItem, setDraggedOrderingItem] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const inferredPromptFigure = useMemo(() => {
    if ((question as any).context_visual) return null;
    return inferPromptFigure(question);
  }, [question]);

  const setVal = (v: any) => {
    setValue(v);
    onChange?.(v);
  };

  const submitIfTimeline = () => {
    if (!onFinish) return;
    const ok = evaluateQuestion(question, value);
    if (!ok && allowRetry && tries < 1) {
      setTries(t => t + 1);
      return;
    }
    setSubmitted(true);
    setIsCorrect(ok);
    if (!ok) {
      onFinish(ok, tries);
    }
  };

  const swap = (arr: string[], i: number, j: number) => {
    const x = [...arr];
    [x[i], x[j]] = [x[j], x[i]];
    return x;
  };

  const moveOrderingItem = (arr: string[], sourceItem: string, targetItem: string) => {
    if (sourceItem === targetItem) return arr;
    const next = [...arr];
    const sourceIndex = next.indexOf(sourceItem);
    const targetIndex = next.indexOf(targetItem);
    if (sourceIndex === -1 || targetIndex === -1) return arr;
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, sourceItem);
    return next;
  };

  const getSingleVariant = (choiceId: string, isCorrect_: boolean) => {
    if (!submitted) return value === choiceId ? "selected" : "idle";
    const choice = (question as any).choices?.find((c: any) => c.id === choiceId);
    if (choice?.correct === true) return "correct";
    if (value === choiceId) return "wrong";
    return "faded";
  };

  const getMultiVariant = (choiceId: string) => {
    if (!submitted) return Array.isArray(value) && value.includes(choiceId) ? "selected" : "idle";
    const choice = (question as any).choices?.find((c: any) => c.id === choiceId);
    if (choice?.correct === true) return "correct";
    if (Array.isArray(value) && value.includes(choiceId)) return "wrong";
    return "faded";
  };

  return (
    <motion.div
      className="max-w-md w-full rounded-2xl bg-white dark:bg-card shadow-xl p-3 sm:p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {/* Read-only context visual (e.g. cake/pie diagram shown above the question) */}
      {(question as any).context_visual && (
        <div className="mb-3 flex justify-center">
          <ContextVisual visual={(question as any).context_visual} />
        </div>
      )}
      {!(question as any).context_visual && inferredPromptFigure && (
        <div className="mb-3 flex justify-center">
          <PromptFigure spec={inferredPromptFigure} />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-3">{question.prompt}</h3>

      {question.kind === "single" && (
        <div className={question.choices.length === 4 ? "grid grid-cols-2 gap-3 mt-4" : "space-y-2 mt-3"}>
          {question.choices.map((c, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx] ?? String(idx + 1);
            const cs = choiceState(c, value, submittedAnswer, false);
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => { if (submittedAnswer === undefined) setVal(c.id); }}
                animate={cs.shake ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full rounded-2xl transition-all"
                style={{
                  background: cs.bg,
                  border: `1.5px solid ${cs.border}`,
                  opacity: cs.opacity,
                  color: cs.color,
                  padding: question.choices.length === 4 ? '14px 12px' : '12px 14px',
                  cursor: submittedAnswer !== undefined ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                {question.choices.length === 4 ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="self-start text-xs font-semibold" style={{ opacity: 0.55 }}>{letter}</span>
                    {renderChoiceLabel(c.label)}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: value === c.id ? '#12C6A0' : '#F3F6FA', color: value === c.id ? '#0F172A' : '#667085' }}
                    >
                      {letter}
                    </span>
                    {renderChoiceLabel(c.label)}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {question.kind === "multi" && (
        <div className={question.choices.length === 4 ? "grid grid-cols-2 gap-3 mt-4" : "space-y-2 mt-3"}>
          {question.choices.map((c, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx] ?? String(idx + 1);
            const checked = Array.isArray(value) && value.includes(c.id);
            const cs = choiceState(c, value, submittedAnswer, true);
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => {
                  if (submittedAnswer !== undefined) return;
                  const next = checked
                    ? (Array.isArray(value) ? value.filter((x: string) => x !== c.id) : [])
                    : [...(Array.isArray(value) ? value : []), c.id];
                  setVal(next);
                }}
                animate={cs.shake ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full rounded-2xl transition-all"
                style={{
                  background: cs.bg,
                  border: `1.5px solid ${cs.border}`,
                  opacity: cs.opacity,
                  color: cs.color,
                  padding: question.choices.length === 4 ? '14px 12px' : '12px 14px',
                  cursor: submittedAnswer !== undefined ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                {question.choices.length === 4 ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="self-start text-xs font-semibold" style={{ opacity: 0.55 }}>{letter}</span>
                    {renderChoiceLabel(c.label)}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: checked ? '#12C6A0' : '#F3F6FA', color: checked ? '#0F172A' : '#667085' }}
                    >
                      {letter}
                    </span>
                    {renderChoiceLabel(c.label)}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {question.kind === "numeric" && (question as any).answerFormat === "fraction" && (() => {
        const dragOpts: number[] = (question as any).dragOptions ?? [];
        const chips = dragOpts.length > 0 ? dragOpts : [];
        const numVal = value?.numerator ?? "";
        const denVal = value?.denominator ?? "";

        const handleDrop = (zone: "numerator" | "denominator") => (e: React.DragEvent) => {
          e.preventDefault();
          const num = e.dataTransfer.getData("text/plain");
          setVal({ ...value, [zone]: num });
        };

        const handleTapChip = (num: number) => {
          if (selectedChip === num) {
            setSelectedChip(null);
            return;
          }
          setSelectedChip(num);
        };

        const handleTapZone = (zone: "numerator" | "denominator") => {
          if (selectedChip !== null) {
            setVal({ ...value, [zone]: String(selectedChip) });
            setSelectedChip(null);
          }
        };

        if (chips.length === 0) {
          return (
            <div className="flex flex-col items-center gap-0">
              <input
                className="w-20 border rounded-lg px-3 py-2 text-center text-lg"
                inputMode="numeric"
                type="number"
                placeholder="?"
                value={numVal}
                onChange={e => setVal({ ...value, numerator: e.target.value })}
                aria-label="Numérateur"
              />
              <div className="w-20 h-[2px] bg-foreground my-1" />
              <input
                className="w-20 border rounded-lg px-3 py-2 text-center text-lg"
                inputMode="numeric"
                type="number"
                placeholder="?"
                value={denVal}
                onChange={e => setVal({ ...value, denominator: e.target.value })}
                aria-label="Dénominateur"
              />
            </div>
          );
        }

        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-0">
              <div
                className={cn(
                  "w-20 h-14 border-2 border-dashed rounded-lg flex items-center justify-center text-2xl font-bold cursor-pointer transition-colors",
                  numVal ? "border-primary bg-primary/10" : "border-muted-foreground/40 bg-muted/30"
                )}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop("numerator")}
                onClick={() => handleTapZone("numerator")}
                aria-label="Numérateur"
              >
                {numVal || "?"}
              </div>
              <div className="w-20 h-[3px] bg-foreground my-1 rounded-full" />
              <div
                className={cn(
                  "w-20 h-14 border-2 border-dashed rounded-lg flex items-center justify-center text-2xl font-bold cursor-pointer transition-colors",
                  denVal ? "border-primary bg-primary/10" : "border-muted-foreground/40 bg-muted/30"
                )}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop("denominator")}
                onClick={() => handleTapZone("denominator")}
                aria-label="Dénominateur"
              >
                {denVal || "?"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {chips.map((num, i) => {
                const isUsed = String(num) === String(numVal) || String(num) === String(denVal);
                const isSelected = selectedChip === num;
                return (
                  <motion.div
                    key={`${num}-${i}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                    whileTap={{ scale: 0.9 }}
                    draggable
                    onDragStart={e => (e as unknown as DragEvent & { dataTransfer: DataTransfer }).dataTransfer.setData("text/plain", String(num))}
                    onClick={() => handleTapChip(num)}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold cursor-grab active:cursor-grabbing select-none transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                        : isUsed
                          ? "bg-muted text-muted-foreground opacity-40"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm"
                    )}
                  >
                    {num}
                  </motion.div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Glisse un nombre dans chaque case, ou tapote pour sélectionner.
            </p>
          </div>
        );
      })()}

      {question.kind === "numeric" && (question as any).answerFormat !== "fraction" && (
        <div className="mt-2 flex flex-col items-center gap-3 py-2">
          <p className="text-xs font-medium" style={{ color: '#667085', fontFamily: 'Poppins, sans-serif' }}>
            Tape ta réponse
          </p>
          <div
            className="flex items-center justify-center rounded-2xl transition-all"
            style={{
              width: '160px',
              height: '96px',
              background: value !== '' ? '#F2FBF8' : 'white',
              border: `2.5px solid ${value !== '' ? '#12C6A0' : '#EAECEF'}`,
            }}
          >
            <input
              type="number"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={value}
              onChange={e => setVal(e.target.value)}
              placeholder="?"
              style={{
                width: '100%',
                height: '100%',
                textAlign: 'center',
                fontSize: '44px',
                fontWeight: '800',
                color: '#0F172A',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'Poppins, sans-serif',
                WebkitAppearance: 'none',
                MozAppearance: 'textfield' as any,
              }}
            />
          </div>
          {(question as any).range && (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Entre {(question as any).range.min} et {(question as any).range.max}
            </p>
          )}
        </div>
      )}

      {question.kind === "ordering" && (
        <ul className="space-y-2">
          {(value.length ? value : (question as any).items).map(
            (it: string, i: number, arr: string[]) => (
              <motion.li
                key={it}
                layout
                layoutId={it}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", it);
                  setDraggedOrderingItem(it);
                }}
                onDragEnd={() => setDraggedOrderingItem(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedItem = event.dataTransfer.getData("text/plain") || draggedOrderingItem;
                  if (!draggedItem) return;
                  setVal(moveOrderingItem(arr, draggedItem, it));
                  setDraggedOrderingItem(null);
                }}
                className={cn(
                  "px-3 py-2 rounded-2xl border border-neutral-300 flex justify-between items-center gap-3 bg-white transition-colors",
                  draggedOrderingItem === it ? "opacity-60" : "",
                  draggedOrderingItem && draggedOrderingItem !== it ? "hover:border-primary/40" : ""
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing" />
                  <span>{it}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => i > 0 && setVal(swap(arr, i, i - 1))}>↑</button>
                  <button onClick={() => i < arr.length - 1 && setVal(swap(arr, i, i + 1))}>↓</button>
                </div>
              </motion.li>
            )
          )}
        </ul>
      )}

      {question.kind === "visual" && (
        <div className="mt-4">{renderVisualQuestion(question.visual, value, setVal)}</div>
      )}

      {question.kind === "slider" && (
        <div className="mt-4">
          <SliderQuestionView
            question={question}
            value={value}
            onChange={setVal}
          />
        </div>
      )}

      {question.kind === "match" && (
        <div className="mt-4">
          <MatchQuestionView
            question={question}
            value={value}
            onChange={setVal}
          />
        </div>
      )}

      {question.kind === "fill-expr" && (
        <div className="mt-4">
          <FillExprQuestionView
            question={question}
            value={value}
            onChange={setVal}
          />
        </div>
      )}

      {question.kind === "operation-posee" && (
        <div className="mt-4">
          <ManipulativeMathRenderer
            mode="quiz"
            exercise={{
              id: question.id,
              type: "operation-posee",
              operation: question.operation,
              topNumber: question.topNumber,
              bottomNumber: question.bottomNumber,
              prompt: question.prompt,
              locale: question.locale,
            }}
            onComplete={(result) => {
              setVal(result);
            }}
          />
        </div>
      )}

      {onFinish && (
        <div className="flex gap-2 justify-end mt-4">
          {onSkip && (
            <button
              className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800"
              onClick={onSkip}
            >
              Passer
            </button>
          )}
          <motion.button
            className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black"
            onClick={submitIfTimeline}
            whileTap={{ scale: 0.96 }}
          >
            Valider
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

function getInitialVisualValue(visual: VisualUnion) {
  switch (visual.subtype) {
    case "pie":
    case "shape_select":
    case "line_relation":
      return [];
    case "grid":
      return [];
    case "angle":
      return visual.multi ? [] : "";
    default:
      return "";
  }
}

function renderVisualQuestion(
  visual: VisualUnion,
  value: any,
  setValue: (next: any) => void
) {
  switch (visual.subtype) {
    case "pie":
      return (
        <PieStudentView
          visual={visual as any}
          value={value}
          onChange={setValue}
        />
      );
    case "angle":
      return (
        <AngleStudentView
          visual={visual}
          value={value}
          onChange={setValue}
        />
      );
    default:
      return (
        <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500">
          Ce type de question visuelle n'est pas encore disponible pour les élèves.
        </div>
      );
  }
}

type AngleOption = {
  id: string;
  label: string;
  aDeg: number;
  bDeg: number;
  targetDeg: number;
  toleranceDeg: number;
  radius: number;
};

const ANGLE_SINGLE_RADIUS = 36;
const ANGLE_MULTI_RADIUS = 32;

function AngleStudentView({
  visual,
  value,
  onChange,
}: {
  visual: VisualAngle;
  value: any;
  onChange: (next: any) => void;
}) {
  const isMulti = !!visual.multi;

  if (!isMulti) {
    const radius = ANGLE_SINGLE_RADIUS;
    const rayA = polarToCartesian(visual.aDeg, radius);
    const rayB = polarToCartesian(visual.bDeg, radius);
    const arcPath = describeArc(0, 0, radius * 0.7, visual.aDeg, visual.bDeg);
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <svg viewBox="-50 -50 100 100" width={260} height={260} className="bg-white rounded-xl shadow-inner">
            <circle cx={0} cy={0} r={radius} fill="#ffffff" stroke="#e5e7eb" />
            <path d={arcPath} fill="#cbd5e1" fillOpacity={0.65} />
            <line x1={0} y1={0} x2={rayA.x} y2={rayA.y} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={0} y1={0} x2={rayB.x} y2={rayB.y} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        </div>
        <div className="space-y-2 text-sm text-neutral-600">
          <p>Saisis l'angle mesuré entre les deux rayons.</p>
          <input
            type="number"
            className="w-full rounded-xl border px-3 py-2"
            inputMode="numeric"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Angle mesuré en degrés"
          />
        </div>
      </div>
    );
  }

  const options: AngleOption[] = buildAngleOptions(visual);
  const selected: string[] = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Sélectionne toutes les cartes qui correspondent à la consigne.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, index) => {
          const isActive = selected.includes(option.id);
          const rayA = polarToCartesian(option.aDeg, option.radius);
          const rayB = polarToCartesian(option.bDeg, option.radius);
          const arcPath = describeArc(0, 0, option.radius * 0.7, option.aDeg, option.bDeg);
          const measurement = Math.round(angleBetween(option.aDeg, option.bDeg));
          return (
            <motion.button
              key={option.id}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08, type: "spring", stiffness: 250 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const next = isActive
                  ? selected.filter((id) => id !== option.id)
                  : [...selected, option.id];
                onChange(next);
              }}
              className={cn(
                "group relative rounded-xl border px-2 py-2 text-left transition",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                <span>{option.label}</span>
                <span>{measurement}°</span>
              </div>
              <svg
                viewBox="-50 -50 100 100"
                width={120}
                height={120}
                className="mx-auto bg-white rounded-lg shadow-inner"
              >
                <circle cx={0} cy={0} r={option.radius} fill="#fff" stroke={isActive ? "#2563eb" : "#d1d5db"} strokeWidth={isActive ? 2 : 1.2} />
                <path d={arcPath} fill="#bfdbfe" fillOpacity={isActive ? 0.65 : 0.4} />
                <line x1={0} y1={0} x2={rayA.x} y2={rayA.y} stroke="#1f2937" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={0} y1={0} x2={rayB.x} y2={rayB.y} stroke="#1f2937" strokeWidth={2.2} strokeLinecap="round" />
              </svg>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function buildAngleOptions(visual: VisualAngle): AngleOption[] {
  const radius = visual.multi ? ANGLE_MULTI_RADIUS : ANGLE_SINGLE_RADIUS;
  const baseOption: AngleOption = {
    id: "base",
    label: "Angle 1",
    aDeg: visual.aDeg,
    bDeg: visual.bDeg,
    targetDeg: visual.targetDeg,
    toleranceDeg: visual.toleranceDeg,
    radius,
  };
  if (!visual.multi || !visual.variants) {
    return [baseOption];
  }
  return [
    baseOption,
    ...visual.variants.map((variant, index) => ({
      id: variant.id,
      label: `Angle ${index + 2}`,
      aDeg: variant.aDeg,
      bDeg: variant.bDeg,
      targetDeg: variant.targetDeg,
      toleranceDeg: variant.toleranceDeg,
      radius,
    })),
  ];
}

function polarToCartesian(deg: number, radius: number) {
  const radians = (deg * Math.PI) / 180;
  const x = radius * Math.cos(radians);
  const y = -radius * Math.sin(radians);
  return { x, y };
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const startAngle = normalizeAngle(start);
  const endAngle = normalizeAngle(end);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy - r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy - r * Math.sin(endRad);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} ${startAngle <= endAngle ? 0 : 1} ${x2} ${y2} Z`;
}

function angleBetween(aDeg: number, bDeg: number) {
  const diff = Math.abs(normalizeAngle(aDeg) - normalizeAngle(bDeg));
  return Math.min(diff, Math.abs(diff - 360));
}

function PieStudentView({
  visual,
  value,
  onChange,
}: {
  visual: VisualPie;
  value: any;
  onChange: (next: any) => void;
}) {
  const selected: string[] = Array.isArray(value) ? value : [];

  if (visual.interactionMode === "color_slices") {
    const sliceCount = visual.segments.length;
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Clique sur les parts pour les colorier.
        </p>
        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 100 100" width={200} height={200} className="bg-white rounded-xl shadow-inner">
            {visual.segments.map((seg, i) => {
              const angle = (Math.PI * 2) / sliceCount;
              const startAngle = i * angle;
              const endAngle = startAngle + angle;
              const x1 = 50 + 45 * Math.cos(startAngle);
              const y1 = 50 + 45 * Math.sin(startAngle);
              const x2 = 50 + 45 * Math.cos(endAngle);
              const y2 = 50 + 45 * Math.sin(endAngle);
              const largeArc = angle > Math.PI ? 1 : 0;
              const d = `M50,50 L${x1},${y1} A45,45 0 ${largeArc} 1 ${x2},${y2} Z`;
              const isColored = selected.includes(seg.id);
              return (
                <motion.path
                  key={seg.id}
                  d={d}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring" }}
                  style={{ transformOrigin: "50px 50px" }}
                  fill={isColored ? "#3b82f6" : "#e5e7eb"}
                  stroke="#fff"
                  strokeWidth={1.5}
                  className="cursor-pointer transition-colors"
                  onClick={() => {
                    const next = isColored
                      ? selected.filter((id) => id !== seg.id)
                      : [...selected, seg.id];
                    onChange(next);
                  }}
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  const rawPies = [
    { ids: ["base"], segments: visual.segments },
    ...(visual.variants ?? []).map((v) => ({
      ids: [v.id],
      segments: v.segments
    })),
  ];

  const allPies = rawPies.reduce<typeof rawPies>((acc, pie) => {
    const signature = getPieSegmentsSignature(pie.segments);
    const existing = acc.find((entry) => getPieSegmentsSignature(entry.segments) === signature);
    if (existing) {
      existing.ids.push(...pie.ids);
      return acc;
    }
    acc.push({ ...pie });
    return acc;
  }, []);

  const calculateFraction = (segments: typeof visual.segments) => {
    const totalSlices = segments.length;
    const coloredSlices = segments.filter(s => s.colored).length;
    return `${coloredSlices}/${totalSlices}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Sélectionne le(s) diagramme(s) qui représente(nt) la fraction correcte.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {allPies.map((pie) => {
          const isActive = pie.ids.some((id) => selected.includes(id));
          const total = pie.segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0) || 1;
          let start = 0;

          return (
            <button
              key={pie.ids.join("|")}
              type="button"
              onClick={() => {
                const next = isActive
                  ? selected.filter((id) => !pie.ids.includes(id))
                  : [...new Set([...selected, ...pie.ids])];
                onChange(next);
              }}
              className={cn(
                "group relative rounded-xl border p-2 text-left transition",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              )}
              aria-pressed={isActive}
            >
              <svg
                viewBox="0 0 100 100"
                width={120}
                height={120}
                className="mx-auto bg-white rounded-lg shadow-inner"
              >
                {pie.segments.map((seg, i) => {
                  const angle = ((Number(seg.value) || 0) / total) * Math.PI * 2;
                  const end = start + angle;
                  const x1 = 50 + 45 * Math.cos(start);
                  const y1 = 50 + 45 * Math.sin(start);
                  const x2 = 50 + 45 * Math.cos(end);
                  const y2 = 50 + 45 * Math.sin(end);
                  const largeArc = angle > Math.PI ? 1 : 0;
                  const d = `M50,50 L${x1},${y1} A45,45 0 ${largeArc} 1 ${x2},${y2} Z`;
                  start = end;
                  return (
                    <motion.path
                      key={seg.id}
                      d={d}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, type: "spring" }}
                      style={{ transformOrigin: "50px 50px" }}
                      fill={seg.colored ? "#3b82f6" : "#e5e7eb"}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  );
                })}
              </svg>
              {isActive && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
