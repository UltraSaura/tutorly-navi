"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VisualPie } from "@/lib/quiz/visual-types";

const uuid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export default function PieEditor({
  state,
  setState,
}: {
  state: VisualPie;
  setState: (s: VisualPie) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const updateSeg = (i: number, patch: Partial<VisualPie["segments"][number]>) => {
    const next = [...state.segments];
    next[i] = { ...next[i], ...patch };
    setState({ ...state, segments: next });
  };

  const addSeg = () => {
    const nextSegment = { id: uuid(), value: 0.25, label: `Slice ${state.segments.length + 1}` };
    setState({
      ...state,
      segments: [...state.segments, nextSegment],
    });
    setSelectedId(nextSegment.id);
  };

  const handleRemove = (id: string) => {
    if (state.segments.length <= 1) return;
    const next = state.segments.filter((seg) => seg.id !== id);
    setState({ ...state, segments: next });
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  useEffect(() => {
    if (!selectedId && state.segments.length) {
      setSelectedId(state.segments[0].id);
    }
  }, [selectedId, state.segments]);

  const total = state.segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0) || 1;

  let start = 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Allow multiple</Label>
          <input
            type="checkbox"
            checked={!!state.multi}
            onChange={(e) => setState({ ...state, multi: e.target.checked })}
          />
        </div>
        {state.segments.map((seg, i) => (
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
            <label className="col-span-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!seg.correct}
                onChange={(e) => updateSeg(i, { correct: e.target.checked })}
              />
              correct
            </label>
            <Button type="button" variant="outline" onClick={() => handleRemove(seg.id)}>
              Remove
            </Button>
          </div>
        ))}
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
      <div className="flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          width={220}
          height={220}
          className="bg-white rounded-xl shadow-inner"
          role="img"
          aria-label="Pie preview"
        >
          {state.segments.map((seg) => {
            const angle = ((Number(seg.value) || 0) / total) * Math.PI * 2;
            const end = start + angle;
            const x1 = 50 + 45 * Math.cos(start);
            const y1 = 50 + 45 * Math.sin(start);
            const x2 = 50 + 45 * Math.cos(end);
            const y2 = 50 + 45 * Math.sin(end);
            const largeArc = angle > Math.PI ? 1 : 0;
            const d = `M50,50 L${x1},${y1} A45,45 0 ${largeArc} 1 ${x2},${y2} Z`;
            start = end;
            const isSelected = selectedId === seg.id;
            return (
              <path
                key={seg.id}
                d={d}
                fill={seg.correct ? "#2563eb" : "#cbd5e1"}
                stroke={isSelected ? "#1d4ed8" : "#fff"}
                strokeWidth={isSelected ? 2 : 1}
                className="cursor-pointer transition"
                onPointerDown={(evt) => {
                  evt.preventDefault();
                  setSelectedId(seg.id);
                }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
