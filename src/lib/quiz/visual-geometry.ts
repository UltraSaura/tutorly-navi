export interface SnapOptions {
  step?: number;
  shiftKey?: boolean;
  altKey?: boolean;
}

export const DEFAULT_GRID_STEP = 5;
const DEGREE_SNAP_SHIFT = 5;
const DEGREE_SNAP_ALT = 15;

export function snapCoordinate(value: number, options: SnapOptions = {}): number {
  let step = options.step ?? DEFAULT_GRID_STEP;
  if (options.altKey) step = 15;
  else if (options.shiftKey) step = 1;
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function snapAngle(angle: number, options: SnapOptions = {}): number {
  let snap = 0;
  if (options.shiftKey) snap = DEGREE_SNAP_SHIFT;
  else if (options.altKey) snap = DEGREE_SNAP_ALT;
  if (snap <= 0) return normalizeAngle(angle);
  return normalizeAngle(Math.round(angle / snap) * snap);
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function angleDifferenceDeg(a: number, b: number): number {
  const diff = normalizeAngle(a) - normalizeAngle(b);
  const wrapped = ((diff + 180) % 360) - 180;
  return Math.abs(wrapped);
}

export function segmentAngleDeg(x1: number, y1: number, x2: number, y2: number): number {
  // y axis upward for math
  const dx = x2 - x1;
  const dy = -(y2 - y1);
  const radians = Math.atan2(dy, dx);
  return normalizeAngle((radians * 180) / Math.PI);
}

export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  if (t < 0) return Math.hypot(px - x1, py - y1);
  if (t > 1) return Math.hypot(px - x2, py - y2);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export interface LineRelationPair {
  a: { x1: number; y1: number; x2: number; y2: number };
  b: { x1: number; y1: number; x2: number; y2: number };
}

export function classifyRelation(pair: LineRelationPair, tolerance: number): "parallel" | "perpendicular" | undefined {
  const angleA = segmentAngleDeg(pair.a.x1, pair.a.y1, pair.a.x2, pair.a.y2);
  const angleB = segmentAngleDeg(pair.b.x1, pair.b.y1, pair.b.x2, pair.b.y2);

  const diff = angleDifferenceDeg(angleA, angleB);
  const diffPerp = Math.abs(diff - 90);
  const diffParallel = Math.min(diff, Math.abs(diff - 180));

  if (diffParallel <= tolerance) return "parallel";
  if (diffPerp <= tolerance) return "perpendicular";
  return undefined;
}

export function lengthOfSegment(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clampRect(rect: { x: number; y: number; w: number; h: number }, bounds = { min: 0, max: 100 }, minSize = 2) {
  const clamped = { ...rect };
  if (clamped.w < minSize) clamped.w = minSize;
  if (clamped.h < minSize) clamped.h = minSize;
  if (clamped.x < bounds.min) clamped.x = bounds.min;
  if (clamped.y < bounds.min) clamped.y = bounds.min;
  if (clamped.x + clamped.w > bounds.max) clamped.x = bounds.max - clamped.w;
  if (clamped.y + clamped.h > bounds.max) clamped.y = bounds.max - clamped.h;
  return clamped;
}

export function clampCircle(circle: { cx: number; cy: number; r: number }, bounds = { min: 0, max: 100 }, minRadius = 1) {
  const clamped = { ...circle };
  if (clamped.r < minRadius) clamped.r = minRadius;
  if (clamped.cx - clamped.r < bounds.min) clamped.cx = bounds.min + clamped.r;
  if (clamped.cy - clamped.r < bounds.min) clamped.cy = bounds.min + clamped.r;
  if (clamped.cx + clamped.r > bounds.max) clamped.cx = bounds.max - clamped.r;
  if (clamped.cy + clamped.r > bounds.max) clamped.cy = bounds.max - clamped.r;
  return clamped;
}

export function clampPoint(x: number, y: number, bounds = { min: 0, max: 100 }): { x: number; y: number } {
  const clamp = (v: number) => Math.min(bounds.max, Math.max(bounds.min, v));
  return { x: clamp(x), y: clamp(y) };
}

export function applySnapToPoint(x: number, y: number, options: SnapOptions = {}): { x: number; y: number } {
  return {
    x: snapCoordinate(x, options),
    y: snapCoordinate(y, options),
  };
}

export function polygonMinSize(points: [number, number][], minSize = 2): [number, number][] {
  return points.map(([x, y]) => [clampRange(x, minSize), clampRange(y, minSize)]) as [number, number][];
}

function clampRange(value: number, minSize: number) {
  const min = 0 + minSize * 0.5;
  const max = 100 - minSize * 0.5;
  return Math.min(max, Math.max(min, value));
}

export function getSvgPoint(evt: React.PointerEvent<SVGSVGElement>, svg: SVGSVGElement | null) {
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100;
  const y = ((evt.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}
