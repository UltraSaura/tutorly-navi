import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import katex from "katex";
import type { Question } from "@/types/quiz-bank";
import { evaluateQuestion } from "@/utils/quizEvaluation";
import { cn } from "@/lib/utils";
import type { GeometryFigureShape, VisualAngle, VisualBar, VisualUnion, VisualPie, VisualTriangle } from "@/lib/quiz/visual-types";
import { normalizeAngle } from "@/lib/quiz/visual-geometry";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManipulativeMathRenderer } from "@/components/manipulative-maths/ManipulativeMathRenderer";
import { MathRenderer } from "@/components/math/MathRenderer";
import { SliderQuestionView } from "./SliderQuestion";
import { MatchQuestionView } from "./MatchQuestion";
import { FillExprQuestionView } from "./FillExprQuestion";
import { ColumnFillQuestionView } from "./ColumnFillQuestion";
import { useLearningDragDrop } from "./useLearningDragDrop";
import { inferPromptFigure, type PromptFigureSpec } from "@/lib/quiz/promptVisual";

// Renders text that may contain $...$ inline or $$...$$ display LaTeX.
function MathText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const parts: { math: boolean; display: boolean; content: string }[] = [];
  const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ math: false, display: false, content: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ math: true, display: true,  content: m[1] });
    else                    parts.push({ math: true, display: false, content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, display: false, content: text.slice(last) });

  return (
    <span style={style}>
      {parts.map((p, i) => {
        if (!p.math) return <span key={i}>{p.content}</span>;
        try {
          const html = katex.renderToString(p.content, { throwOnError: false, displayMode: p.display });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{p.content}</span>;
        }
      })}
    </span>
  );
}

interface QuestionCardProps {
  question: Question;
  onChange?: (value: any) => void;
  onFinish?: (correct: boolean, tries: number) => void;
  onSkip?: () => void;
  allowRetry?: boolean;
  submittedAnswer?: any;
  isCorrect?: boolean;
  /** When true, correct choices are NOT highlighted green after a wrong attempt (lesson mode). */
  hideCorrect?: boolean;
}

// ── Deterministic numeric suggestion chips (correct answer + distractors) ──
function buildNumericChips(q: any): number[] {
  if (Array.isArray(q?.dragOptions) && q.dragOptions.length > 0) {
    return seededShuffle(
      Array.from(new Set(q.dragOptions.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)))),
      String(q.id ?? 'n')
    );
  }
  const answer = Number(q?.answer);
  if (!Number.isFinite(answer)) return [];
  const min = q?.range?.min;
  const max = q?.range?.max;
  const isInt = Number.isInteger(answer);
  const pool = new Set<number>([answer]);
  const candidates: number[] = [];
  if (isInt) {
    for (let d = 1; d <= 6; d++) candidates.push(answer + d, answer - d);
  } else {
    for (let d = 1; d <= 6; d++) {
      candidates.push(+(answer + d * 0.1).toFixed(2), +(answer - d * 0.1).toFixed(2));
    }
  }
  for (const c of candidates) {
    if (pool.size >= 4) break;
    if (typeof min === 'number' && c < min) continue;
    if (typeof max === 'number' && c > max) continue;
    if (c < 0 && answer >= 0) continue;
    pool.add(c);
  }
  if (pool.size < 4 && typeof min === 'number' && typeof max === 'number') {
    for (let v = min; v <= max && pool.size < 4; v++) pool.add(v);
  }
  return seededShuffle(Array.from(pool), String(q.id ?? 'n'));
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

  if (visual.subtype === "triangle") {
    return <TriangleDiagram visual={visual as VisualTriangle} />;
  }

  if (visual.subtype === "geometry_figure") {
    return <GeometryFigureDiagram shape={visual.shape} label={visual.label} />;
  }

  return null;
}

