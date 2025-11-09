"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PieEditor from "@/components/admin/visual-editors/PieEditor";
import GridEditor from "@/components/admin/visual-editors/GridEditor";
import ShapeEditor from "@/components/admin/visual-editors/ShapeEditor";
import AngleEditor from "@/components/admin/visual-editors/AngleEditor";
import LineEditor from "@/components/admin/visual-editors/LineEditor";
import type {
  VisualUnion,
  VisualPie,
  VisualGrid,
  VisualShapeSelect,
  VisualLineRelation,
  VisualAngle,
} from "@/lib/quiz/visual-types";

const uuid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const defaultPie = (): VisualPie => ({
  subtype: "pie",
  multi: false,
  segments: [
    { id: uuid(), value: 0.25, label: "A", correct: true },
    { id: uuid(), value: 0.25, label: "B" },
    { id: uuid(), value: 0.25, label: "C", correct: true },
    { id: uuid(), value: 0.25, label: "D" },
  ],
});

const defaultGrid = (): VisualGrid => ({
  subtype: "grid",
  rows: 3,
  cols: 3,
  correctCells: ["r0c0", "r0c1"],
  multi: true,
});

const defaultShapes = (): VisualShapeSelect => ({
  subtype: "shape_select",
  shapes: [
    { id: uuid(), type: "rect", rect: { x: 10, y: 60, w: 30, h: 20, rx: 4 }, label: "Rectangle", correct: true },
    { id: uuid(), type: "circle", circle: { cx: 70, cy: 70, r: 12 }, label: "Circle" },
  ],
});

const defaultLines = (): VisualLineRelation => ({
  subtype: "line_relation",
  target: "perpendicular",
  multi: true,
  pairs: [
    {
      id: uuid(),
      a: { x1: -20, y1: 0, x2: 20, y2: 0 },
      b: { x1: 0, y1: -20, x2: 0, y2: 20 },
      relation: "perpendicular",
    },
  ],
});

const defaultAngle = (): VisualAngle => ({
  subtype: "angle",
  multi: false,
  baseCorrect: false,
  aDeg: 0,
  bDeg: 60,
  targetDeg: 60,
  toleranceDeg: 2,
});

export interface VisualQuestionBuilderProps {
  value: VisualUnion;
  onChange: (visual: VisualUnion) => void;
}

export default function VisualQuestionBuilder({ value, onChange }: VisualQuestionBuilderProps) {
  const [activeTab, setActiveTab] = useState<VisualUnion["subtype"]>(value?.subtype ?? "pie");
  const [pie, setPie] = useState<VisualPie>(value?.subtype === "pie" ? (value as VisualPie) : defaultPie());

  const initialGrid = useMemo(() => {
    if (value?.subtype === "grid") return value as VisualGrid;
    return defaultGrid();
  }, [value]);
  const [grid, setGrid] = useState<VisualGrid>(initialGrid);
  const [gridMode, setGridMode] = useState<"pattern" | "count">(
    initialGrid.requiredCount != null ? "count" : "pattern"
  );
  const [gridCount, setGridCount] = useState<number>(initialGrid.requiredCount ?? 0);

  const [shapes, setShapes] = useState<VisualShapeSelect>(
    value?.subtype === "shape_select" ? (value as VisualShapeSelect) : defaultShapes()
  );

  const [lines, setLines] = useState<VisualLineRelation>(
    value?.subtype === "line_relation" ? (value as VisualLineRelation) : defaultLines()
  );

  const [angle, setAngle] = useState<VisualAngle>(
    value?.subtype === "angle" ? (value as VisualAngle) : defaultAngle()
  );

  useEffect(() => {
    if (!value) return;
    setActiveTab(value.subtype);
    switch (value.subtype) {
      case "pie":
        setPie(value as VisualPie);
        break;
      case "grid": {
        const g = value as VisualGrid;
        setGrid({ ...g });
        setGridMode(g.requiredCount != null ? "count" : "pattern");
        setGridCount(g.requiredCount ?? 0);
        break;
      }
      case "shape_select":
        setShapes(value as VisualShapeSelect);
        break;
      case "line_relation":
        setLines(value as VisualLineRelation);
        break;
      case "angle":
        setAngle(value as VisualAngle);
        break;
    }
  }, [value]);

  useEffect(() => {
    switch (activeTab) {
      case "pie":
        onChange(pie);
        break;
      case "grid":
        onChange({ ...grid, requiredCount: gridMode === "count" ? gridCount : undefined });
        break;
      case "shape_select":
        onChange(shapes);
        break;
      case "line_relation":
        onChange(lines);
        break;
      case "angle":
        onChange(angle);
        break;
    }
  }, [activeTab]);

  const handlePie = (next: VisualPie) => {
    setPie(next);
    if (activeTab === "pie") onChange(next);
  };

  const handleGrid = (next: VisualGrid) => {
    setGrid(next);
    if (activeTab === "grid") {
      onChange({ ...next, requiredCount: gridMode === "count" ? gridCount : undefined });
    }
  };

  useEffect(() => {
    if (activeTab === "grid") {
      onChange({ ...grid, requiredCount: gridMode === "count" ? gridCount : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridMode, gridCount]);

  const handleShapes = (next: VisualShapeSelect) => {
    setShapes(next);
    if (activeTab === "shape_select") onChange(next);
  };

  const handleLines = (next: VisualLineRelation) => {
    setLines(next);
    if (activeTab === "line_relation") onChange(next);
  };

  const handleAngle = (next: VisualAngle) => {
    setAngle(next);
    if (activeTab === "angle") onChange(next);
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VisualUnion["subtype"])}>
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="pie">Pie</TabsTrigger>
        <TabsTrigger value="grid">Grid</TabsTrigger>
        <TabsTrigger value="shape_select">Shapes</TabsTrigger>
        <TabsTrigger value="line_relation">Lines</TabsTrigger>
        <TabsTrigger value="angle">Angle</TabsTrigger>
      </TabsList>
      <TabsContent value="pie">
        <PieEditor state={pie} setState={handlePie} />
      </TabsContent>
      <TabsContent value="grid">
        <GridEditor
          state={grid}
          setState={handleGrid}
          gridMode={gridMode}
          setGridMode={setGridMode}
          gridCount={gridCount}
          setGridCount={setGridCount}
        />
      </TabsContent>
      <TabsContent value="shape_select">
        <ShapeEditor state={shapes} setState={handleShapes} />
      </TabsContent>
      <TabsContent value="line_relation">
        <LineEditor state={lines} setState={handleLines} />
      </TabsContent>
      <TabsContent value="angle">
        <AngleEditor state={angle} setState={handleAngle} />
      </TabsContent>
    </Tabs>
  );
}
