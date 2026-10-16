import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonVisualBlock } from './LessonVisualBlock';

const circle = { kind: 'circle', purpose: 'Montrer le centre.', alt_text: 'Cercle de centre O', data: { center: { x: 150, y: 100, label: 'O' }, radius: 3, diameter: 6, unit: 'cm' } };
const diagram = { kind: 'diagram', alt_text: 'Segment AB', data: { points: [{ x: 40, y: 120, label: 'A' }, { x: 240, y: 60, label: 'B' }], segments: [[0, 1]] } };

const doc = (html: string) => { const el = document.createElement('div'); el.innerHTML = html; return el; };
const bordered = (el: Element) => /(^|\s)border(\s|-\[|$)/.test(el.getAttribute('class') ?? '');

describe.each([['circle', circle], ['diagram', diagram]])('single visual card: %s', (_name, visual) => {
  const root = doc(renderToStaticMarkup(<LessonVisualBlock testId="admin-lesson-visual-rendered" title="Visuel" visual={visual} />));
  it('renders exactly one visible card and one svg', () => {
    expect(root.querySelectorAll('[data-testid="visual-card"]').length).toBe(1);
    expect(root.querySelectorAll('svg').length).toBe(1);
  });
  it('has no nested bordered container and a transparent wrapper', () => {
    expect([...root.querySelectorAll('*')].filter(bordered).length).toBe(1);
    const wrapper = root.querySelector('[data-testid="admin-lesson-visual-rendered"]')!;
    expect(wrapper.getAttribute('class')).toBeNull();
  });
  it('keeps labels and never prints [object Object]', () => {
    expect(root.innerHTML).not.toContain('[object Object]');
    expect(root.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(visual.alt_text);
  });
});
