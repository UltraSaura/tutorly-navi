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
  // Transparent layout wrapper: PedagogicalVisual owns the single visible card.
  return (
    <div data-testid={testId} data-visual-kind={visual.kind}>
      <PedagogicalVisual block={{ title, content, visual, showText: showText && !!content }} />
    </div>
  );
}