function regularPolygonPoints(cx: number, cy: number, r: number, sides: number, rotation = -Math.PI / 2) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function GeometryFigureDiagram({ shape, label }: { shape: GeometryFigureShape; label?: string }) {
  const ui = useInterfaceTranslation();
  const stroke = "#0f172a";
  const fill = "#ffffff";
  const accent = "#12C6A0";
  const muted = "#94a3b8";

  const shapeNode = (() => {
    switch (shape) {
      case "rectangle":
        return <rect x={32} y={44} width={116} height={58} rx={3} fill={fill} stroke={stroke} strokeWidth={3} />;
      case "square":
        return <rect x={52} y={32} width={78} height={78} rx={3} fill={fill} stroke={stroke} strokeWidth={3} />;
      case "circle":
        return <circle cx={90} cy={72} r={42} fill={fill} stroke={stroke} strokeWidth={3} />;
      case "rhombus":
        return <polygon points="90,26 144,72 90,118 36,72" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
      case "parallelogram":
        return <polygon points="50,38 150,38 126,108 26,108" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
      case "trapezoid":
        return <polygon points="64,38 126,38 150,108 38,108" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
      case "pentagon":
        return <polygon points={regularPolygonPoints(90, 74, 48, 5)} fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
      case "hexagon":
        return <polygon points={regularPolygonPoints(90, 74, 48, 6, Math.PI / 6)} fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
      case "polygon":
        return <polygon points="48,42 104,28 146,62 132,112 72,118 34,82" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
      case "cube":
        return (
          <>
            <rect x={46} y={58} width={62} height={62} fill={fill} stroke={stroke} strokeWidth={3} />
            <polygon points="46,58 70,34 132,34 108,58" fill="#f8fafc" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
            <polygon points="108,58 132,34 132,96 108,120" fill="#e2e8f0" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
          </>
        );
      case "cuboid":
        return (
          <>
            <rect x={34} y={58} width={84} height={50} fill={fill} stroke={stroke} strokeWidth={3} />
            <polygon points="34,58 62,36 146,36 118,58" fill="#f8fafc" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
            <polygon points="118,58 146,36 146,86 118,108" fill="#e2e8f0" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
          </>
        );
      case "cylinder":
        return (
          <>
            <path d="M48 44 C48 30 132 30 132 44" fill="#f8fafc" stroke={stroke} strokeWidth={3} />
            <path d="M48 44 V100 C48 116 132 116 132 100 V44" fill={fill} stroke={stroke} strokeWidth={3} />
            <ellipse cx={90} cy={100} rx={42} ry={14} fill="#e2e8f0" stroke={stroke} strokeWidth={3} />
            <ellipse cx={90} cy={44} rx={42} ry={14} fill="#f8fafc" stroke={stroke} strokeWidth={3} />
          </>
        );
      case "cone":
        return (
          <>
            <path d="M90 26 L42 104 C42 120 138 120 138 104 Z" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
            <ellipse cx={90} cy={104} rx={48} ry={15} fill="#e2e8f0" stroke={stroke} strokeWidth={3} />
          </>
        );
      case "sphere":
        return (
          <>
            <circle cx={90} cy={74} r={46} fill={fill} stroke={stroke} strokeWidth={3} />
            <ellipse cx={90} cy={74} rx={44} ry={14} fill="none" stroke={muted} strokeWidth={2} />
            <ellipse cx={90} cy={74} rx={16} ry={44} fill="none" stroke={muted} strokeWidth={2} />
          </>
        );
      case "triangle":
      default:
        return <polygon points="36,112 144,112 118,34" fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
    }
  })();

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <svg width={220} height={170} viewBox="0 0 180 140" role="img" aria-label={label ?? ui("Figure géométrique")}>
        <rect x={10} y={12} width={160} height={116} rx={14} fill="#f8fafc" stroke="#e2e8f0" />
        {shapeNode}
        <circle cx={150} cy={32} r={4} fill={accent} opacity={0.85} />
      </svg>
      {label && <span className="text-xs font-semibold text-slate-600">{label}</span>}
    </div>
  );
}

const TRIANGLE_POINTS = {
  A: { x: 24, y: 116 },
  B: { x: 132, y: 116 },
  C: { x: 132, y: 54 },
};

function canonicalSide(a: string, b: string): string {
  return [a.toUpperCase(), b.toUpperCase()].sort().join("");
}

