export type GraduatedNumberLineMode = 'read_point_value' | 'place_value' | 'order_values';
export type NumberLineSnapMode = 'tick' | 'free' | 'majorTick' | 'minorTick';
export interface GraduatedNumberLineLine { start: number; end: number; subdivisions: number; visibleLabels?: number[]; }
export interface GraduatedNumberLineItem { id: string; label: string; value: number | string; displayValue?: string; tolerance?: number; acceptedAnswers?: string[]; }
export interface GraduatedNumberLineConfiguration { id: string; mode: GraduatedNumberLineMode; title: string; instruction: string; line: GraduatedNumberLineLine; items: GraduatedNumberLineItem[]; skillTags: string[]; snapMode?: NumberLineSnapMode; validPositions?: number[]; }
export interface GraduatedNumberLineResult { activityId: string; mode: GraduatedNumberLineMode; status: 'correct' | 'incorrect' | 'partial'; attempts: number; items: Array<{ id: string; correct: boolean }>; errors: string[]; skillTags: string[]; timestamp: string; }
