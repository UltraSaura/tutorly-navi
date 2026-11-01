import { describe, expect, it } from 'vitest';
import { geometryVisualDataErrors } from './geometry-visual-contract.ts';

const complete = {
  diagram: { points: [{ x: 0, y: 0, label: 'A' }, { x: 100, y: 0, label: 'B' }], segments: [{ from: 'A', to: 'B' }] },
  angle: { vertex: { x: 50, y: 50, label: 'B' }, rays: [{ x: 50, y: 0, label: 'A' }, { x: 100, y: 50, label: 'C' }], degrees: 90, rightAngle: true },
  circle: { center: { x: 50, y: 50, label: 'O' }, radius: 25 },
  polygon: { shape: 'rectangle', vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }] },
  symmetry: { axis: { x: 50 }, grid: { width: 8, height: 8 }, figure: [{ x: 1, y: 1 }, { x: 1, y: 2 }], symmetric_figure: [{ x: 7, y: 1 }, { x: 7, y: 2 }] },
};

describe('canonical geometry visual contract', () => {
  it.each(Object.entries(complete).filter(([kind]) => kind !== 'symmetry'))('accepts complete %s data', (kind, data) => expect(geometryVisualDataErrors(kind, data)).toEqual([]));
  it('accepts a clock only when hour and minute are integers in their allowed ranges', () => {
    expect(geometryVisualDataErrors('clock', { hour: 1, minute: 0 })).toEqual([]);
    expect(geometryVisualDataErrors('clock', { hour: 12, minute: 59 })).toEqual([]);
  });
  it.each([
    [{ hour: 3.5, minute: 15 }, 'visual.data.hour', 'received 3.5'],
    [{ hour: 3, minute: 15.5 }, 'visual.data.minute', 'received 15.5'],
    [{ hour: 0, minute: 15 }, 'visual.data.hour', 'received 0'],
    [{ hour: 13, minute: 15 }, 'visual.data.hour', 'received 13'],
    [{ hour: 3, minute: -1 }, 'visual.data.minute', 'received -1'],
    [{ hour: 3, minute: 60 }, 'visual.data.minute', 'received 60'],
  ])('reports the exact invalid clock field and received value', (data, path, received) => {
    const errors = geometryVisualDataErrors('clock', data);
    expect(errors.map((error) => error.path)).toContain(path);
    expect(errors.map((error) => error.message).join(' ')).toContain(received);
  });
  it('accepts complete symmetry data', () => expect(geometryVisualDataErrors('symmetry', complete.symmetry)).toEqual([]));
  it('rejects diagram labels without coordinates', () => expect(geometryVisualDataErrors('diagram', { points: ['A', 'B'], segments: [{ from: 'A', to: 'B' }] })[0].path).toBe('visual.data.points[0]'));
  it('rejects a circle without centre or radius', () => expect(geometryVisualDataErrors('circle', { center: 'O' }) .map((error) => error.path)).toEqual(['visual.data.center', 'visual.data.radius']));
  it('rejects an angle without a value or right-angle metadata', () => expect(geometryVisualDataErrors('angle', { vertex: { x: 1, y: 1 }, rays: [{ x: 0, y: 0 }, { x: 2, y: 1 }] })[0].path).toBe('visual.data.degrees'));
  it('rejects polygons without vertices and symmetry without an axis/grid', () => {
    expect(geometryVisualDataErrors('polygon', { shape: 'triangle', sides: 3 }).some((error) => error.path.endsWith('.vertices'))).toBe(true);
    expect(geometryVisualDataErrors('symmetry', { figure: [{ x: 1, y: 1 }], symmetric_figure: [{ x: 2, y: 1 }] }).map((error) => error.path)).toEqual(expect.arrayContaining(['visual.data.axis', 'visual.data.grid']));
  });
  it('rejects a symmetry figure with a single point even when axis and grid are present', () => {
    const errors = geometryVisualDataErrors('symmetry', { axis: { x: 5 }, grid: { width: 10, height: 8 }, figure: [{ x: 2, y: 3 }], symmetric_figure: [{ x: 8, y: 3 }] });
    expect(errors.map((error) => error.path)).toEqual(expect.arrayContaining(['visual.data.figure', 'visual.data.symmetric_figure']));
  });
  it.each([
    ['axis with both coordinates', { ...complete.symmetry, axis: { x: 5, y: 5 } }],
    ['string coordinates', { ...complete.symmetry, axis: { x: '5' } }],
    ['zero grid width', { ...complete.symmetry, grid: { width: 0, height: 8 } }],
    ['missing reflected points', { ...complete.symmetry, symmetric_figure: undefined }],
  ])('rejects incomplete symmetry data: %s', (_label, data) => expect(geometryVisualDataErrors('symmetry', data).length).toBeGreaterThan(0));
});