function getTrianglePoint(label: string, fallbackIndex: number) {
  const fallback = [TRIANGLE_POINTS.A, TRIANGLE_POINTS.B, TRIANGLE_POINTS.C][fallbackIndex] ?? TRIANGLE_POINTS.A;
  return TRIANGLE_POINTS[label.toUpperCase() as keyof typeof TRIANGLE_POINTS] ?? fallback;
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function TriangleDiagram({ visual }: { visual: VisualTriangle }) {
  const ui = useInterfaceTranslation();
  const labels = visual.labels ?? ["A", "B", "C"];
  const points = labels.map((label, index) => getTrianglePoint(label, index));
  const [p0, p1, p2] = points;
  const pointByLabel = new Map(labels.map((label, index) => [label.toUpperCase(), points[index]]));
  const sideLabels = visual.sideLabels ?? {};
  const sidePairs: Array<[string, string]> = [
    [labels[0], labels[1]],
    [labels[1], labels[2]],
    [labels[0], labels[2]],
  ];
  const rightPoint = visual.rightAngleAt ? pointByLabel.get(visual.rightAngleAt.toUpperCase()) : undefined;
  const anglePoint = visual.angleLabel?.vertex ? pointByLabel.get(visual.angleLabel.vertex.toUpperCase()) : undefined;

  return (
    <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <svg width={220} height={170} viewBox="0 0 160 140" role="img" aria-label={ui("Diagramme de triangle")}>
        <polygon
          points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {rightPoint && (
          <path
            d={`M ${rightPoint.x - 14} ${rightPoint.y} L ${rightPoint.x - 14} ${rightPoint.y - 14} L ${rightPoint.x} ${rightPoint.y - 14}`}
            fill="none"
            stroke="#12C6A0"
            strokeWidth={2}
          />
        )}

        {anglePoint && visual.angleLabel && (
          <>
            <path d={`M ${anglePoint.x + 24} ${anglePoint.y} A 24 24 0 0 0 ${anglePoint.x + 20} ${anglePoint.y - 14}`} fill="none" stroke="#2563eb" strokeWidth={2} />
            <text x={anglePoint.x + 24} y={anglePoint.y - 10} fill="#2563eb" fontSize={10} fontWeight={700}>
              {visual.angleLabel.degrees}°
            </text>
          </>
        )}

        {sidePairs.map(([a, b]) => {
          const pa = pointByLabel.get(a.toUpperCase());
          const pb = pointByLabel.get(b.toUpperCase());
          if (!pa || !pb) return null;
          const key = canonicalSide(a, b);
          const label = sideLabels[key] ?? (visual.targetSide === key ? "?" : "");
          if (!label) return null;
          const mid = midpoint(pa, pb);
          const isVertical = Math.abs(pa.x - pb.x) < Math.abs(pa.y - pb.y);
          const isTarget = visual.targetSide === key;
          return (
            <text
              key={key}
              x={mid.x + (isVertical ? 10 : 0)}
              y={mid.y + (isVertical ? 4 : 15)}
              textAnchor="middle"
              fill={isTarget ? "#dc2626" : "#475569"}
              fontSize={11}
              fontWeight={700}
            >
              {label}
            </text>
          );
        })}

        {labels.map((label, index) => {
          const point = points[index];
          const dx = label === labels[0] ? -12 : 8;
          const dy = label === labels[2] ? -8 : 16;
          return (
            <text key={label} x={point.x + dx} y={point.y + dy} fill="#0f172a" fontSize={13} fontWeight={800}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
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

function TrianglePromptFigure({
  labels,
  pointOnAB,
  pointOnAC,
  parallelSegment,
}: {
  labels: [string, string, string];
  pointOnAB?: string;
  pointOnAC?: string;
  parallelSegment?: [string, string];
}) {
  const [aLabel, bLabel, cLabel] = labels;
  const A = { x: 40, y: 124 };
  const B = { x: 140, y: 124 };
  const C = { x: 112, y: 36 };
  const lerp = (p1: { x: number; y: number }, p2: { x: number; y: number }, t: number) => ({
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  });
  const M = lerp(A, B, 0.38);
  const N = lerp(A, C, 0.52);

  return (
    <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <svg width={220} height={170} viewBox="0 0 180 140" role="img" aria-label={`Triangle ${aLabel}${bLabel}${cLabel}`}>
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {(pointOnAB || pointOnAC || parallelSegment) && (
          <line
            x1={M.x}
            y1={M.y}
            x2={N.x}
            y2={N.y}
            stroke="#12C6A0"
            strokeWidth={3}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        )}

        <circle cx={A.x} cy={A.y} r={3.5} fill="#0f172a" />
        <circle cx={B.x} cy={B.y} r={3.5} fill="#0f172a" />
        <circle cx={C.x} cy={C.y} r={3.5} fill="#0f172a" />

        <text x={A.x - 16} y={A.y + 6} fill="#0f172a" fontSize={13} fontWeight={800}>{aLabel}</text>
        <text x={B.x + 8} y={B.y + 6} fill="#0f172a" fontSize={13} fontWeight={800}>{bLabel}</text>
        <text x={C.x + 6} y={C.y - 8} fill="#0f172a" fontSize={13} fontWeight={800}>{cLabel}</text>

        {pointOnAB && (
          <>
            <circle cx={M.x} cy={M.y} r={3} fill="#12C6A0" />
            <text x={M.x - 4} y={M.y - 8} fill="#12C6A0" fontSize={12} fontWeight={800}>{pointOnAB}</text>
          </>
        )}
        {pointOnAC && (
          <>
            <circle cx={N.x} cy={N.y} r={3} fill="#12C6A0" />
            <text x={N.x - 14} y={N.y - 8} fill="#12C6A0" fontSize={12} fontWeight={800}>{pointOnAC}</text>
          </>
        )}
      </svg>
    </div>
  );
}

function PromptFigure({ spec }: { spec: PromptFigureSpec }) {
  if (spec.kind === "triangle") {
    return (
      <TriangleDiagram
        visual={{
          subtype: "triangle",
          labels: spec.labels,
          rightAngleAt: spec.rightAngleAt,
          angleLabel: spec.angleLabel,
          sideLabels: spec.sideLabels,
          targetSide: spec.targetSide,
        }}
      />
    );
  }

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

  return (
    <span style={{ fontSize: '15px', fontWeight: '600', fontFamily: 'Poppins, sans-serif', color: 'inherit' }}>
      <InlineMathText text={label} />
    </span>
  );
}

function InlineMathText({ text }: { text: string }) {
  const segments = splitMathSegments(text);
  const hasMath = segments.some((segment) => segment.type === "math");

  if (!hasMath) {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "math") {
          return (
            <MathRenderer
              key={`math-${index}`}
              latex={segment.value}
              inline
              className="inline-block align-middle"
            />
          );
        }

        return (
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {segment.value}
          </span>
        );
      })}
    </>
  );
}

function splitMathSegments(text: string): Array<{ type: "text" | "math"; value: string }> {
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
  const matches = Array.from(text.matchAll(pattern));

  if (matches.length === 0) {
    return [{ type: "text", value: text }];
  }

  const segments: Array<{ type: "text" | "math"; value: string }> = [];
  let cursor = 0;

  for (const match of matches) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;

    if (start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, start) });
    }

    segments.push({ type: "math", value: raw });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}

