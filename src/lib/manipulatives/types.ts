export type ManipulativeKind =
  | 'number_line'
  | 'counters'
  | 'array'
  | 'fraction_bar'
  | 'place_value'
  | 'balance_scale'
  | 'geometry_canvas';

export type ManipulativeSurface = 'learn' | 'tutor' | 'practice';

export interface ManipulativeInteraction {
  kind: ManipulativeKind;
  value?: number;
  values?: number[];
  correct?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface NumberLineManipulativeConfig { kind: 'number_line'; min: number; max: number; value?: number; step?: number; }
export interface CountersManipulativeConfig { kind: 'counters'; count?: number; max?: number; groups?: number; }
export interface ArrayManipulativeConfig { kind: 'array'; rows?: number; columns?: number; maxRows?: number; maxColumns?: number; }
export interface FractionBarManipulativeConfig { kind: 'fraction_bar'; numerator?: number; denominator?: number; maxDenominator?: number; }
export interface PlaceValueManipulativeConfig { kind: 'place_value'; value?: number; maxValue?: number; }
export interface BalanceScaleManipulativeConfig { kind: 'balance_scale'; left?: number; right?: number; target?: number; }
export interface GeometryCanvasManipulativeConfig { kind: 'geometry_canvas'; shape?: 'triangle' | 'rectangle' | 'square'; width?: number; height?: number; }

export type ManipulativeConfig =
  | NumberLineManipulativeConfig
  | CountersManipulativeConfig
  | ArrayManipulativeConfig
  | FractionBarManipulativeConfig
  | PlaceValueManipulativeConfig
  | BalanceScaleManipulativeConfig
  | GeometryCanvasManipulativeConfig;
