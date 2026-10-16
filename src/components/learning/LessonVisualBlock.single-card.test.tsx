import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonVisualBlock } from './LessonVisualBlock';

const circle = { kind: 'circle', purpose: 'Montrer le centre.', alt_text: 'Cercle de centre O', data: { center: { x: 150, y: 100, label: 'O' }, radius: 3, diameter: 6, unit: 'cm' } };
const diagram = { kind: 'diagram', alt_text: 'Segment AB', data: { points: [{ x: 40, y: 120, label: 'A' }, { x: 240, y: 60, label: 'B' }], segments: [[0, 1]] } };

const classes = (html: string) => [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1]);
const bordered = (c: string) => /(^|\s)border(\s|-\[|$)/.test(c);

describe.each([['circle', circle], ['diagram', diagram]])('single visual card: %s', (_name, visual) => {
  const html = renderToStaticMarkup(<LessonVisualBlock testId="admin-lesson-visual-rendered" title="Visuel" visual={visual} />);
  it('renders exactly one visible card and one svg', () => {
    expect(html.match(/data-testid="visual-card"/g)?.length).toBe(1);
    expect(html.match(/<svg/g)?.length).toBe(1);
  });
  it('has no nested bordered container and a transparent wrapper', () => {
    expect(classes(html).filter(bordered).length).toBe(1);
    expect(html).toMatch(/^<div data-testid="admin-lesson-visual-rendered" data-visual-kind="[a-z]+">/);
  });
  it('keeps labels and never prints [object Object]', () => {
    expect(html).not.toContain('[object Object]');
    expect(html).toContain(`aria-label="${visual.alt_text}"`);
  });
});