function choiceState(
  c: { id: string; correct?: boolean },
  currentValue: any,
  submittedAnswer: any,
  isMulti: boolean,
  hideCorrect = false,
) {
  const isSubmitted = submittedAnswer !== undefined;
  const wasSelected = isMulti
    ? Array.isArray(submittedAnswer) && submittedAnswer.includes(c.id)
    : submittedAnswer === c.id;
  const isSelected = isMulti
    ? Array.isArray(currentValue) && currentValue.includes(c.id)
    : currentValue === c.id;

  if (!isSubmitted) {
    return { border: isSelected ? '#CBD5E1' : '#EAECEF', bg: isSelected ? '#F8FAFC' : 'white', color: '#0F172A', opacity: 1, shake: false, pulse: false };
  }
  if (c.correct && !hideCorrect) {
    return { border: '#9FE1CB', bg: '#EAF3DE', color: '#27500A', opacity: 1, shake: false, pulse: true };
  }
  if (wasSelected) {
    return { border: '#F7C1C1', bg: '#FCEBEB', color: '#C0121A', opacity: 1, shake: true, pulse: false };
  }
  return { border: '#EAECEF', bg: 'white', color: hideCorrect ? '#0F172A' : '#9CA3AF', opacity: hideCorrect ? 1 : 0.45, shake: false, pulse: false };
}

