import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatNumberLineLabel, numberLineLabelIndices, numberLinePosition, numberLineTickValues, PedagogicalVisual } from './PedagogicalVisual';

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

  it('renders 0–1 graduations by 0,1 and positions 0,3 correctly', () => {
    const ticks = numberLineTickValues(0, 1, 0.1);
    const html = render('number_line', { min: 0, max: 1, step: 0.1, value: 0.3 });
    expect(ticks).toHaveLength(11);
    expect(html).toContain('>0,3<');
    expect(numberLinePosition(0.3, 0, 1)).toBeCloseTo(0.3);
  });

  it('supports negative bounds and intervals that do not start at zero', () => {
    expect(numberLineTickValues(-1, 1, 0.5)).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(numberLineTickValues(2.4, 2.5, 0.01)).toHaveLength(11);
    expect(formatNumberLineLabel(-0.5)).toBe('-0,5');
  });

  it('uses labels supplied by the visual data', () => {
    const html = render('number_line', { min: 0, max: 1, step: 0.5, value: 0.5, labels: ['départ', 'milieu', 'arrivée'] });
    expect(html).toContain('>départ<');
    expect(html).toContain('>milieu<');
    expect(html).toContain('>arrivée<');
  });

  it.each([
    ['level 1', { min: 2.4, max: 2.5, step: 0.01, value: 2.47 }, 11, '2,47'],
    ['level 2 first', { min: 0, max: 2, step: 0.1, value: 1.4 }, 21, '1,4'],
    ['level 2 second', { min: 2, max: 3, step: 0.05, value: 2.45 }, 21, '2,45'],
    ['level 3', { min: 0, max: 3, step: 0.1, value: 2.5 }, 31, '2,5'],
    ['level 4', { min: 0, max: 1, step: 0.1, value: 0.3 }, 11, '0,3'],
  ])('renders the five stored decimal number lines responsively for %s', (_name, data, tickCount, valueLabel) => {
    const html = render('number_line', data);
    expect(html).toContain('viewBox="0 0 330 110"');
    expect(html).toContain('class="w-full"');
    expect((html.match(/<g>/g) ?? [])).toHaveLength(tickCount);
    expect(html).toContain(`>${valueLabel}<`);
    expect(html).not.toContain('undefined');
  });

  it('keeps whole-number lines unchanged', () => {
    const html = render('number_line', { min: 0, max: 10, step: 1, value: 6 });
    expect(numberLineTickValues(0, 10, 1)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(html).toContain('>0<');
    expect(html).toContain('>10<');
    expect(html).toContain('cx="193"');
  });

  it('keeps exact ticks but reduces mobile labels to readable endpoints and value', () => {
    const ticks = numberLineTickValues(0, 3, 0.1);
    const html = render('number_line', { min: 0, max: 3, step: 0.1, value: 2.5 });
    expect(ticks).toHaveLength(31);
    expect(numberLineLabelIndices(ticks, 2.5, 9).size).toBeLessThanOrEqual(9);
    expect(html).toContain('number-line-label--mobile');
    expect(html).toContain('number-line-label--desktop');
    expect(html).toContain('>0<');
    expect(html).toContain('>3<');
    expect(html).toContain('>2,5<');
  });

  it('reports an explicit bounded-graduation message when more than 41 ticks are needed', () => {
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
