import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedagogicalVisual } from './PedagogicalVisual';

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
});
