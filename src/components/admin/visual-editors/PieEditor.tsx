"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VisualPie } from "@/lib/quiz/visual-types";

const uuid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

type PieVariant = {
  id: string;
  segments: { id: string; value: number; label?: string }[];
  correct?: boolean;
};

export default function PieEditor({
  state,
  setState,
}: {
  state: VisualPie;
  setState: (s: VisualPie) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePieId, setActivePieId] = useState<string>("base");

  const variants = state.variants ?? [];
  const isMultiMode = !!state.multi && variants.length > 0;

  // Get current pie configuration
  const getCurrentPie = (): { id: string; label: string; segments: typeof state.segments; correct: boolean } => {
    if (activePieId === "base") {
      return { id: "base", label: "Pie 1", segments: state.segments, correct: state.baseCorrect ?? false };
    }
    const variant = variants.find((v) => v.id === activePieId);
    if (variant) {
      const index = variants.findIndex((v) => v.id === activePieId);
      return { id: variant.id, label: `Pie ${index + 2}`, segments: variant.segments, correct: variant.correct ?? false };
    }
    return { id: "base", label: "Pie 1", segments: state.segments, correct: state.baseCorrect ?? false };
  };

  const currentPie = getCurrentPie();

  const updateSeg = (i: number, patch: Partial<VisualPie["segments"][number]>) => {
    if (activePieId === "base") {
      const next = [...state.segments];
      next[i] = { ...next[i], ...patch };
      setState({ ...state, segments: next });
    } else {
      const nextVariants = variants.map((v) => {
        if (v.id === activePieId) {
          const next = [...v.segments];
          next[i] = { ...next[i], ...patch };
          return { ...v, segments: next };
        }
        return v;
      });
      setState({ ...state, variants: nextVariants });
    }
  };

  const addSeg = () => {
    const currentSegments = currentPie.segments;
    const nextSegment = { id: uuid(), value: 0.25, label: `Slice ${currentSegments.length + 1}` };
    
    if (activePieId === "base") {
      setState({
        ...state,
        segments: [...state.segments, nextSegment],
      });
    } else {
      const nextVariants = variants.map((v) => {
        if (v.id === activePieId) {
          return { ...v, segments: [...v.segments, nextSegment] };
        }
        return v;
      });
      setState({ ...state, variants: nextVariants });
    }
    setSelectedId(nextSegment.id);
  };

  const handleRemove = (id: string) => {
    if (currentPie.segments.length <= 1) return;
    
    if (activePieId === "base") {
      const next = state.segments.filter((seg) => seg.id !== id);
      setState({ ...state, segments: next });
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
    } else {
      const nextVariants = variants.map((v) => {
        if (v.id === activePieId) {
          const next = v.segments.filter((seg) => seg.id !== id);
          if (selectedId === id) {
            setSelectedId(next[0]?.id ?? null);
          }
          return { ...v, segments: next };
        }
        return v;
      });
      setState({ ...state, variants: nextVariants });
    }
  };

  const toggleMulti = (checked: boolean) => {
    if (checked) {
      setState({
        ...state,
        multi: true,
        baseCorrect: state.baseCorrect ?? false,
        variants: [...variants],
      });
      setActivePieId("base");
    } else {
      setState({
        ...state,
        multi: undefined,
        baseCorrect: undefined,
        variants: undefined,
      });
      setActivePieId("base");
    }
  };

  const addVariant = () => {
    const newVariant: PieVariant = {
      id: uuid(),
      segments: currentPie.segments.map((seg) => ({ ...seg, id: uuid() })),
      correct: false,
    };
    setState({
      ...state,
      multi: true,
      variants: [...variants, newVariant],
    });
    setActivePieId(newVariant.id);
  };

  const removeVariant = (id: string) => {
    const nextVariants = variants.filter((v) => v.id !== id);
    setState({
      ...state,
      variants: nextVariants,
    });
    if (activePieId === id) {
      setActivePieId("base");
    }
  };

  const toggleCorrect = (id: string, checked: boolean) => {
    if (id === "base") {
      setState({
        ...state,
        baseCorrect: checked,
      });
    } else {
      const nextVariants = variants.map((v) =>
        v.id === id ? { ...v, correct: checked } : v
      );
      setState({
        ...state,
        variants: nextVariants,
      });
    }
  };

  useEffect(() => {
    if (!selectedId && currentPie.segments.length) {
      setSelectedId(currentPie.segments[0].id);
    }
  }, [selectedId, currentPie.segments]);

  useEffect(() => {
    if (!state.multi && activePieId !== "base") {
      setActivePieId("base");
    }
  }, [state.multi, activePieId]);

  const allPies = [
    { id: "base", label: "Pie 1", segments: state.segments, correct: state.baseCorrect ?? false },
    ...variants.map((v, index) => ({ id: v.id, label: `Pie ${index + 2}`, segments: v.segments, correct: v.correct ?? false })),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Multiple pie choices</Label>
          <input
            type="checkbox"
            checked={!!state.multi}
            onChange={(e) => toggleMulti(e.target.checked)}
          />
        </div>

        {state.multi && variants.length >= 0 && (
          <div className="space-y-2 border rounded-md p-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Pie Charts</span>
              <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700" 
                onClick={addVariant}
              >
                Add pie
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              {allPies.map((pie) => (
                <div
                  key={pie.id}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-sm cursor-pointer ${
                    activePieId === pie.id ? "bg-blue-50 text-blue-700" : "hover:bg-muted/60"
                  }`}
                  onClick={() => setActivePieId(pie.id)}
                >
                  <span>{pie.label}</span>
                  <div className="flex items-center gap-2">
                    <label 
                      className="flex items-center gap-1 text-xs text-muted-foreground" 
                      onClick={(evt) => evt.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={pie.correct}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleCorrect(pie.id, e.target.checked);
                        }}
                      />
                      correct
                    </label>
                    {pie.id !== "base" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          removeVariant(pie.id);
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
              Add multiple pie charts and mark the correct ones. Students will select the correct pie chart(s).
            </div>
          </div>
        )}

        {!isMultiMode && (
          <div className="text-xs text-muted-foreground">
            Configure segments. Students will select the correct segment(s) within this pie.
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Segments for {allPies.find(p => p.id === activePieId)?.label}</Label>
          {currentPie.segments.map((seg, i) => (
            <div
              key={seg.id}
              className={`grid grid-cols-6 gap-2 rounded-md p-2 transition border ${
                selectedId === seg.id ? "border-blue-500 bg-blue-50" : "border-transparent"
              }`}
              onClick={() => setSelectedId(seg.id)}
            >
              <Input
                className="col-span-2"
                value={seg.label ?? ""}
                onChange={(e) => updateSeg(i, { label: e.target.value })}
                placeholder={`Label ${i + 1}`}
              />
              <Input
                type="number"
                step="0.05"
                value={seg.value}
                onChange={(e) => updateSeg(i, { value: parseFloat(e.target.value || "0") })}
              />
              {!isMultiMode && (
                <label className="col-span-2 inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!(seg as any).correct}
                    onChange={(e) => updateSeg(i, { correct: e.target.checked })}
                  />
                  correct
                </label>
              )}
              {isMultiMode && <div className="col-span-2" />}
              <Button type="button" variant="outline" onClick={() => handleRemove(seg.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addSeg}>
            Add segment
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedId}
            onClick={() => selectedId && handleRemove(selectedId)}
          >
            Remove selected
          </Button>
        </div>
      </div>

      <div className={state.multi && variants.length > 0 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "flex items-center justify-center"}>
        {(state.multi && variants.length > 0 ? allPies : [currentPie]).map((pie) => {
          const total = pie.segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0) || 1;
          let start = 0;
          const isActive = pie.id === activePieId;
          const isMultiDisplay = state.multi && variants.length > 0;

          return (
            <div
              key={pie.id}
              className={isMultiDisplay ? `relative rounded-lg border p-3 transition ${
                isActive ? "border-blue-500 bg-blue-50/40 shadow-sm" : "border-border bg-white"
              }` : ""}
              onClick={() => isMultiDisplay && setActivePieId(pie.id)}
            >
              <svg
                viewBox="0 0 100 100"
                width={isMultiDisplay ? 140 : 220}
                height={isMultiDisplay ? 140 : 220}
                className="bg-white rounded-xl shadow-inner mx-auto"
                role="img"
                aria-label={`${pie.label} preview`}
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
                  const isSelected = selectedId === seg.id && isActive;
                  const showCorrect = !isMultiDisplay && (seg as any).correct;
                  return (
                    <path
                      key={seg.id}
                      d={d}
                      fill={showCorrect ? "#2563eb" : "#cbd5e1"}
                      stroke={isSelected ? "#1d4ed8" : "#fff"}
                      strokeWidth={isSelected ? 2 : 1}
                      className="cursor-pointer transition"
                      onPointerDown={(evt) => {
                        evt.preventDefault();
                        if (!isActive && isMultiDisplay) {
                          setActivePieId(pie.id);
                        }
                        setSelectedId(seg.id);
                      }}
                    />
                  );
                })}
              </svg>
              {isMultiDisplay && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {pie.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
