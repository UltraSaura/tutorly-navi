"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { VisualLineRelation } from "@/lib/quiz/visual-types";
import {
  angleDifferenceDeg,
  classifyRelation,
  DEFAULT_GRID_STEP,
  distanceToSegment,
  lengthOfSegment,
  segmentAngleDeg,
  snapAngle,
  snapCoordinate,
} from "@/lib/quiz/visual-geometry";

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

type DragHandle = {
  pairId: string;
  line: "a" | "b";
  handle: 1 | 2;
  pointerId: number;
  origin: { x1: number; y1: number; x2: number; y2: number };
};

type DraftPair = {
  stage: "A1" | "A2" | "B1" | "B2";
  a: { x1: number; y1: number; x2: number; y2: number };
  b: { x1: number; y1: number; x2: number; y2: number };
};

const MIN_SEGMENT_LENGTH = 2;
const DEFAULT_DELETE_TOLERANCE = 2.5; // SVG units

export default function LineEditor({
  state,
  setState,
}: {
  state: VisualLineRelation;
  setState: (s: VisualLineRelation) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<"create" | "delete">("create");
  const [drag, setDrag] = useState<DragHandle | null>(null);
  const [draft, setDraft] = useState<DraftPair | null>(null);
  const [hoverPairId, setHoverPairId] = useState<string | null>(null);
  const [hoverLine, setHoverLine] = useState<"a" | "b" | null>(null);
  const [toleranceDeg, setToleranceDeg] = useState(5);
  const [segmentAngleLabel, setSegmentAngleLabel] = useState<string | null>(null);
  const [segmentAngleCoords, setSegmentAngleCoords] = useState<{ x: number; y: number } | null>(null);
  const [angleBetweenLabel, setAngleBetweenLabel] = useState<string | null>(null);
  const [angleBetweenCoords, setAngleBetweenCoords] = useState<{ x: number; y: number } | null>(null);
  const [lengthWarning, setLengthWarning] = useState<string | null>(null);
  const [deleteTolerance, setDeleteTolerance] = useState(DEFAULT_DELETE_TOLERANCE);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(state.pairs[0]?.id ?? null);

  useEffect(() => {
    if (!selectedPairId || !state.pairs.some((pair) => pair.id === selectedPairId)) {
      setSelectedPairId(state.pairs[0]?.id ?? null);
    }
  }, [selectedPairId, state.pairs]);

  const hint = useMemo(() => {
    if (mode === "delete") {
      return "Delete mode: click near a segment to remove it. Dragging is disabled.";
    }
    if (!draft) return "Create mode: click to place the first point of line A.";
    switch (draft.stage) {
      case "A2":
        return "Click to place the second point of line A.";
      case "B1":
        return "Click to place the first point of line B.";
      case "B2":
        return "Click to place the second point of line B.";
      default:
        return "";
    }
  }, [mode, draft]);

  const commitRelation = (pairId: string, pair = state.pairs.find((p) => p.id === pairId)) => {
    if (!pair) return;
    const lengthA = lengthOfSegment(pair.a.x1, pair.a.y1, pair.a.x2, pair.a.y2);
    const lengthB = lengthOfSegment(pair.b.x1, pair.b.y1, pair.b.x2, pair.b.y2);
    if (lengthA < MIN_SEGMENT_LENGTH || lengthB < MIN_SEGMENT_LENGTH) {
      setLengthWarning("Length too short for detection. Make the line longer.");
      updatePair(pairId, { relation: undefined });
      return;
    }
    setLengthWarning(null);
    const nextRelation = classifyRelation(pair, toleranceDeg);
    updatePair(pairId, { relation: nextRelation });
  };

  const updatePairs = (updater: (pair: VisualLineRelation["pairs"][number]) => VisualLineRelation["pairs"][number]) => {
    setState({
      ...state,
      pairs: state.pairs.map((pair) => updater(pair)),
    });
  };

  const updatePair = (id: string, patch: Partial<VisualLineRelation["pairs"][number]>) => {
    setState({
      ...state,
      pairs: state.pairs.map((pair) => (pair.id === id ? { ...pair, ...patch } : pair)),
    });
  };

  const removePair = (id: string) => {
    const next = state.pairs.filter((pair) => pair.id !== id);
    setState({ ...state, pairs: next });
    if (selectedPairId === id) {
      setSelectedPairId(next[0]?.id ?? null);
    }
  };

  const updateSegmentPoint = (
    id: string,
    line: "a" | "b",
    point: 1 | 2,
    coords: { x: number; y: number }
  ) => {
    setState({
      ...state,
      pairs: state.pairs.map((pair) => {
        if (pair.id !== id) return pair;
        const segment = pair[line];
        const updated = {
          ...segment,
          ...(point === 1 ? { x1: coords.x, y1: coords.y } : { x2: coords.x, y2: coords.y }),
        };
        return { ...pair, [line]: updated };
      }),
    });
  };

  const handlePointerDownHandle = (pairId: string, line: "a" | "b", handle: 1 | 2) => (evt: React.PointerEvent<SVGCircleElement>) => {
    if (mode === "delete") return;
    evt.preventDefault();
    evt.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pair = state.pairs.find((p) => p.id === pairId);
    if (!pair) return;
    const segment = pair[line];
    (evt.currentTarget as SVGCircleElement).setPointerCapture(evt.pointerId);
    setSelectedPairId(pairId);
    setDrag({
      pairId,
      line,
      handle,
      pointerId: evt.pointerId,
      origin: { ...segment },
    });
    svg.style.userSelect = "none";
    svg.style.touchAction = "none";
  };

  const handlePointerMove = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = toViewCoords(evt, svg);
    const pair = state.pairs.find((p) => p.id === drag.pairId);
    if (!pair) return;
    const segment = pair[drag.line];
    const anchor = drag.handle === 1 ? { x: segment.x2, y: segment.y2 } : { x: segment.x1, y: segment.y1 };

    let target = {
      x: snapCoordinate(x, { step: DEFAULT_GRID_STEP, shiftKey: evt.shiftKey, altKey: evt.altKey }),
      y: snapCoordinate(y, { step: DEFAULT_GRID_STEP, shiftKey: evt.shiftKey, altKey: evt.altKey }),
    };

    const dx = target.x - anchor.x;
    const dy = target.y - anchor.y;
    const length = Math.hypot(dx, dy);

    if (length > 0.0001 && (evt.altKey || evt.shiftKey)) {
      const angle = segmentAngleDeg(anchor.x, anchor.y, target.x, target.y);
      const snappedAngle = snapAngle(angle, { altKey: evt.altKey, shiftKey: evt.shiftKey });
      const radians = (snappedAngle * Math.PI) / 180;
      target = {
        x: anchor.x + length * Math.cos(radians),
        y: anchor.y - length * Math.sin(radians),
      };
    }

    const nextPairs = state.pairs.map((existing) => {
      if (existing.id !== drag.pairId) return existing;
      const seg = existing[drag.line];
      const updated = {
        ...seg,
        ...(drag.handle === 1 ? { x1: target.x, y1: target.y } : { x2: target.x, y2: target.y }),
      };
      return { ...existing, [drag.line]: updated };
    });
    setState({ ...state, pairs: nextPairs });

    const updatedPair = nextPairs.find((p) => p.id === drag.pairId);
    if (updatedPair) {
      const seg = updatedPair[drag.line];
      const angle = segmentAngleDeg(seg.x1, seg.y1, seg.x2, seg.y2);
      setSegmentAngleLabel(`${Math.round(angle)}°`);
      setSegmentAngleCoords(target);

      const lenA = lengthOfSegment(updatedPair.a.x1, updatedPair.a.y1, updatedPair.a.x2, updatedPair.a.y2);
      const lenB = lengthOfSegment(updatedPair.b.x1, updatedPair.b.y1, updatedPair.b.x2, updatedPair.b.y2);
      if (lenA < MIN_SEGMENT_LENGTH || lenB < MIN_SEGMENT_LENGTH) {
        setLengthWarning("Length too short for detection. Make the line longer.");
      } else {
        setLengthWarning(null);
      }

      if (drag.line === "b") {
        const angleA = segmentAngleDeg(updatedPair.a.x1, updatedPair.a.y1, updatedPair.a.x2, updatedPair.a.y2);
        const angleB = segmentAngleDeg(updatedPair.b.x1, updatedPair.b.y1, updatedPair.b.x2, updatedPair.b.y2);
        setAngleBetweenLabel(`${Math.round(angleDifferenceDeg(angleA, angleB))}°`);
        const midA = {
          x: (updatedPair.a.x1 + updatedPair.a.x2) / 2,
          y: (updatedPair.a.y1 + updatedPair.a.y2) / 2,
        };
        const midB = {
          x: (updatedPair.b.x1 + updatedPair.b.x2) / 2,
          y: (updatedPair.b.y1 + updatedPair.b.y2) / 2,
        };
        setAngleBetweenCoords({
          x: (midA.x + midB.x) / 2,
          y: (midA.y + midB.y) / 2,
        });
      } else {
        setAngleBetweenLabel(null);
      }
    }
  };

  const handlePointerUp = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const svg = svgRef.current;
    if (svg) {
      svg.style.userSelect = "auto";
      svg.style.touchAction = "auto";
    }
    commitRelation(drag.pairId);
    setDrag(null);
    setSegmentAngleLabel(null);
    setAngleBetweenLabel(null);
  };

  const handleSvgPointerDown = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y } = toViewCoords(evt, svg);
    const point = {
      x: snapCoordinate(x, { step: DEFAULT_GRID_STEP }),
      y: snapCoordinate(y, { step: DEFAULT_GRID_STEP }),
    };

    if (mode === "delete") {
      const clicked = findPairNearPoint(point.x, point.y, deleteTolerance);
      if (clicked) {
        removePair(clicked.pairId);
      }
      return;
    }

    // create mode
    setDraft((prev) => {
      if (!prev) {
        return {
          stage: "A2",
          a: { x1: point.x, y1: point.y, x2: point.x, y2: point.y },
          b: { x1: point.x, y1: point.y, x2: point.x, y2: point.y },
        };
      }
      if (prev.stage === "A2") {
        return {
          ...prev,
          stage: "B1",
          a: { ...prev.a, x2: point.x, y2: point.y },
        };
      }
      if (prev.stage === "B1") {
        return {
          ...prev,
          stage: "B2",
          b: { ...prev.b, x1: point.x, y1: point.y },
        };
      }
      // B2 -> finalize
      const newPair = {
        id: uuid(),
        a: { ...prev.a, x2: prev.stage === "B2" ? prev.a.x2 : prev.a.x2 },
        b: { ...prev.b, x2: point.x, y2: point.y },
        relation: undefined as VisualLineRelation["pairs"][number]["relation"],
      };
      const completed = {
        ...state,
        pairs: [...state.pairs, newPair],
      };
      setState(completed);
      setSelectedPairId(newPair.id);
      setTimeout(() => commitRelation(newPair.id), 0);
      return null;
    });
  };

  const handleSvgPointerMove = (evt: React.PointerEvent<SVGSVGElement>) => {
    handlePointerMove(evt);
    if (mode === "delete") {
      if (drag) return;
      const svg = svgRef.current;
      if (!svg) return;
      const { x, y } = toViewCoords(evt, svg);
      const hovered = findPairNearPoint(x, y);
      setHoverPairId(hovered?.pairId ?? null);
      setHoverLine(hovered?.line ?? null);
    }
  };

  const handleSvgPointerUp = (evt: React.PointerEvent<SVGSVGElement>) => {
    handlePointerUp(evt);
  };

  const findPairNearPoint = (x: number, y: number, tolerance = deleteTolerance) => {
    let match: { pairId: string; line: "a" | "b" } | undefined;
    state.pairs.forEach((pair) => {
      const distA = distanceToSegment(x, y, pair.a.x1, pair.a.y1, pair.a.x2, pair.a.y2);
      const distB = distanceToSegment(x, y, pair.b.x1, pair.b.y1, pair.b.x2, pair.b.y2);
      if (distA < tolerance) match = { pairId: pair.id, line: "a" };
      if (distB < tolerance) match = { pairId: pair.id, line: "b" };
    });
    return match;
  };

  const renderLineGroup = (pair: VisualLineRelation["pairs"][number]) => {
    const isHover = hoverPairId === pair.id;
    const strokeWidth = isHover ? 2.8 : 2;
    const relation = pair.relation ?? "unknown";
    const angleText = `${Math.round(angleDifferenceDeg(segmentAngleDeg(pair.a.x1, pair.a.y1, pair.a.x2, pair.a.y2), segmentAngleDeg(pair.b.x1, pair.b.y1, pair.b.x2, pair.b.y2)))}°`;
    const isSelected = selectedPairId === pair.id;

    return (
      <g key={pair.id} onPointerDown={() => setSelectedPairId(pair.id)}>
        <line
          x1={pair.a.x1}
          y1={pair.a.y1}
          x2={pair.a.x2}
          y2={pair.a.y2}
          stroke={relation === "parallel" ? "#2563eb" : "#9ca3af"}
          strokeWidth={isSelected ? strokeWidth + 0.8 : strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={pair.b.x1}
          y1={pair.b.y1}
          x2={pair.b.x2}
          y2={pair.b.y2}
          stroke={relation === "perpendicular" ? "#f97316" : "#9ca3af"}
          strokeWidth={isSelected ? strokeWidth + 0.8 : strokeWidth}
          strokeLinecap="round"
        />
        {renderHandle(pair.id, "a", 1, pair.a.x1, pair.a.y1)}
        {renderHandle(pair.id, "a", 2, pair.a.x2, pair.a.y2)}
        {renderHandle(pair.id, "b", 1, pair.b.x1, pair.b.y1)}
        {renderHandle(pair.id, "b", 2, pair.b.x2, pair.b.y2)}
        <text x={(pair.a.x2 + pair.b.x2) / 2} y={(pair.a.y2 + pair.b.y2) / 2} textAnchor="middle" fontSize={5} fill="#6b7280">
          {relation ? relation : angleText}
        </text>
      </g>
    );
  };

  const renderHandle = (
    pairId: string,
    line: "a" | "b",
    handle: 1 | 2,
    x: number,
    y: number
  ) => (
    <circle
      key={`${pairId}-${line}-${handle}`}
      cx={x}
      cy={y}
      r={2.5}
      className="cursor-pointer fill-white stroke-blue-500"
      strokeWidth={1.5}
      onPointerDown={handlePointerDownHandle(pairId, line, handle)}
      aria-label={`Line ${line.toUpperCase()} endpoint ${handle}`}
    />
  );

  const draftPreview = () => {
    if (!draft) return null;
    return (
      <g>
        <line
          x1={draft.a.x1}
          y1={draft.a.y1}
          x2={draft.a.x2}
          y2={draft.a.y2}
          stroke="#93c5fd"
          strokeDasharray="4 2"
          strokeWidth={2}
        />
        {draft.stage !== "A2" && (
          <line
            x1={draft.b.x1}
            y1={draft.b.y1}
            x2={draft.b.x2}
            y2={draft.b.y2}
            stroke="#fde68a"
            strokeDasharray="4 2"
            strokeWidth={2}
          />
        )}
      </g>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "create" ? "default" : "outline"}
            onClick={() => {
              setMode("create");
              setHoverPairId(null);
            }}
          >
            Create pairs
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "delete" ? "default" : "outline"}
            onClick={() => {
              setMode(mode === "delete" ? "create" : "delete");
              setDraft(null);
            }}
          >
            {mode === "delete" ? "Exit delete" : "Delete mode"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">Allow multiple answers</Label>
          <input
            type="checkbox"
            checked={!!state.multi}
            onChange={(e) => setState({ ...state, multi: e.target.checked })}
          />
        </div>

        <div className="space-y-2 border rounded-md p-2 max-h-60 overflow-auto">
          <div className="text-xs font-medium text-muted-foreground">Line pairs</div>
          {state.pairs.length === 0 && (
            <div className="text-xs text-muted-foreground">No pairs yet. Use the canvas to add lines.</div>
          )}
          {state.pairs.map((pair, index) => (
            <div
              key={pair.id}
              className={`flex items-center justify-between rounded-md px-2 py-1 text-sm transition ${
                selectedPairId === pair.id ? "bg-blue-50 text-blue-700" : "hover:bg-muted/60"
              }`}
              onClick={() => setSelectedPairId(pair.id)}
            >
              <span>
                Pair {index + 1} · {pair.relation ?? "unclassified"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    commitRelation(pair.id);
                  }}
                >
                  Recompute
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePair(pair.id);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Tolerance (deg)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={toleranceDeg}
              onChange={(e) => setToleranceDeg(parseFloat(e.target.value || "0") || 5)}
            />
          </div>
          <div>
            <Label>Delete hit tolerance</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={deleteTolerance}
              onChange={(e) =>
                setDeleteTolerance(parseFloat(e.target.value || "0") || DEFAULT_DELETE_TOLERANCE)
              }
            />
          </div>
        </div>
        <div>
          <Label>Snap step</Label>
          <Input type="number" disabled value={DEFAULT_GRID_STEP} />
        </div>

        <div>
          <Label>Target relation</Label>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={state.target === "parallel"}
                onChange={() => setState({ ...state, target: "parallel" })}
              />
              Parallel
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={state.target === "perpendicular"}
                onChange={() => setState({ ...state, target: "perpendicular" })}
              />
              Perpendicular
            </label>
          </div>
        </div>

        <div className="bg-muted/40 rounded-md p-3 text-xs text-muted-foreground" role="status">
          {hint}
        </div>
        {lengthWarning && (
          <div className="text-xs text-amber-600">{lengthWarning}</div>
        )}

      </div>

      <div className="relative flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="-50 -50 100 100"
          width={300}
          height={300}
          className="bg-white rounded-xl shadow-inner"
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={() => {
            setHoverPairId(null);
            setHoverLine(null);
          }}
        >
          {state.pairs.map((pair) => renderLineGroup(pair))}
          {draftPreview()}
          {segmentAngleLabel && segmentAngleCoords && (
            <text x={segmentAngleCoords.x} y={segmentAngleCoords.y - 3} textAnchor="middle" fontSize={4} fill="#1d4ed8">
              {segmentAngleLabel}
            </text>
          )}
          {angleBetweenLabel && angleBetweenCoords && (
            <text x={angleBetweenCoords.x} y={angleBetweenCoords.y} textAnchor="middle" fontSize={5} fill="#f97316">
              {angleBetweenLabel}
            </text>
          )}
          {mode === "delete" && hoverPairId && hoverLine && (
            <text
              x={0}
              y={-46}
              textAnchor="middle"
              fontSize={4}
              fill="#dc2626"
            >
              Click to delete pair {hoverPairId.slice(0, 4)}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

function toViewCoords(evt: React.PointerEvent<SVGSVGElement>, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100 - 50;
  const y = ((evt.clientY - rect.top) / rect.height) * 100 - 50;
  return { x, y };
}
