import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ManipulativeRenderer } from '@/components/manipulatives/ManipulativeRenderer';
import type { ManipulativeConfig, ManipulativeInteraction } from '@/lib/manipulatives/types';
import type { PracticeActivityRendererProps } from '../activityRegistry';

function parseConfig(configuration: Record<string, unknown>): ManipulativeConfig | null {
  const manipulative = configuration.manipulative;
  if (!manipulative || typeof manipulative !== 'object') return null;
  const config = manipulative as Record<string, unknown>;
  switch (config.kind) {
    case 'number_line': return { kind: 'number_line', min: Number(config.min ?? 0), max: Number(config.max ?? 20), value: Number(config.value ?? 0), step: Number(config.step ?? 1) };
    case 'counters': return { kind: 'counters', count: Number(config.count ?? 0), max: Number(config.max ?? 20) };
    case 'array': return { kind: 'array', rows: Number(config.rows ?? 2), columns: Number(config.columns ?? 2), maxRows: Number(config.maxRows ?? 10), maxColumns: Number(config.maxColumns ?? 10) };
    case 'fraction_bar': return { kind: 'fraction_bar', numerator: Number(config.numerator ?? 1), denominator: Number(config.denominator ?? 4), maxDenominator: Number(config.maxDenominator ?? 12) };
    case 'place_value': return { kind: 'place_value', value: Number(config.value ?? 0), maxValue: Number(config.maxValue ?? 9999) };
    case 'balance_scale': return { kind: 'balance_scale', left: Number(config.left ?? 0), right: Number(config.right ?? 0) };
    case 'geometry_canvas': return { kind: 'geometry_canvas', shape: config.shape === 'triangle' || config.shape === 'square' ? config.shape : 'rectangle', width: Number(config.width ?? 4), height: Number(config.height ?? 3) };
    default: return null;
  }
}

export function ManipulativeActivityRenderer({ activity, onAttempt, onComplete }: PracticeActivityRendererProps) {
  const config = parseConfig(activity.configuration);
  const [latest, setLatest] = useState<ManipulativeInteraction | null>(null);
  if (!config) return <p className="text-sm text-muted-foreground">Manipulative configuration unavailable.</p>;
  return <div className="space-y-4"><ManipulativeRenderer config={config} surface="practice" onInteraction={setLatest} /><Button type="button" disabled={!latest} onClick={() => { if (!latest) return; onAttempt({ masteryLevel: activity.masteryLevels.includes(2) ? 2 : activity.masteryLevels[0] ?? 2, correct: latest.correct ?? true, attemptNumber: 1, hintsUsed: 0, itemId: `${activity.id}:${latest.kind}`, tags: ['manipulative', latest.kind] }); onComplete(); }}>Done</Button></div>;
}

export default ManipulativeActivityRenderer;
