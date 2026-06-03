import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "@/types/quiz-bank";
import { evaluateQuestion } from "@/utils/quizEvaluation";
import { cn } from "@/lib/utils";
import type { VisualAngle, VisualUnion, VisualPie } from "@/lib/quiz/visual-types";
import { normalizeAngle } from "@/lib/quiz/visual-geometry";
import { Button } from "@/components/ui/button";
import { ManipulativeMathRenderer } from "@/components/manipulative-maths/ManipulativeMathRenderer";
import { SliderQuestionView } from "./SliderQuestion";
import { MatchQuestionView } from "./MatchQuestion";
import { FillExprQuestionView } from "./FillExprQuestion";

interface QuestionCardProps {
  question: Question;
  onChange?: (value: any) => void;
  onFinish?: (correct: boolean, tries: number) => void;
  onSkip?: () => void;
  allowRetry?: boolean;
}

const choiceVariants = {
  idle:     { x: 0, backgroundColor: "transparent", borderColor: "hsl(var(--border))", scale: 1 },
  selected: { backgroundColor: "hsl(var(--primary) / 0.1)", borderColor: "hsl(var(--primary))", scale: 1 },
  correct:  { backgroundColor: "#dcfce7", borderColor: "#16a34a", scale: [1, 1.05, 1], transition: { duration: 0.35 } },
  wrong:    { x: [0, -10, 10, -7, 7, -4, 4, 0], backgroundColor: "#fee2e2", borderColor: "#ef4444", transition: { duration: 0.45 } },
  faded:    { opacity: 0.4, scale: 1 },
};

// ── Read-only context visual shown above a question ──────────────────────────
function ContextVisual({ visual, showLabel = true }: { visual: any; showLabel?: boolean }) {
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
        {showLabel && (
          <p className="text-xs text-muted-foreground">
            {colored}/{total} parts
          </p>
        )}
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

  return null;
}

export function QuestionCard({
  question,
  onChange,
  onFinish,
  onSkip,
  allowRetry = false
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
  const [tries, setTries] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

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
          <ContextVisual visual={(question as any).context_visual} showLabel={false} />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-3">{question.prompt}</h3>

      {question.kind === "single" && (
        <div className="space-y-2">
          {question.choices.map((c, i) => (
            <motion.button
              key={c.id}
              onClick={() => setVal(c.id)}
              className="w-full text-left px-3 py-2 rounded-xl border"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 220, damping: 20 }}
              whileTap={{ scale: 0.97 }}
              style={{
                backgroundColor: value === c.id ? "hsl(var(--primary) / 0.1)" : "transparent",
                borderColor: value === c.id ? "hsl(var(--primary))" : "rgb(212 212 212)",
              }}
            >
              {c.label}
            </motion.button>
          ))}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                  isCorrect
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                )}
              >
                <span className="text-base">{isCorrect ? "✓" : "✗"}</span>
                {isCorrect ? "Bonne réponse !" : (question.hint && tries > 0 ? `Indice : ${question.hint}` : "Pas tout à fait…")}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {question.kind === "multi" && (
        <div className="space-y-2">
          {question.choices.map((c, i) => {
            const checked = Array.isArray(value) && value.includes(c.id);
            return (
              <motion.button
                key={c.id}
                onClick={() => {
                  const next = checked
                    ? value.filter((x: string) => x !== c.id)
                    : [...value, c.id];
                  setVal(next);
                }}
                className="w-full text-left px-3 py-2 rounded-xl border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, type: "spring", stiffness: 220, damping: 20 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  backgroundColor: checked ? "hsl(var(--primary) / 0.1)" : "transparent",
                  borderColor: checked ? "hsl(var(--primary))" : "rgb(212 212 212)",
                }}
              >
                {c.label}
              </motion.button>
            );
          })}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
                  isCorrect
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                )}
              >
                <span className="text-base">{isCorrect ? "✓" : "✗"}</span>
                {isCorrect ? "Bonne réponse !" : (question.hint && tries > 0 ? `Indice : ${question.hint}` : "Pas tout à fait…")}
              </motion.div>
            )}
          </AnimatePresence>
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
        <input
          className="w-full border rounded-2xl px-3 py-2"
          inputMode="numeric"
          type="number"
          value={value}
          onChange={e => setVal(e.target.value)}
        />
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
                className="px-3 py-2 rounded-2xl border border-neutral-300 flex justify-between items-center"
              >
                <span>{it}</span>
                <div className="flex gap-1">
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
          <div className="text-sm text-neutral-500">
            {selected.length}/{sliceCount} parts coloriées
          </div>
        </div>
      </div>
    );
  }

  const allPies = [
    { id: "base", label: "Pie 1", segments: visual.segments },
    ...(visual.variants ?? []).map((v, index) => ({
      id: v.id,
      label: `Pie ${index + 2}`,
      segments: v.segments
    })),
  ];

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
          const isActive = selected.includes(pie.id);
          const total = pie.segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0) || 1;
          let start = 0;

          return (
            <button
              key={pie.id}
              type="button"
              onClick={() => {
                const next = isActive
                  ? selected.filter((id) => id !== pie.id)
                  : [...selected, pie.id];
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
              <div className="mt-2 text-center">
                <div className="text-xs text-neutral-500">{pie.label}</div>
                {visual.showFractionLabel === true && (
                  <div className="text-sm font-medium">{calculateFraction(pie.segments)}</div>
                )}
              </div>
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
