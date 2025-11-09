"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { VisualShapeSelect } from "@/lib/quiz/visual-types";
import { applySnapToPoint, clampCircle, clampPoint, clampRect, DEFAULT_GRID_STEP } from "@/lib/quiz/visual-geometry";

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

type RectHandle = "tl" | "tr" | "bl" | "br" | "top" | "bottom" | "left" | "right";

const MIN_SIZE = 4;

type DragMode =
  | { type: "move-rect"; id: string; pointerId: number; origin: { x: number; y: number; w: number; h: number }; offset: { dx: number; dy: number } }
  | { type: "move-circle"; id: string; pointerId: number; origin: { cx: number; cy: number; r: number }; offset: { dx: number; dy: number } }
  | { type: "move-polygon"; id: string; pointerId: number; origin: [number, number][]; start: { x: number; y: number } }
  | { type: "resize-rect"; id: string; pointerId: number; handle: RectHandle; origin: { x: number; y: number; w: number; h: number } }
  | { type: "circle-radius"; id: string; pointerId: number; origin: { cx: number; cy: number; r: number } }
  | { type: "vertex"; id: string; pointerId: number; vertexIndex: number; origin: [number, number][] }
  | null;

export default function ShapeEditor({
  state,
  setState,
}: {
  state: VisualShapeSelect;
  setState: (s: VisualShapeSelect) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragMode>(null);
  const [mode, setMode] = useState<"edit" | "delete">("edit");

  const addShape = (kind: "rect" | "circle" | "triangle" | "polygon") => {
    const id = uuid();
    let nextShape: VisualShapeSelect["shapes"][number];
    switch (kind) {
      case "rect":
        nextShape = { id, type: "rect", rect: { x: 20, y: 60, w: 24, h: 18, rx: 4 }, label: "Rectangle" };
        break;
      case "circle":
        nextShape = { id, type: "circle", circle: { cx: 65, cy: 65, r: 12 }, label: "Circle" };
        break;
      case "triangle":
        nextShape = {
          id,
          type: "triangle",
          triangle: { points: [35, 25, 55, 55, 20, 55] },
          label: "Triangle",
        };
        break;
      case "polygon":
        nextShape = {
          id,
          type: "polygon",
          polygon: {
            points: [
              [30, 30],
              [70, 30],
              [70, 60],
              [30, 60],
            ],
          },
          label: "Polygon",
        };
        break;
    }
    setState({ ...state, shapes: [...state.shapes, nextShape] });
    setSelectedId(id);
  };

  const updateShape = (
    id: string,
    updater: (shape: VisualShapeSelect["shapes"][number]) => VisualShapeSelect["shapes"][number]
  ) => {
    setState({
      ...state,
      shapes: state.shapes.map((shape) => (shape.id === id ? updater(shape) : shape)),
    });
  };

  const setShape = (
    id: string,
    updater: (shape: VisualShapeSelect["shapes"][number]) => VisualShapeSelect["shapes"][number]
  ) => {
    updateShape(id, updater);
  };

  const toggleCorrect = (id: string) => {
    updateShape(id, (shape) => ({ ...shape, correct: !shape.correct }));
  };

  const removeShape = (id: string) => {
    setState({ ...state, shapes: state.shapes.filter((shape) => shape.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const handleAddSide = () => {
    if (!selectedId) return;
    const shape = state.shapes.find((s) => s.id === selectedId);
    if (!shape || shape.type !== "polygon" || !shape.polygon) return;
    const nextPoints = addPolygonSide(shape.polygon.points) as [number, number][];
    setShape(shape.id, (current) =>
      current.type === "polygon" && current.polygon ? { ...current, polygon: { points: nextPoints } } : current
    );
  };

  const handleRemoveLastSide = () => {
    if (!selectedId) return;
    const shape = state.shapes.find((s) => s.id === selectedId);
    if (!shape || shape.type !== "polygon" || !shape.polygon) return;
    if (shape.polygon.points.length <= 4) return;
    const trimmed = removePolygonSide(shape.polygon.points);
    setShape(shape.id, (current) =>
      current.type === "polygon" && current.polygon ? { ...current, polygon: { points: trimmed } } : current
    );
  };

  const handlePointerDownShape = (
    shape: VisualShapeSelect["shapes"][number],
    evt: React.PointerEvent<SVGElement>
  ) => {
    evt.stopPropagation();
    if (mode === "delete") {
      removeShape(shape.id);
      return;
    }
    setSelectedId(shape.id);
    const svg = svgRef.current;
    if (!svg) return;
    svg.style.userSelect = "none";
    svg.style.touchAction = "none";
    const pointer = getSvgPoint(evt, svg);
    if (shape.type === "rect" && shape.rect) {
      const offset = { dx: pointer.x - shape.rect.x, dy: pointer.y - shape.rect.y };
      setDrag({ type: "move-rect", id: shape.id, pointerId: evt.pointerId, origin: { ...shape.rect }, offset });
      (evt.currentTarget as SVGElement).setPointerCapture(evt.pointerId);
    } else if (shape.type === "circle" && shape.circle) {
      const offset = { dx: pointer.x - shape.circle.cx, dy: pointer.y - shape.circle.cy };
      setDrag({ type: "move-circle", id: shape.id, pointerId: evt.pointerId, origin: { ...shape.circle }, offset });
      (evt.currentTarget as SVGElement).setPointerCapture(evt.pointerId);
    } else if (shape.type === "triangle" && shape.triangle) {
      const points = toPointPairs(shape.triangle.points);
      setDrag({ type: "move-polygon", id: shape.id, pointerId: evt.pointerId, origin: points, start: pointer });
      (evt.currentTarget as SVGElement).setPointerCapture(evt.pointerId);
    } else if (shape.type === "polygon" && shape.polygon) {
      setDrag({ type: "move-polygon", id: shape.id, pointerId: evt.pointerId, origin: shape.polygon.points, start: pointer });
      (evt.currentTarget as SVGElement).setPointerCapture(evt.pointerId);
    }
  };

  const handleRectHandlePointerDown = (shapeId: string, handle: RectHandle, rect: { x: number; y: number; w: number; h: number }) =>
    (evt: React.PointerEvent<SVGCircleElement>) => {
      evt.stopPropagation();
      if (mode === "delete") return;
      const svg = svgRef.current;
      if (svg) {
        svg.style.userSelect = "none";
        svg.style.touchAction = "none";
      }
      setDrag({ type: "resize-rect", id: shapeId, pointerId: evt.pointerId, handle, origin: { ...rect } });
      (evt.currentTarget as SVGCircleElement).setPointerCapture(evt.pointerId);
    };

  const handleCircleRadiusPointerDown = (shapeId: string, circle: { cx: number; cy: number; r: number }) =>
    (evt: React.PointerEvent<SVGCircleElement>) => {
      evt.stopPropagation();
      if (mode === "delete") return;
      const svg = svgRef.current;
      if (svg) {
        svg.style.userSelect = "none";
        svg.style.touchAction = "none";
      }
      setDrag({ type: "circle-radius", id: shapeId, pointerId: evt.pointerId, origin: { ...circle } });
      (evt.currentTarget as SVGCircleElement).setPointerCapture(evt.pointerId);
    };

  const handleVertexPointerDown = (
    shapeId: string,
    vertexIndex: number,
    points: [number, number][]
  ) =>
    (evt: React.PointerEvent<SVGCircleElement>) => {
      evt.stopPropagation();
      if (mode === "delete") return;
      const svg = svgRef.current;
      if (svg) {
        svg.style.userSelect = "none";
        svg.style.touchAction = "none";
      }
      setDrag({ type: "vertex", id: shapeId, pointerId: evt.pointerId, vertexIndex, origin: points });
      (evt.currentTarget as SVGCircleElement).setPointerCapture(evt.pointerId);
    };

  const handleSvgPointerMove = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    if (mode === "delete") return;
    const pointer = getSvgPoint(evt, svg);
    const snapped = applySnapToPoint(pointer.x, pointer.y, { step: DEFAULT_GRID_STEP, shiftKey: evt.shiftKey, altKey: evt.altKey });

    switch (drag.type) {
      case "move-rect": {
        const dx = snapped.x - drag.origin.x - drag.offset.dx;
        const dy = snapped.y - drag.origin.y - drag.offset.dy;
        updateShape(drag.id, (shape) => {
          if (shape.type !== "rect" || !shape.rect) return shape;
          const rect = clampRect({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy }, { min: 0, max: 100 }, MIN_SIZE);
          return { ...shape, rect };
        });
        break;
      }
      case "move-circle": {
        const cx = snapped.x - drag.offset.dx;
        const cy = snapped.y - drag.offset.dy;
        updateShape(drag.id, (shape) => {
          if (shape.type !== "circle" || !shape.circle) return shape;
          const circle = clampCircle({ ...drag.origin, cx, cy }, { min: 0, max: 100 }, MIN_SIZE / 2);
          return { ...shape, circle };
        });
        break;
      }
      case "move-polygon": {
        const dx = snapped.x - drag.start.x;
        const dy = snapped.y - drag.start.y;
        updateShape(drag.id, (shape) => {
          if (shape.type === "triangle" && shape.triangle) {
            const moved = drag.origin.map(([px, py]) => clampPoint(px + dx, py + dy));
            const flattened = flattenPointPairs(moved.map(({ x, y }) => [x, y] as [number, number])) as [number, number, number, number, number, number];
            return { ...shape, triangle: { points: flattened } };
          }
          if (shape.type === "polygon" && shape.polygon) {
            const moved = drag.origin.map(([px, py]) => clampPoint(px + dx, py + dy));
            return { ...shape, polygon: { points: moved.map(({ x, y }) => [x, y] as [number, number]) as [number, number][] } };
          }
          return shape;
        });
        break;
      }
      case "resize-rect": {
        updateShape(drag.id, (shape) => resizeRectShape(shape, drag.handle, snapped, drag.origin));
        break;
      }
      case "circle-radius": {
        updateShape(drag.id, (shape) => resizeCircleShape(shape, snapped, drag.origin));
        break;
      }
      case "vertex": {
        updateShape(drag.id, (shape) => moveVertex(shape, drag.vertexIndex, snapped) as typeof shape);
        break;
      }
    }
  };

  const handleSvgPointerUp = () => {
    const svg = svgRef.current;
    if (svg) {
      svg.style.userSelect = "auto";
      svg.style.touchAction = "auto";
    }
    setDrag(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "edit" ? "default" : "outline"}
            onClick={() => setMode("edit")}
          >
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "delete" ? "destructive" : "outline"}
            onClick={() => setMode(mode === "delete" ? "edit" : "delete")}
          >
            {mode === "delete" ? "Exit delete" : "Delete shapes"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Allow multiple</Label>
          <input type="checkbox" checked={!!state.multi} onChange={(e) => setState({ ...state, multi: e.target.checked })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => addShape("rect")}>
            Add rectangle
          </Button>
          <Button variant="outline" onClick={() => addShape("circle")}>
            Add circle
          </Button>
          <Button variant="outline" onClick={() => addShape("triangle")}>
            Add triangle
          </Button>
          <Button variant="outline" onClick={() => addShape("polygon")}>
            Add polygon
          </Button>
          <Button
            variant="outline"
            onClick={handleAddSide}
            disabled={
              !selectedId ||
              !state.shapes.some((s) => s.id === selectedId && s.type === "polygon" && s.polygon)
            }
          >
            Add side
          </Button>
          <Button
            variant="outline"
            onClick={handleRemoveLastSide}
            disabled={
              !selectedId ||
              !state.shapes.some(
                (s) => s.id === selectedId && s.type === "polygon" && s.polygon && s.polygon.points.length > 4
              )
            }
          >
            Remove last side
          </Button>
        </div>
        <div className="space-y-2">
          {state.shapes.map((shape) => (
            <div key={shape.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!shape.correct} onChange={() => toggleCorrect(shape.id)} />
              <button
                type="button"
                className={`text-left flex-1 ${selectedId === shape.id ? "font-semibold text-blue-600" : ""}`}
                onClick={() => setSelectedId(shape.id)}
              >
                {shape.label || shape.type}
              </button>
              <Button size="sm" variant="outline" onClick={() => removeShape(shape.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {mode === "delete"
            ? "Delete mode: click any shape to remove it. Dragging is disabled."
            : "Drag shapes or handles to adjust. Hold Alt for 15-unit snapping, Shift for 5-unit snapping. Shapes stay within the canvas bounds."}
        </div>
      </div>
      <div className="relative flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          width={320}
          height={320}
          className="bg-white rounded-xl shadow-inner"
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
        >
          {state.shapes.map((shape) => renderShape({
            shape,
            selected: selectedId === shape.id,
            onPointerDownShape: handlePointerDownShape,
            onPointerDownRectHandle: handleRectHandlePointerDown,
            onPointerDownCircleRadius: handleCircleRadiusPointerDown,
            onPointerDownVertex: handleVertexPointerDown,
          }))}
        </svg>
      </div>
    </div>
  );
}

function renderShape({
  shape,
  selected,
  onPointerDownShape,
  onPointerDownRectHandle,
  onPointerDownCircleRadius,
  onPointerDownVertex,
}: {
  shape: VisualShapeSelect["shapes"][number];
  selected: boolean;
  onPointerDownShape: (shape: VisualShapeSelect["shapes"][number], evt: React.PointerEvent<SVGElement>) => void;
  onPointerDownRectHandle: (
    shapeId: string,
    handle: RectHandle,
    rect: { x: number; y: number; w: number; h: number }
  ) => (evt: React.PointerEvent<SVGCircleElement>) => void;
  onPointerDownCircleRadius: (
    shapeId: string,
    circle: { cx: number; cy: number; r: number }
  ) => (evt: React.PointerEvent<SVGCircleElement>) => void;
  onPointerDownVertex: (
    shapeId: string,
    idx: number,
    points: [number, number][]
  ) => (evt: React.PointerEvent<SVGCircleElement>) => void;
}) {
  switch (shape.type) {
    case "rect":
      if (!shape.rect) return null;
      return (
        <g key={shape.id}>
          <rect
            x={shape.rect.x}
            y={shape.rect.y}
            width={shape.rect.w}
            height={shape.rect.h}
            rx={shape.rect.rx}
            fill={shape.correct ? "#2563eb" : "#cbd5e1"}
            stroke={selected ? "#1d4ed8" : "#ffffff"}
            strokeWidth={selected ? 2 : 1}
            className="cursor-move"
            onPointerDown={(evt) => onPointerDownShape(shape, evt)}
          />
          {selected &&
            getRectHandles(shape.rect).map((handle) => (
              <circle
                key={`${shape.id}-${handle.name}`}
                cx={handle.x}
                cy={handle.y}
                r={1.6}
                className="fill-white stroke-blue-500 cursor-pointer"
                strokeWidth={1.2}
                onPointerDown={onPointerDownRectHandle(shape.id, handle.name as RectHandle, shape.rect!)}
                aria-label={`Rectangle ${handle.name} handle`}
              />
            ))}
        </g>
      );
    case "circle":
      if (!shape.circle) return null;
      return (
        <g key={shape.id}>
          <circle
            cx={shape.circle.cx}
            cy={shape.circle.cy}
            r={shape.circle.r}
            fill={shape.correct ? "#2563eb" : "#cbd5e1"}
            stroke={selected ? "#1d4ed8" : "#ffffff"}
            strokeWidth={selected ? 2 : 1}
            className="cursor-move"
            onPointerDown={(evt) => onPointerDownShape(shape, evt)}
          />
          {selected && (
            <g>
              <circle
                cx={shape.circle.cx}
                cy={shape.circle.cy}
                r={1.6}
                className="fill-white stroke-blue-500 cursor-pointer"
                strokeWidth={1.2}
                aria-label="Circle center"
                onPointerDown={(evt) => onPointerDownShape(shape, evt)}
              />
              <circle
                cx={shape.circle.cx + shape.circle.r}
                cy={shape.circle.cy}
                r={1.6}
                className="fill-white stroke-blue-500 cursor-pointer"
                strokeWidth={1.2}
                aria-label="Circle radius"
                onPointerDown={onPointerDownCircleRadius(shape.id, shape.circle)}
              />
            </g>
          )}
        </g>
      );
    case "triangle":
      if (!shape.triangle) return null;
      const triPoints = toPointPairs(shape.triangle.points);
      return renderPolygonShape({
        shape,
        points: triPoints,
        selected,
        onPointerDownShape,
        onPointerDownVertex,
      });
    case "polygon":
      if (!shape.polygon) return null;
      return renderPolygonShape({
        shape,
        points: shape.polygon.points,
        selected,
        onPointerDownShape,
        onPointerDownVertex,
      });
    default:
      return null;
  }
}

function renderPolygonShape({
  shape,
  points,
  selected,
  onPointerDownShape,
  onPointerDownVertex,
}: {
  shape: VisualShapeSelect["shapes"][number];
  points: [number, number][];
  selected: boolean;
  onPointerDownShape: (shape: VisualShapeSelect["shapes"][number], evt: React.PointerEvent<SVGElement>) => void;
  onPointerDownVertex: (
    shapeId: string,
    idx: number,
    points: [number, number][]
  ) => (evt: React.PointerEvent<SVGCircleElement>) => void;
}) {
  const path = points.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <g key={shape.id}>
      <polygon
        points={path}
        fill={shape.correct ? "#2563eb" : "#cbd5e1"}
        stroke={selected ? "#1d4ed8" : "#ffffff"}
        strokeWidth={selected ? 2 : 1}
        className="cursor-move"
        onPointerDown={(evt) => onPointerDownShape(shape, evt)}
      />
      {selected &&
        points.map(([x, y], idx) => (
          <circle
            key={`${shape.id}-vertex-${idx}`}
            cx={x}
            cy={y}
            r={1.6}
            className="fill-white stroke-blue-500 cursor-pointer"
            strokeWidth={1.2}
            aria-label={`Vertex ${idx + 1}`}
            onPointerDown={onPointerDownVertex(shape.id, idx, points)}
          />
        ))}
    </g>
  );
}

function addPolygonSide(points: [number, number][]) {
  if (points.length < 2) {
    return points;
  }
  const last = points[points.length - 1];
  const first = points[0];
  const midX = (last[0] + first[0]) / 2;
  const midY = (last[1] + first[1]) / 2;
  const edgeDx = first[0] - last[0];
  const edgeDy = first[1] - last[1];
  const length = Math.hypot(edgeDx, edgeDy) || 1;
  const normalX = -edgeDy / length;
  const normalY = edgeDx / length;
  const offset = 12;
  const candidateX = midX + normalX * offset;
  const candidateY = midY + normalY * offset;
  const clamped = clampPoint(candidateX, candidateY);
  return [...points, [clamped.x, clamped.y]];
}

function removePolygonSide(points: [number, number][]) {
  if (points.length <= 1) {
    return points;
  }
  return points.slice(0, -1);
}

function resizeRectShape(
  shape: VisualShapeSelect["shapes"][number],
  handle: RectHandle,
  snapped: { x: number; y: number },
  origin: { x: number; y: number; w: number; h: number }
) {
  if (shape.type !== "rect" || !shape.rect) return shape;
  let { x, y, w, h } = origin;
  const maxX = origin.x + origin.w;
  const maxY = origin.y + origin.h;

  switch (handle) {
    case "tl":
      x = Math.min(snapped.x, maxX - MIN_SIZE);
      y = Math.min(snapped.y, maxY - MIN_SIZE);
      w = maxX - x;
      h = maxY - y;
      break;
    case "tr":
      y = Math.min(snapped.y, maxY - MIN_SIZE);
      w = Math.max(MIN_SIZE, snapped.x - origin.x);
      h = maxY - y;
      break;
    case "bl":
      x = Math.min(snapped.x, maxX - MIN_SIZE);
      w = maxX - x;
      h = Math.max(MIN_SIZE, snapped.y - origin.y);
      break;
    case "br":
      w = Math.max(MIN_SIZE, snapped.x - origin.x);
      h = Math.max(MIN_SIZE, snapped.y - origin.y);
      break;
    case "top":
      y = Math.min(snapped.y, maxY - MIN_SIZE);
      h = maxY - y;
      break;
    case "bottom":
      h = Math.max(MIN_SIZE, snapped.y - origin.y);
      break;
    case "left":
      x = Math.min(snapped.x, maxX - MIN_SIZE);
      w = maxX - x;
      break;
    case "right":
      w = Math.max(MIN_SIZE, snapped.x - origin.x);
      break;
  }

  const rect = clampRect({ x, y, w, h }, { min: 0, max: 100 }, MIN_SIZE);
  return { ...shape, rect };
}

function resizeCircleShape(
  shape: VisualShapeSelect["shapes"][number],
  point: { x: number; y: number },
  origin: { cx: number; cy: number; r: number }
) {
  if (shape.type !== "circle" || !shape.circle) return shape;
  const dx = point.x - origin.cx;
  const dy = point.y - origin.cy;
  const newRadius = Math.max(MIN_SIZE / 2, Math.hypot(dx, dy));
  const circle = clampCircle({ cx: origin.cx, cy: origin.cy, r: newRadius }, { min: 0, max: 100 }, MIN_SIZE / 2);
  return { ...shape, circle };
}

function moveVertex(
  shape: VisualShapeSelect["shapes"][number],
  vertexIndex: number,
  point: { x: number; y: number }
) {
  if (shape.type === "triangle" && shape.triangle) {
    const points = [...shape.triangle.points];
    const clamped = clampPoint(point.x, point.y);
    points[vertexIndex * 2] = clamped.x;
    points[vertexIndex * 2 + 1] = clamped.y;
    return { ...shape, triangle: { points } };
  }
  if (shape.type === "polygon" && shape.polygon) {
    const points = [...shape.polygon.points] as [number, number][];
    const clamped = clampPoint(point.x, point.y);
    points[vertexIndex] = [clamped.x, clamped.y];
    return { ...shape, polygon: { points } };
  }
  return shape;
}

function getRectHandles(rect: { x: number; y: number; w: number; h: number }) {
  const { x, y, w, h } = rect;
  const maxX = x + w;
  const maxY = y + h;
  const midX = x + w / 2;
  const midY = y + h / 2;
  return [
    { name: "tl", x, y },
    { name: "tr", x: maxX, y },
    { name: "bl", x, y: maxY },
    { name: "br", x: maxX, y: maxY },
    { name: "top", x: midX, y },
    { name: "bottom", x: midX, y: maxY },
    { name: "left", x, y: midY },
    { name: "right", x: maxX, y: midY },
  ];
}

function getSvgPoint(evt: React.PointerEvent<Element>, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100;
  const y = ((evt.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

function toPointPairs(flat: number[]) {
  const pairs: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) {
    pairs.push([flat[i], flat[i + 1]]);
  }
  return pairs;
}

function flattenPointPairs(points: [number, number][]) {
  const flat: number[] = [];
  points.forEach(([px, py]) => flat.push(px, py));
  return flat;
}