function getChoiceFeedbackMarker(
  c: { id: string; correct?: boolean },
  currentValue: any,
  submittedAnswer: any,
  isMulti: boolean,
  hideCorrect = false,
) {
  if (submittedAnswer === undefined) return null;
  const wasSelected = isMulti
    ? Array.isArray(submittedAnswer) && submittedAnswer.includes(c.id)
    : submittedAnswer === c.id;
  if (c.correct && !hideCorrect) return { symbol: '✓', color: '#16A34A', bg: '#DCFCE7' };
  if (wasSelected) return { symbol: '✕', color: '#C0121A', bg: '#FEE2E2' };
  return null;
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
  isCorrect: isCorrectProp,
  hideCorrect = false,
}: QuestionCardProps) {
  const ui = useInterfaceTranslation();
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
    if (question.kind === "column-fill") return {};
    return "";
  }, [question]);

  const [value, setValue] = useState<any>(initialValue);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [draggedOrderingItem, setDraggedOrderingItem] = useState<string | null>(null);
  const { draggedValue, getDragSourceProps, getDropTargetProps } = useLearningDragDrop();
  const [tries, setTries] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const onChangeRef = useRef(onChange);
  const inferredPromptFigure = useMemo(() => {
    if ((question as any).context_visual) return null;
    return inferPromptFigure(question);
  }, [question]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setVal = (v: any) => {
    setValue(v);
    onChange?.(v);
  };

  useEffect(() => {
    setValue(initialValue);
    setSelectedChip(null);
    setDraggedOrderingItem(null);
    setTries(0);
    setSubmitted(false);
    setIsCorrect(null);

    if (question.kind === "ordering") {
      onChangeRef.current?.(initialValue);
    }
  }, [initialValue, question.kind]);

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

  const externallySubmitted = submittedAnswer !== undefined;
  const effectiveCorrectness = externallySubmitted ? (isCorrectProp ?? null) : isCorrect;
  const showSubmittedState = submitted || externallySubmitted;

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
      <h3 className="text-lg font-semibold mb-3">
        <InlineMathText text={question.prompt} />
      </h3>

      {question.kind === "single" && (
        <div className={question.choices.length === 4 ? "grid grid-cols-2 gap-3 mt-4" : "space-y-2 mt-3"}>
          {question.choices.map((c, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx] ?? String(idx + 1);
            const cs = choiceState(c, value, submittedAnswer, false, hideCorrect);
            const marker = getChoiceFeedbackMarker(c, value, submittedAnswer, false, hideCorrect);
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => { if (submittedAnswer === undefined) setVal(c.id); }}
                animate={
                  cs.shake
                    ? { x: [0, -10, 10, -7, 7, -4, 4, 0], scale: 1 }
                    : cs.pulse
                      ? { x: 0, scale: [1, 1.04, 1] }
                      : { x: 0, scale: 1 }
                }
                transition={{ duration: cs.pulse ? 0.45 : 0.4 }}
                className="w-full rounded-2xl transition-all"
                style={{
                  background: cs.bg,
                  border: `1.5px solid ${cs.border}`,
                  opacity: cs.opacity,
                  color: cs.color,
                  padding: question.choices.length === 4 ? '14px 12px' : '12px 14px',
                  cursor: submittedAnswer !== undefined ? 'default' : 'pointer',
                  textAlign: 'left',
                  boxShadow: cs.pulse ? '0 8px 22px rgba(34, 197, 94, 0.18)' : 'none',
                }}
                whileTap={submittedAnswer === undefined ? { scale: 0.98 } : undefined}
              >
                {question.choices.length === 4 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold" style={{ opacity: 0.55 }}>{letter}</span>
                      {marker ? (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={{ color: marker.color, background: marker.bg }}
                        >
                          {marker.symbol}
                        </span>
                      ) : <span />}
                    </div>
                    {renderChoiceLabel(c.label)}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: value === c.id ? '#F8FAFC' : '#F3F6FA', color: value === c.id ? '#0F172A' : '#667085' }}
                    >
                      {letter}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">{renderChoiceLabel(c.label)}</div>
                      {marker ? (
                        <span
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ color: marker.color, background: marker.bg }}
                        >
                          {marker.symbol}
                        </span>
                      ) : null}
                    </div>
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
            const cs = choiceState(c, value, submittedAnswer, true, hideCorrect);
            const marker = getChoiceFeedbackMarker(c, value, submittedAnswer, true, hideCorrect);
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
                animate={
                  cs.shake
                    ? { x: [0, -10, 10, -7, 7, -4, 4, 0], scale: 1 }
                    : cs.pulse
                      ? { x: 0, scale: [1, 1.04, 1] }
                      : { x: 0, scale: 1 }
                }
                transition={{ duration: cs.pulse ? 0.45 : 0.4 }}
                className="w-full rounded-2xl transition-all"
                style={{
                  background: cs.bg,
                  border: `1.5px solid ${cs.border}`,
                  opacity: cs.opacity,
                  color: cs.color,
                  padding: question.choices.length === 4 ? '14px 12px' : '12px 14px',
                  cursor: submittedAnswer !== undefined ? 'default' : 'pointer',
                  textAlign: 'left',
                  boxShadow: cs.pulse ? '0 8px 22px rgba(34, 197, 94, 0.18)' : 'none',
                }}
                whileTap={submittedAnswer === undefined ? { scale: 0.98 } : undefined}
              >
                {question.choices.length === 4 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold" style={{ opacity: 0.55 }}>{letter}</span>
                      {marker ? (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={{ color: marker.color, background: marker.bg }}
                        >
                          {marker.symbol}
                        </span>
                      ) : <span />}
                    </div>
                    {renderChoiceLabel(c.label)}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: checked ? '#F8FAFC' : '#F3F6FA', color: checked ? '#0F172A' : '#667085' }}
                    >
                      {letter}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">{renderChoiceLabel(c.label)}</div>
                      {marker ? (
                        <span
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ color: marker.color, background: marker.bg }}
                        >
                          {marker.symbol}
                        </span>
                      ) : null}
                    </div>
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
        const filledFraction = Boolean(numVal || denVal);
        const fractionBorderColor = showSubmittedState
          ? effectiveCorrectness === true
            ? '#16A34A'
            : effectiveCorrectness === false
              ? '#EF4444'
              : '#EAECEF'
          : filledFraction
            ? '#CBD5E1'
            : '#9CA3AF';
        const fractionBgColor = showSubmittedState
          ? effectiveCorrectness === true
            ? '#DCFCE7'
            : effectiveCorrectness === false
              ? '#FEE2E2'
              : '#F3F6FA'
          : filledFraction
            ? '#F8FAFC'
            : '#F3F6FA';

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
                aria-label={ui("Numérateur")}
              />
              <div className="w-20 h-[2px] bg-foreground my-1" />
              <input
                className="w-20 border rounded-lg px-3 py-2 text-center text-lg"
                inputMode="numeric"
                type="number"
                placeholder="?"
                value={denVal}
                onChange={e => setVal({ ...value, denominator: e.target.value })}
                aria-label={ui("Dénominateur")}
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
                )}
                style={{ borderColor: fractionBorderColor, background: fractionBgColor }}
                {...getDropTargetProps((num) => setVal({ ...value, numerator: num }))}
                onClick={() => handleTapZone("numerator")}
                aria-label={ui("Numérateur")}
              >
                {numVal || "?"}
              </div>
              <div className="w-20 h-[3px] bg-foreground my-1 rounded-full" />
              <div
                className={cn(
                  "w-20 h-14 border-2 border-dashed rounded-lg flex items-center justify-center text-2xl font-bold cursor-pointer transition-colors",
                )}
                style={{ borderColor: fractionBorderColor, background: fractionBgColor }}
                {...getDropTargetProps((num) => setVal({ ...value, denominator: num }))}
                onClick={() => handleTapZone("denominator")}
                aria-label={ui("Dénominateur")}
              >
                {denVal || "?"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {chips.map((num, i) => {
                const isUsed = String(num) === String(numVal) || String(num) === String(denVal);
                const isSelected = selectedChip === num;
                const isWrongUsed = showSubmittedState && effectiveCorrectness === false && isUsed;
                const isCorrectUsed = showSubmittedState && effectiveCorrectness === true && isUsed;
                return (
                  <motion.div
                      key={`${num}-${i}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                    whileTap={{ scale: 0.9 }}
                    {...getDragSourceProps(String(num))}
                    onClick={() => handleTapChip(num)}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold cursor-grab active:cursor-grabbing select-none transition-all",
                      isCorrectUsed
                        ? "bg-green-100 text-green-800 ring-2 ring-green-500 ring-offset-2"
                        : isWrongUsed
                          ? "bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-2"
                        : isSelected
                          ? "bg-slate-50 text-slate-900 ring-2 ring-slate-300 ring-offset-2"
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
              {ui("Glisse un nombre dans chaque case, ou tapote pour sélectionner.")}
            </p>
          </div>
        );
      })()}

      {question.kind === "numeric" && (question as any).answerFormat !== "fraction" && (() => {
        const q: any = question;
        const chips: number[] = buildNumericChips(q);
        const currentStr = String(value ?? '');
        const hasValue = currentStr !== '';
        const numericBorderColor = showSubmittedState
          ? effectiveCorrectness === true
            ? '#16A34A'
            : effectiveCorrectness === false
              ? '#EF4444'
              : '#EAECEF'
          : hasValue
            ? '#CBD5E1'
            : '#EAECEF';
        const numericBgColor = showSubmittedState
          ? effectiveCorrectness === true
            ? '#DCFCE7'
            : effectiveCorrectness === false
              ? '#FEE2E2'
              : 'white'
          : hasValue
            ? '#F8FAFC'
            : 'white';
        return (
          <div className="mt-2 flex flex-col items-center gap-3 py-2">
            <p className="text-xs font-medium" style={{ color: '#667085', fontFamily: 'Poppins, sans-serif' }}>
              {ui("Tape ta réponse")}
            </p>
            <div
              className="flex items-center justify-center rounded-2xl transition-all"
              style={{
                width: '160px',
                height: '96px',
                background: numericBgColor,
                border: `2.5px solid ${numericBorderColor}`,
              }}
              {...getDropTargetProps((chip) => {
                if (chip !== '') setVal(chip);
              })}
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
            {q.range && (
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {ui("Entre")} {q.range.min} {ui("et")} {q.range.max}
              </p>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {chips.map((chip, i) => {
                  const chipStr = String(chip);
                  const isUsed = currentStr === chipStr;
                  const isWrongUsed = showSubmittedState && effectiveCorrectness === false && isUsed;
                  const isCorrectUsed = showSubmittedState && effectiveCorrectness === true && isUsed;
                  return (
                    <motion.button
                      key={`${chip}-${i}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                      whileTap={{ scale: 0.9 }}
                      {...getDragSourceProps(chipStr)}
                      onClick={() => setVal(isUsed ? '' : chipStr)}
                      className={cn(
                        'w-12 h-12 rounded-xl border text-lg font-semibold transition-all cursor-grab active:cursor-grabbing',
                        isCorrectUsed
                          ? 'bg-green-100 border-green-500 text-green-800'
                          : isWrongUsed
                            ? 'bg-red-100 border-red-500 text-red-700'
                        : draggedValue === chipStr
                          ? 'bg-slate-900 border-slate-900 text-white'
                        : isUsed
                          ? 'bg-slate-50 border-slate-300 text-slate-900 opacity-100'
                          : 'bg-secondary border-transparent hover:border-primary/40 shadow-sm'
                      )}
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {chip}
                    </motion.button>
                  );
                })}
                <p className="basis-full text-xs text-center text-muted-foreground mt-1">
                  {ui("Glisse un nombre, ou tapote pour le placer.")}
                </p>
              </div>
            )}
          </div>
        );
      })()}

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
                onDragStart={(event: any) => {
                  event.dataTransfer?.setData("text/plain", it);
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
                  <span><InlineMathText text={it} /></span>
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
        <div className="mt-4">{renderVisualQuestion(question.visual, value, setVal, ui)}</div>
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

      {question.kind === "column-fill" && (
        <div className="mt-4">
          <ColumnFillQuestionView
            question={question}
            value={value}
            onChange={setVal}
            submittedAnswer={showSubmittedState ? submittedAnswer ?? value : undefined}
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
              {ui("Passer")}
            </button>
          )}
          <motion.button
            className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black"
            onClick={submitIfTimeline}
            whileTap={{ scale: 0.96 }}
          >
            {ui("Valider")}
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
  setValue: (next: any) => void,
  ui: (text: string) => string
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
          {ui("Ce type de question visuelle n'est pas encore disponible pour les élèves.")}
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
  const ui = useInterfaceTranslation();
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
          <p>{ui("Saisis l'angle mesuré entre les deux rayons.")}</p>
          <input
            type="number"
            className="w-full rounded-xl border px-3 py-2"
            inputMode="numeric"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ui("Angle mesuré en degrés")}
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
        {ui("Sélectionne toutes les cartes qui correspondent à la consigne.")}
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
  const ui = useInterfaceTranslation();
  const selected: string[] = Array.isArray(value) ? value : [];

  if (visual.interactionMode === "color_slices") {
    const sliceCount = visual.segments.length;
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          {ui("Clique sur les parts pour les colorier.")}
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
        {ui("Sélectionne le(s) diagramme(s) qui représente(nt) la fraction correcte.")}
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
