"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { VisualGrid } from "@/lib/quiz/visual-types";

export default function GridEditor({
  state,
  setState,
  gridMode,
  setGridMode,
  gridCount,
  setGridCount,
}: {
  state: VisualGrid;
  setState: (s: VisualGrid) => void;
  gridMode: "pattern" | "count";
  setGridMode: (m: "pattern" | "count") => void;
  gridCount: number;
  setGridCount: (n: number) => void;
}) {
  const toggle = (id: string) => {
    if (gridMode === "count") return;
    const next = new Set(state.correctCells || []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setState({ ...state, correctCells: [...next] });
  };

  React.useEffect(() => {
    if (gridMode === "pattern") {
      setState({ ...state, requiredCount: undefined });
    } else {
      setState({ ...state, correctCells: [], requiredCount: gridCount });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridMode]);

  React.useEffect(() => {
    if (gridMode === "count") {
      setState({ ...state, requiredCount: gridCount });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridCount]);

  const cells: JSX.Element[] = [];
  const cw = 100 / state.cols;
  const ch = 100 / state.rows;

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const id = `r${r}c${c}`;
      const on = !!state.correctCells?.includes(id);
      cells.push(
        <rect
          key={id}
          x={c * cw}
          y={r * ch}
          width={cw}
          height={ch}
          fill={on ? "#2563eb" : "#e5e7eb"}
          stroke="#fff"
          onClick={() => toggle(id)}
        />
      );
    }
  }

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const handleRows = (value: number) => {
    const rows = clamp(value, 1, 10);
    setState({ ...state, rows });
  };

  const handleCols = (value: number) => {
    const cols = clamp(value, 1, 10);
    setState({ ...state, cols });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex gap-4 items-center">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={gridMode === "pattern"}
              onChange={() => setGridMode("pattern")}
            />
            Pattern match
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={gridMode === "count"}
              onChange={() => setGridMode("count")}
            />
            Required count
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Rows</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={state.rows}
              onChange={(e) => handleRows(parseInt(e.target.value || "1", 10))}
            />
          </div>
          <div>
            <Label>Cols</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={state.cols}
              onChange={(e) => handleCols(parseInt(e.target.value || "1", 10))}
            />
          </div>
          {gridMode === "count" && (
            <div>
              <Label>Required count</Label>
              <Input
                type="number"
                min={0}
                value={gridCount}
                onChange={(e) => setGridCount(parseInt(e.target.value || "0", 10))}
              />
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Pattern mode: toggle cells below to set the exact shape. Count mode ignores highlighted cells and only checks the total number of selections.
        </div>
        {gridMode === "pattern" && (
          <Button type="button" variant="outline" onClick={() => setState({ ...state, correctCells: [] })}>
            Clear pattern
          </Button>
        )}
      </div>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 100 100" width={260} height={260} className="bg-white rounded-xl shadow-inner">
          {cells}
        </svg>
      </div>
    </div>
  );
}
