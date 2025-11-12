export type VisualPie = {
  subtype: "pie";
  multi?: boolean;
  baseCorrect?: boolean;
  showFractionLabel?: boolean;
  segments: { id: string; value: number; label?: string; colored?: boolean }[];
  variants?: {
    id: string;
    segments: { id: string; value: number; label?: string; colored?: boolean }[];
    correct?: boolean;
  }[];
};

export type VisualGrid = {
  subtype: "grid";
  rows: number;
  cols: number;
  correctCells?: string[];     // pattern mode
  requiredCount?: number;      // count mode
  multi: true;                 // student can toggle many cells
};

export type VisualShapeSelect = {
  subtype: "shape_select";
  multi?: boolean;
  shapes: {
    id: string;
    type: "rect" | "circle" | "triangle" | "polygon";
    rect?: { x: number; y: number; w: number; h: number; rx?: number };
    circle?: { cx: number; cy: number; r: number };
    triangle?: { points: [number, number, number, number, number, number] };
    polygon?: { points: [number, number][] };
    label?: string;
    correct?: boolean;
  }[];
};

export type VisualLineRelation = {
  subtype: "line_relation";
  target: "parallel" | "perpendicular";
  multi?: true;
  pairs: {
    id: string;
    a: { x1: number; y1: number; x2: number; y2: number };
    b: { x1: number; y1: number; x2: number; y2: number };
    relation?: "parallel" | "perpendicular";
  }[];
};

export type VisualAngle = {
  subtype: "angle";
  multi?: boolean;
  baseCorrect?: boolean;
  aDeg: number;          // static ray A, authoring preview only
  bDeg: number;          // static ray B, authoring preview only
  targetDeg: number;     // correct numeric answer
  toleranceDeg: number;  // accepted absolute error in degrees
  variants?: {
    id: string;
    aDeg: number;
    bDeg: number;
    targetDeg: number;
    toleranceDeg: number;
    correct?: boolean;
  }[];
};

export type VisualUnion =
  | VisualPie
  | VisualGrid
  | VisualShapeSelect
  | VisualLineRelation
  | VisualAngle;
