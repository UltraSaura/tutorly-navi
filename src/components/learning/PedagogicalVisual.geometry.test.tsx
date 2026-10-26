import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatNumberLineLabel, numberLineExactTickIndex, numberLineLabelIndices, numberLinePosition, numberLineTickValues, PedagogicalVisual } from './PedagogicalVisual';

const render = (kind: string, data: unknown, content = 'Géométrie') => renderToStaticMarkup(<PedagogicalVisual block={{ title: 'Visuel', content, visual: { kind, data, alt_text: 'Visuel de géométrie' } }} />);

describe('PedagogicalVisual geometry data', () => {
  it('draws labelled points, segments, lines and annotations from a diagram', () => {
    const html = render('diagram', { points: [{ x: 40, y: 120, label: 'A' }, { x: 240, y: 60, label: 'B' }], segments: [[0, 1]], lines: [{ points: [0, 1], extends: true }], annotations: [{ x: 80, y: 180, text: 'AB' }] });
    expect(html).toContain('>A<'); expect(html).toContain('>B<'); expect(html).toContain('AB'); expect(html).toContain('stroke-dasharray'); expect(html).not.toContain('[object Object]');
  });

  it('renders a circle centre, radius and diameter when supplied', () => {
    const html = render('circle', { center: { x: 150, y: 100, label: 'O' }, radius: 55, diameter: true, radius_label: 'r', diameter_label: 'd' });
    expect(html).toContain('>O<'); expect(html).toContain('>r<'); expect(html).toContain('>d<');
  });

  it('renders a right angle and stored labels/value', () => {
    const html = render('angle', { vertex: { x: 100, y: 120, label: 'B' }, rays: [{ x: 100, y: 35, label: 'A' }, { x: 205, y: 120, label: 'C' }], degrees: 90 });
    expect(html).toContain('90°'); expect(html).toContain('>A<'); expect(html).toContain('>B<'); expect(html).toContain('>C<');
  });

  it('uses the supplied vertices for each polygon instead of a generic shape', () => {
    const html = render('polygon', { shape: 'hexagone', vertices: [{ x: 150, y: 20, label: 'A' }, { x: 240, y: 70, label: 'B' }, { x: 210, y: 160, label: 'C' }, { x: 90, y: 160, label: 'D' }, { x: 60, y: 70, label: 'E' }, { x: 150, y: 20, label: 'F' }] });
    expect(html).toContain('150,20 240,70 210,160 90,160 60,70 150,20'); expect(html).toContain('>A<');
  });

  it('renders a labelled rectangle with every side and consistent dimensions', () => {
    const html = render('rectangle', { shape: 'rectangle', vertices: [{ x: 45, y: 45, label: 'A' }, { x: 255, y: 45, label: 'B' }, { x: 255, y: 155, label: 'C' }, { x: 45, y: 155, label: 'D' }], side_labels: [{ from: 'A', to: 'B', label: 'AB = 6 cm' }, { from: 'B', to: 'C', label: 'BC = 4 cm' }, { from: 'C', to: 'D', label: 'CD = 6 cm' }, { from: 'D', to: 'A', label: 'DA = 4 cm' }] });
    for (const label of ['A', 'B', 'C', 'D', 'AB = 6 cm', 'BC = 4 cm', 'CD = 6 cm', 'DA = 4 cm']) expect(html).toContain(`>${label}<`);
  });

  it('renders a labelled triangle with named sides', () => {
    const html = render('polygon', { shape: 'triangle', vertices: [{ x: 60, y: 150, label: 'A' }, { x: 150, y: 30, label: 'B' }, { x: 240, y: 150, label: 'C' }], side_labels: [{ from: 'A', to: 'B', label: 'AB' }, { from: 'B', to: 'C', label: 'BC' }, { from: 'C', to: 'A', label: 'CA' }] });
    for (const label of ['A', 'B', 'C', 'AB', 'BC', 'CA']) expect(html).toContain(`>${label}<`);
  });

  it('renders symmetry figures and its axis when complete', () => {
    const html = render('symmetry', { grid: { size: 8 }, axis: { x: 150, y: 0 }, original: [{ x: 80, y: 60 }, { x: 120, y: 120 }, { x: 80, y: 150 }], reflected: [{ x: 220, y: 60 }, { x: 180, y: 120 }, { x: 220, y: 150 }] });
    expect(html).toContain('stroke-dasharray="7 5"'); expect(html).toContain('stroke="#E2E8F0"');
  });

  it('represents the stored symbolic geometry when coordinates are absent', () => {
    const diagram = render('diagram', { points: ['A', 'B'], segment: '[AB]', droite: '(AB)', annotations: ['A et B sont des points'] });
    const circle = render('circle', { centre: 'O', rayon: '[OA]', diametre: '[BC]' });
    expect(diagram).toContain('Points :'); expect(diagram).toContain('[AB]'); expect(diagram).toContain('Coordonnées absentes');
    expect(circle).toContain('Centre :'); expect(circle).toContain('[OA]'); expect(circle).toContain('[BC]');
  });

  it('maps the lesson grid arrays and vertical axis into a visible symmetry figure', () => {
    const html = render('symmetry', { axis: 'vertical', grid: true, figure: [[1, 2], [1, 3], [2, 3]], symmetric_figure: [[5, 2], [5, 3], [4, 3]] });
    expect(html).toContain('stroke="#E2E8F0"'); expect(html).toContain('stroke-dasharray="7 5"'); expect(html).toContain('<polygon');
  });

  it('uses an honest fallback when geometry data is incomplete', () => {
    const html = render('circle', { center: { x: 10, y: 10 } });
    expect(html).toContain('Cercle décrit par les données'); expect(html).toContain('Coordonnées ou rayon numérique absents'); expect(html).not.toContain('[object Object]');
  });

  it('does not present unsupported visual kinds as a valid geometry', () => {
    const html = render('unknown_kind', { points: [{ x: 1, y: 2 }] });
    expect(html).toContain('Représentation de secours'); expect(html).toContain('Type de visuel non pris en charge'); expect(html).not.toContain('[object Object]');
  });

  it('keeps existing non-geometry visuals working', () => {
    expect(render('fraction_bar', { numerator: 1, denominator: 4 })).toContain('1 / 4');
    expect(render('clock', { hour: 3, minute: 0 })).toContain('Horloge pédagogique');
  });

  it('prioritizes the integer marker 1 for the stored 0–2 / 0.1 / 1.4 line', () => {
    const ticks = numberLineTickValues(0, 2, 0.1);
    const html = render('number_line', { min: 0, max: 2, step: 0.1, value: 1.4 });
    const desktop = numberLineLabelIndices(ticks, 1.4, 21, 32);
    const mobile = numberLineLabelIndices(ticks, 1.4, 9, 42);
    expect(desktop.has(0)).toBe(true);
    expect(desktop.has(10)).toBe(true);
    expect(desktop.has(20)).toBe(true);
    expect(mobile.has(0)).toBe(true);
    expect(mobile.has(10)).toBe(true);
    expect(mobile.has(20)).toBe(true);
    expect(html).toContain('>1<');
    expect(html).toContain('>1,4<');
  });

  it('preserves exact decimal ticks, French labels, and point position for the five stored lines', () => {
    for (const [data, count, label] of [
      [{ min: 2.4, max: 2.5, step: 0.01, value: 2.47 }, 11, '2,47'],
      [{ min: 0, max: 2, step: 0.1, value: 1.4 }, 21, '1,4'],
      [{ min: 2, max: 3, step: 0.05, value: 2.45 }, 21, '2,45'],
      [{ min: 0, max: 3, step: 0.1, value: 2.5 }, 31, '2,5'],
      [{ min: 0, max: 1, step: 0.1, value: 0.3 }, 11, '0,3'],
    ] as const) {
      const html = render('number_line', data);
      expect(numberLineTickValues(data.min, data.max, data.step)).toHaveLength(count);
      expect(html).toContain(`>${label}<`);
      expect(html).toContain('class="w-full"');
      expect(html).not.toContain('undefined');
    }
  });

  it('keeps negative bounds and labels only stored graduations', () => {
    const ticks = numberLineTickValues(-1, 1, 0.5);
    const html = render('number_line', { min: -1, max: 1, step: 0.5, value: 0 });
    expect(ticks).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(html).toContain('>-1<');
    expect(html).toContain('>1<');
    expect(html).toContain('>0<');
    expect(numberLinePosition(0, -1, 1)).toBeCloseTo(0.5);
  });

  it.each([0.95, 0.05])('uses a separate point label when an exact value is too close to a bound (%s)', (value) => {
    const ticks = numberLineTickValues(0, 1, 0.05);
    const exactIndex = numberLineExactTickIndex(ticks, value);
    const desktop = numberLineLabelIndices(ticks, value, 21, 32);
    const mobile = numberLineLabelIndices(ticks, value, 9, 42);
    const html = render('number_line', { min: 0, max: 1, step: 0.05, value });
    expect(exactIndex).not.toBeNull();
    expect(desktop.has(0)).toBe(true);
    expect(desktop.has(ticks.length - 1)).toBe(true);
    expect(mobile.has(0)).toBe(true);
    expect(mobile.has(ticks.length - 1)).toBe(true);
    expect(desktop.has(exactIndex as number)).toBe(false);
    expect(mobile.has(exactIndex as number)).toBe(false);
    expect(html).toContain('number-line-point-label--desktop');
    expect(html).toContain('number-line-point-label--mobile');
    expect(html.match(new RegExp(`>${formatNumberLineLabel(value)}<`, 'g'))).toHaveLength(2);
  });

  it('does not turn a nearby graduation into a non-graduated point value', () => {
    const ticks = numberLineTickValues(0, 1, 0.1);
    const html = render('number_line', { min: 0, max: 1, step: 0.1, value: 0.35 });
    expect(numberLineExactTickIndex(ticks, 0.35)).toBeNull();
    expect(html).toContain('class="number-line-point-label--desktop"');
    expect(html).toContain('>0,35<');
  });

  it('rejects a number line needing more than 41 graduations without changing its scale', () => {
    expect(numberLineTickValues(0, 5, 0.1)).toEqual([]);
    expect(render('number_line', { min: 0, max: 5, step: 0.1, value: 2.5 })).toContain('41');
  });
});

import { circleDisplayRadius } from './PedagogicalVisual';
describe('circle centimetre scale', () => {
  it('scales cm radii to a readable size and clamps to the canvas', () => {
    expect(circleDisplayRadius(3, 'cm', { x: 150, y: 100 })).toBe(60);
    expect(circleDisplayRadius(10, 'cm', { x: 150, y: 100 })).toBe(94);
    expect(circleDisplayRadius(55, undefined, { x: 150, y: 100 })).toBe(55);
  });
  it('renders the saved draft circle (radius 3 cm) at 60 points', () => {
    const html = render('circle', { center: { x: 150, y: 100, label: 'O' }, radius: 3, diameter: 6, unit: 'cm' });
    expect(html).toContain('r="60"');
  });
});
