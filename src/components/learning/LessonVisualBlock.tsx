import { PedagogicalVisual } from './PedagogicalVisual';

export type CanonicalVisual = {
  kind: string;
  data: unknown;
  alt_text?: string;
  purpose?: string;
};

type Props = {
  visual: CanonicalVisual;
  title: string;
  content?: string;
  showText?: boolean;
  testId?: string;
};

/** Shared presentation boundary for canonical lesson visuals. */
export function LessonVisualBlock({ visual, title, content = '', showText = false, testId = 'lesson-visual' }: Props) {
  return (
    <div data-testid={testId} data-visual-kind={visual.kind} className="rounded-xl border border-[#D8E1F0] bg-[#F4F7FF] p-4" role="group" aria-label={visual.alt_text || title}>
      <p className="text-xs font-bold uppercase tracking-wide text-[#3448A5]">{visual.kind.replace('_', ' ')}</p>
      {showText && content && <p className="mt-2 text-sm text-[#111827]">{content}</p>}
      {visual.purpose && <p className="mt-1 text-xs text-[#667085]">{visual.purpose}</p>}
      <div className="mt-4 rounded-lg bg-white p-3">
        <PedagogicalVisual block={{ title, content, visual, showText: false }} />
      </div>
    </div>
  );
}
