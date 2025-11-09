"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VisualAngle } from "@/lib/quiz/visual-types";
import { normalizeAngle, snapAngle } from "@/lib/quiz/visual-geometry";

const SINGLE_RADIUS = 40;
const MULTI_RADIUS = 32;
const makeId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

type DragState = {
  id: string;
  ray: "a" | "b";
  svg?: SVGSVGElement | null;
};

const angleBetween = (aDeg: number, bDeg: number) => {
  const diff = Math.abs(normalizeAngle(aDeg) - normalizeAngle(bDeg));
  return Math.min(diff, Math.abs(diff - 360));
};

export default function AngleEditor({
  state,
  setState,
}: {
  state: VisualAngle;
  setState: (s: VisualAngle) => void;
}) {
  const singleSvgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [angleBadge, setAngleBadge] = useState<{ id: string; angle: number; x: number; y: number } | null>(null);
  const [betweenBadge, setBetweenBadge] = useState<{ id: string; value: number } | null>(null);
  const [activeId, setActiveId] = useState<string>("base");

  const variants = state.variants ?? [];
  const configs = useMemo(
    () => [
      {
        id: "base",
        label: "Angle 1",
        aDeg: state.aDeg,
        bDeg: state.bDeg,
        targetDeg: state.targetDeg,
        toleranceDeg: state.toleranceDeg,
        correct: state.baseCorrect ?? false,
      },
      ...variants.map((variant, index) => ({
        id: variant.id,
        label: `Angle ${index + 2}`,
        aDeg: variant.aDeg,
        bDeg: variant.bDeg,
        targetDeg: variant.targetDeg,
        toleranceDeg: variant.toleranceDeg,
        correct: variant.correct ?? false,
      })),
    ],
    [state.aDeg, state.bDeg, state.targetDeg, state.toleranceDeg, state.baseCorrect, variants]
  );

  const displayConfigs = useMemo(
    () =>
      configs.map((config) => ({
        ...config,
        radius: state.multi ? MULTI_RADIUS : SINGLE_RADIUS,
      })),
    [configs, state.multi]
  );

  const current = displayConfigs.find((config) => config.id === activeId) ?? displayConfigs[0];

  useEffect(() => {
    if (!current) {
      setActiveId("base");
    }
  }, [current]);

  useEffect(() => {
    if (!state.multi && activeId !== "base") {
      setActiveId("base");
    }
  }, [state.multi, activeId]);

  const updateAngleValue = (key: "aDeg" | "bDeg" | "targetDeg" | "toleranceDeg", value: number, targetId: string = activeId) => {
    const normalizedValue = key === "toleranceDeg" ? value : normalizeAngle(value);
    if (targetId === "base" || !state.multi) {
      setState({
        ...state,
        [key]: normalizedValue,
      });
    } else {
      const nextVariants = (state.variants ?? []).map((variant) =>
        variant.id === targetId
          ? {
              ...variant,
              [key]: normalizedValue,
            }
          : variant
      );
      setState({
        ...state,
        variants: nextVariants,
      });
    }
  };

  const handlePointerDown = (variantId: string, ray: "a" | "b") => (evt: React.PointerEvent<SVGCircleElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    const circle = evt.currentTarget as SVGCircleElement;
    const svg = circle.ownerSVGElement;
    if (svg) {
    svg.style.userSelect = "none";
    svg.style.touchAction = "none";
    }
    circle.setPointerCapture(evt.pointerId);
    setActiveId(variantId);
    setDragging({ id: variantId, ray, svg });
  };

  const handlePointerMove = (variantId: string) => (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || dragging.id !== variantId) return;
    const svg = evt.currentTarget as SVGSVGElement;
    const displayConfig = displayConfigs.find((config) => config.id === variantId);
    if (!displayConfig) return;
    const { x, y } = pointerToLocal(evt, svg);
    const rawAngle = Math.atan2(-y, x) * (180 / Math.PI);
    const snapped = snapAngle(rawAngle, {
      altKey: evt.altKey,
      shiftKey: evt.shiftKey,
    });

    updateAngleValue(dragging.ray === "a" ? "aDeg" : "bDeg", snapped, variantId);
    const radius = displayConfig.radius;
    const rad = (snapped * Math.PI) / 180;
    setAngleBadge({
      id: variantId,
      angle: Math.round(snapped),
      x: radius * Math.cos(rad),
      y: -radius * Math.sin(rad),
    });

    const otherAngle = dragging.ray === "a" ? displayConfig.bDeg : displayConfig.aDeg;
    setBetweenBadge({
      id: variantId,
      value: Math.round(angleBetween(snapped, otherAngle)),
    });
  };

  const handlePointerEnd = (variantId: string) => (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || dragging.id !== variantId) return;
    const svgElement = dragging.svg ?? (evt.currentTarget as SVGSVGElement);
    if (svgElement) {
      svgElement.style.userSelect = "auto";
      svgElement.style.touchAction = "auto";
    }
    setDragging(null);
    setAngleBadge(null);
    setBetweenBadge(null);
  };

  const toggleMulti = (checked: boolean) => {
    setAngleBadge(null);
    setBetweenBadge(null);
    setDragging(null);

    if (checked) {
      setState({
        ...state,
        multi: true,
        baseCorrect: state.baseCorrect ?? false,
        variants: [...variants],
      });
      setActiveId("base");
    } else {
      setState({
        ...state,
        multi: undefined,
        baseCorrect: undefined,
        variants: undefined,
      });
      setActiveId("base");
    }
  };

  const addVariant = () => {
    const source = current ?? displayConfigs[0];
    const newVariant = {
      id: makeId(),
      aDeg: source.aDeg,
      bDeg: source.bDeg,
      targetDeg: source.targetDeg,
      toleranceDeg: source.toleranceDeg,
      correct: false,
    };
    setState({
      ...state,
      multi: true,
      variants: [...variants, newVariant],
    });
    setActiveId(newVariant.id);
  };

  const removeVariant = (id: string) => {
    const nextVariants = variants.filter((variant) => variant.id !== id);
    setState({
      ...state,
      variants: nextVariants,
    });
    if (activeId === id) {
      setActiveId("base");
    }
  };

  const toggleCorrect = (id: string, checked: boolean) => {
    if (id === "base") {
      setState({
        ...state,
        baseCorrect: checked,
      });
    } else {
      const nextVariants = variants.map((variant) =>
        variant.id === id ? { ...variant, correct: checked } : variant
      );
      setState({
        ...state,
        variants: nextVariants,
      });
    }
  };

  const activeAngleBetween = current ? Math.round(angleBetween(current.aDeg, current.bDeg)) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Allow multiple answers</Label>
          <input type="checkbox" checked={!!state.multi} onChange={(e) => toggleMulti(e.target.checked)} />
        </div>

        {state.multi && (
          <div className="space-y-2 border rounded-md p-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Angles</span>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700" onClick={addVariant}>
                Add angle
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              {displayConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-sm cursor-pointer ${
                    activeId === config.id ? "bg-blue-50 text-blue-700" : "hover:bg-muted/60"
                  }`}
                  onClick={() => setActiveId(config.id)}
                >
                  <span>{config.label}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(evt) => evt.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={config.correct}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleCorrect(config.id, e.target.checked);
                        }}
                      />
                      correct
                    </label>
                    {config.id !== "base" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          removeVariant(config.id);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Add multiple angles and mark the correct ones. Students will select every correct angle card when answering.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Ray A (deg)</Label>
            <Input
              type="number"
              value={current?.aDeg ?? state.aDeg}
              onChange={(e) => updateAngleValue("aDeg", parseFloat(e.target.value || "0"), activeId)}
            />
          </div>
          <div>
            <Label>Ray B (deg)</Label>
            <Input
              type="number"
              value={current?.bDeg ?? state.bDeg}
              onChange={(e) => updateAngleValue("bDeg", parseFloat(e.target.value || "0"), activeId)}
            />
          </div>
          <div>
            <Label>{state.multi ? "Reference angle (deg)" : "Correct angle"}</Label>
            <Input
              type="number"
              value={current?.targetDeg ?? state.targetDeg}
              onChange={(e) => updateAngleValue("targetDeg", parseFloat(e.target.value || "0"), activeId)}
            />
          </div>
          <div>
            <Label>Tolerance (±deg)</Label>
            <Input
              type="number"
              value={current?.toleranceDeg ?? state.toleranceDeg}
              onChange={(e) => updateAngleValue("toleranceDeg", parseFloat(e.target.value || "0"), activeId)}
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {state.multi
            ? "Drag the handles inside each angle card to adjust the rays. Hold Alt for 15° snap, Shift for 5° snap."
            : "Drag the handles to set rays. Hold Alt for 15° snap, Shift for 5° snap. Students answer numeric values within tolerance."}
        </div>
        <div className="text-xs">Active angle between rays: {activeAngleBetween}°</div>
      </div>

      <div className={state.multi ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "relative flex items-center justify-center"}>
        {state.multi
          ? displayConfigs.map((config) => {
              const isActive = config.id === activeId;
              const radius = config.radius;
              const rayA = polarToCartesian(config.aDeg, radius);
              const rayB = polarToCartesian(config.bDeg, radius);
              const arcPath = describeArc(0, 0, radius * 0.7, config.aDeg, config.bDeg);
              return (
                <div
                  key={config.id}
                  className={`relative rounded-lg border p-3 transition ${
                    isActive ? "border-blue-500 bg-blue-50/40 shadow-sm" : "border-border bg-white"
                  }`}
                  onPointerDown={() => setActiveId(config.id)}
                >
                  <svg
                    viewBox="-50 -50 100 100"
                    width={160}
                    height={160}
                    className="mx-auto bg-white rounded-md shadow-inner"
                    onPointerMove={handlePointerMove(config.id)}
                    onPointerUp={handlePointerEnd(config.id)}
                    onPointerLeave={handlePointerEnd(config.id)}
                  >
                    <circle cx={0} cy={0} r={radius} fill="#fff" stroke={isActive ? "#1f2937" : "#d1d5db"} strokeWidth={isActive ? 1.8 : 1} strokeDasharray={isActive ? undefined : "4 4"} />
                    <path d={arcPath} fill={isActive ? "#bfdbfe" : "#e2e8f0"} fillOpacity={isActive ? 0.65 : 0.35} pointerEvents="none" />
                    <line x1={0} y1={0} x2={rayA.x} y2={rayA.y} stroke={isActive ? "#1f2937" : "#9ca3af"} strokeWidth={isActive ? 2.4 : 1.6} strokeLinecap="round" pointerEvents="none" />
                    <line x1={0} y1={0} x2={rayB.x} y2={rayB.y} stroke={isActive ? "#1f2937" : "#9ca3af"} strokeWidth={isActive ? 2.4 : 1.6} strokeLinecap="round" pointerEvents="none" />
                    {isActive && (
                      <>
                        <circle
                          cx={rayA.x}
                          cy={rayA.y}
                          r={3}
                          className="cursor-pointer fill-white stroke-blue-500"
                          strokeWidth={1.5}
                          onPointerDown={handlePointerDown(config.id, "a")}
                          aria-label={`${config.label} ray A handle`}
                        />
                        <circle
                          cx={rayB.x}
                          cy={rayB.y}
                          r={3}
                          className="cursor-pointer fill-white stroke-blue-500"
                          strokeWidth={1.5}
                          onPointerDown={handlePointerDown(config.id, "b")}
                          aria-label={`${config.label} ray B handle`}
                        />
                      </>
                    )}
                    {angleBadge?.id === config.id && (
                      <text x={angleBadge.x} y={angleBadge.y - 4} textAnchor="middle" fontSize={5} fill="#1d4ed8">
                        {angleBadge.angle}°
                      </text>
                    )}
                  </svg>
                  {betweenBadge?.id === config.id && (
                    <div className="absolute top-3 right-3 rounded-full bg-blue-500/90 px-3 py-1 text-xs text-white">{betweenBadge.value}°</div>
                  )}
                  <div className="mt-2 text-center text-xs text-muted-foreground">Angle between rays: {Math.round(angleBetween(config.aDeg, config.bDeg))}°</div>
                </div>
              );
            })
          : (() => {
      const baseConfig = displayConfigs[0];
      const radius = SINGLE_RADIUS;
      const rayA = polarToCartesian(baseConfig.aDeg, radius);
      const rayB = polarToCartesian(baseConfig.bDeg, radius);
      const arcPath = describeArc(0, 0, radius * 0.7, baseConfig.aDeg, baseConfig.bDeg);
              return (
                <>
                  <svg
                    ref={singleSvgRef}
          viewBox="-50 -50 100 100"
          width={280}
          height={280}
          className="bg-white rounded-xl shadow-inner"
                    onPointerMove={handlePointerMove("base")}
                    onPointerUp={handlePointerEnd("base")}
                    onPointerLeave={handlePointerEnd("base")}
        >
                    <circle cx={0} cy={0} r={radius} fill="#ffffff" stroke="#e5e7eb" />
                    <path d={arcPath} fill="#cbd5e1" fillOpacity={0.65} />
                    <line x1={0} y1={0} x2={rayA.x} y2={rayA.y} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
                    <line x1={0} y1={0} x2={rayB.x} y2={rayB.y} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
          <circle
                      cx={rayA.x}
                      cy={rayA.y}
            r={3}
            className="cursor-pointer fill-white stroke-blue-500"
            strokeWidth={1.5}
                      onPointerDown={handlePointerDown("base", "a")}
            aria-label="Ray A handle"
          />
          <circle
                      cx={rayB.x}
                      cy={rayB.y}
            r={3}
            className="cursor-pointer fill-white stroke-blue-500"
            strokeWidth={1.5}
                      onPointerDown={handlePointerDown("base", "b")}
            aria-label="Ray B handle"
          />
                    {angleBadge?.id === "base" && (
            <text x={angleBadge.x} y={angleBadge.y - 4} textAnchor="middle" fontSize={5} fill="#1d4ed8">
              {angleBadge.angle}°
            </text>
          )}
        </svg>
                  {betweenBadge?.id === "base" && (
          <div className="absolute top-3 right-3 rounded-full bg-blue-500 px-3 py-1 text-xs text-white">
                      {betweenBadge.value}°
          </div>
        )}
                </>
              );
            })()}
      </div>
    </div>
  );
}

function polarToCartesian(deg: number, radius: number) {
  const radians = (deg * Math.PI) / 180;
  const x = radius * Math.cos(radians);
  const y = -radius * Math.sin(radians);
  return { x, y };
}

function pointerToLocal(evt: React.PointerEvent<SVGSVGElement>, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100 - 50;
  const y = ((evt.clientY - rect.top) / rect.height) * 100 - 50;
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
