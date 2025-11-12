import React, { useMemo, useState } from "react";
import type { Question } from "@/types/quiz-bank";
import { evaluateQuestion } from "@/utils/quizEvaluation";
import { cn } from "@/lib/utils";
import type { VisualAngle, VisualUnion, VisualPie } from "@/lib/quiz/visual-types";
import { normalizeAngle } from "@/lib/quiz/visual-geometry";
import { Button } from "@/components/ui/button";

interface QuestionCardProps {
  question: Question;
  onChange?: (value: any) => void;
  onFinish?: (correct: boolean, tries: number) => void;
  onSkip?: () => void;
  allowRetry?: boolean;
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
    return "";
  }, [question]);

  const [value, setValue] = useState<any>(initialValue);
  const [tries, setTries] = useState(0);

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
    onFinish(ok, tries);
  };

  const swap = (arr: string[], i: number, j: number) => {
    const x = [...arr];
    [x[i], x[j]] = [x[j], x[i]];
    return x;
  };

  return (
    <div className="max-w-md w-full rounded-2xl bg-white dark:bg-card shadow-xl p-4">
      <h3 className="text-lg font-semibold mb-3">{question.prompt}</h3>
      
      {question.kind === "single" && (
        <div className="space-y-2">
          {question.choices.map(c => (
            <button
              key={c.id}
              onClick={() => setVal(c.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl border transition-all",
                value === c.id
                  ? "border-primary bg-primary/10"
                  : "border-neutral-300 hover:border-primary/50"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {question.kind === "multi" && (
        <div className="space-y-2">
          {question.choices.map(c => {
            const checked = Array.isArray(value) && value.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => {
                  const next = checked
                    ? value.filter((x: string) => x !== c.id)
                    : [...value, c.id];
                  setVal(next);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl border transition-all",
                  checked
                    ? "border-primary bg-primary/10"
                    : "border-neutral-300 hover:border-primary/50"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "numeric" && (
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
              <li
                key={it}
                className="px-3 py-2 rounded-2xl border border-neutral-300 flex justify-between items-center"
              >
                <span>{it}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => i > 0 && setVal(swap(arr, i, i - 1))}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() =>
                      i < arr.length - 1 && setVal(swap(arr, i, i + 1))
                    }
                  >
                    ↓
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {question.kind === "visual" && (
        <div className="mt-4">{renderVisualQuestion(question.visual, value, setVal)}</div>
      )}

      {question.hint && tries > 0 && (
        <p className="text-sm mt-3 opacity-80">Indice: {question.hint}</p>
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
          <button
            className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black"
            onClick={submitIfTimeline}
          >
            Valider
          </button>
        </div>
      )}
    </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((option) => {
          const isActive = selected.includes(option.id);
          const rayA = polarToCartesian(option.aDeg, option.radius);
          const rayB = polarToCartesian(option.bDeg, option.radius);
          const arcPath = describeArc(0, 0, option.radius * 0.7, option.aDeg, option.bDeg);
          const measurement = Math.round(angleBetween(option.aDeg, option.bDeg));
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                const next = isActive
                  ? selected.filter((id) => id !== option.id)
                  : [...selected, option.id];
                onChange(next);
              }}
              className={cn(
                "group relative rounded-xl border px-3 py-2 text-left transition",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                <span>{option.label}</span>
                <span>{measurement}°</span>
              </div>
              <svg
                viewBox="-50 -50 100 100"
                width={160}
                height={160}
                className="mx-auto bg-white rounded-lg shadow-inner"
              >
                <circle cx={0} cy={0} r={option.radius} fill="#fff" stroke={isActive ? "#2563eb" : "#d1d5db"} strokeWidth={isActive ? 2 : 1.2} />
                <path d={arcPath} fill="#bfdbfe" fillOpacity={isActive ? 0.65 : 0.4} />
                <line x1={0} y1={0} x2={rayA.x} y2={rayA.y} stroke="#1f2937" strokeWidth={2.2} strokeLinecap="round" />
                <line x1={0} y1={0} x2={rayB.x} y2={rayB.y} stroke="#1f2937" strokeWidth={2.2} strokeLinecap="round" />
              </svg>
            </button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                "group relative rounded-xl border p-3 text-left transition",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              )}
              aria-pressed={isActive}
            >
              <svg
                viewBox="0 0 100 100"
                width={160}
                height={160}
                className="mx-auto bg-white rounded-lg shadow-inner"
              >
                {pie.segments.map((seg) => {
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
                    <path
                      key={seg.id}
                      d={d}
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

