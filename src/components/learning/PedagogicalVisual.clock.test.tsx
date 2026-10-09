import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CLOCK_GEOMETRY, clockPoint } from './PedagogicalVisual';
import { PedagogicalVisual } from './PedagogicalVisual';

const distanceFromCenter = (point: { x: number; y: number }) => Math.hypot(point.x - CLOCK_GEOMETRY.centerX, point.y - CLOCK_GEOMETRY.centerY);

describe('pedagogical clock geometry', () => {
  it('keeps the radial hierarchy circumference → ticks → labels', () => {
    expect(CLOCK_GEOMETRY.labelRadius).toBeLessThan(CLOCK_GEOMETRY.tickInnerRadius);
    expect(CLOCK_GEOMETRY.tickOuterRadius).toBeLessThan(CLOCK_GEOMETRY.faceRadius);
    expect(CLOCK_GEOMETRY.labelRadius).toBeLessThan(CLOCK_GEOMETRY.tickInnerRadius);
  });

  it('places cardinal labels on the correct directions and inside the face', () => {
    const twelve = clockPoint(12, CLOCK_GEOMETRY.labelRadius);
    const three = clockPoint(3, CLOCK_GEOMETRY.labelRadius);
    const six = clockPoint(6, CLOCK_GEOMETRY.labelRadius);
    const nine = clockPoint(9, CLOCK_GEOMETRY.labelRadius);
    expect(twelve.x).toBeCloseTo(CLOCK_GEOMETRY.centerX);
    expect(twelve.y).toBeLessThan(CLOCK_GEOMETRY.centerY);
    expect(three.x).toBeGreaterThan(CLOCK_GEOMETRY.centerX);
    expect(three.y).toBeCloseTo(CLOCK_GEOMETRY.centerY);
    expect(six.x).toBeCloseTo(CLOCK_GEOMETRY.centerX);
    expect(six.y).toBeGreaterThan(CLOCK_GEOMETRY.centerY);
    expect(nine.x).toBeLessThan(CLOCK_GEOMETRY.centerX);
    expect(nine.y).toBeCloseTo(CLOCK_GEOMETRY.centerY);
    for (const point of [twelve, three, six, nine]) expect(distanceFromCenter(point)).toBeLessThan(CLOCK_GEOMETRY.faceRadius);
  });

  it('preserves the clock hand geometry and semantic input mapping', () => {
    expect(CLOCK_GEOMETRY.hourHandRadius).toBe(35);
    expect(CLOCK_GEOMETRY.minuteHandRadius).toBe(53);
    expect(clockPoint(0, CLOCK_GEOMETRY.minuteHandRadius).x).toBeCloseTo(CLOCK_GEOMETRY.centerX);
    expect(clockPoint(0, CLOCK_GEOMETRY.minuteHandRadius).y).toBeLessThan(CLOCK_GEOMETRY.centerY);
    expect(clockPoint(3, CLOCK_GEOMETRY.hourHandRadius).x).toBeGreaterThan(CLOCK_GEOMETRY.centerX);
  });

  it('keeps label coordinates inside the fixed viewBox at narrow mobile scale', () => {
    for (const hour of [12, 3, 6, 9]) {
      const point = clockPoint(hour, CLOCK_GEOMETRY.labelRadius);
      expect(point.x).toBeGreaterThan(CLOCK_GEOMETRY.labelFontSize / 2);
      expect(point.x).toBeLessThan(240 - CLOCK_GEOMETRY.labelFontSize / 2);
      expect(point.y).toBeGreaterThan(CLOCK_GEOMETRY.labelFontSize / 2);
      expect(point.y).toBeLessThan(205 - CLOCK_GEOMETRY.labelFontSize / 2);
    }
  });

  it.each([[3, 0], [6, 0], [9, 0], [12, 0], [3, 30], [6, 45], [10, 10]])('renders labels and centered hands for %s:%s', (hour, minute) => {
    const html = renderToStaticMarkup(<PedagogicalVisual block={{ title: 'Horloge', content: '', visual: { kind: 'clock', data: { hour, minute }, alt_text: 'Horloge' } }} />);
    expect(html).toContain('>12</text>');
    expect(html).toContain('>3</text>');
    expect(html).toContain('>6</text>');
    expect(html).toContain('>9</text>');
    expect(html).toContain('cx="120" cy="90" r="5"');
  });
});
