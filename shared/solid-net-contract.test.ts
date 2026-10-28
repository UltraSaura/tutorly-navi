import { describe, expect, it } from 'vitest';
import {
  INVALID_CONNECTED_RECTANGLE_CUBE_NET,
  INVALID_CYCLE_WITH_DISCONNECTED_PAIR,
  INVALID_DIMENSION_RECTANGULAR_PRISM_NET,
  INVALID_DISJOINT_CUBE_NET,
  INVALID_OVERLAPPING_CUBE_NET,
  VALID_CUBE_NET,
  VALID_RECTANGULAR_PRISM_NET,
  solidNetErrors,
} from './solid-net-contract';

describe('solid net contract', () => {
  it('accepts the complete cube and rectangular-prism fixtures', () => {
    expect(solidNetErrors(VALID_CUBE_NET)).toEqual([]);
    expect(solidNetErrors(VALID_RECTANGULAR_PRISM_NET)).toEqual([]);
  });

  it.each([
    ['null point', { ...VALID_CUBE_NET, points: [...VALID_CUBE_NET.points, null] }],
    ['primitive face', { ...VALID_CUBE_NET, faces: [...VALID_CUBE_NET.faces.slice(0, 5), 3] }],
    ['unknown point reference', { ...VALID_CUBE_NET, faces: [{ ...VALID_CUBE_NET.faces[0], points: ['missing', ...VALID_CUBE_NET.faces[0].points.slice(1)] }, ...VALID_CUBE_NET.faces.slice(1)] }],
  ])('rejects malformed entries without throwing: %s', (_label, value) => {
    expect(() => solidNetErrors(value)).not.toThrow();
    expect(solidNetErrors(value).length).toBeGreaterThan(0);
  });

  it('checks face-graph connectivity rather than shared-edge counts', () => {
    expect(solidNetErrors(INVALID_DISJOINT_CUBE_NET).some((error) => error.code === 'disconnected_solid_net')).toBe(true);
    expect(solidNetErrors(INVALID_CYCLE_WITH_DISCONNECTED_PAIR).some((error) => error.code === 'disconnected_solid_net')).toBe(true);
  });

  it('rejects overlapping faces', () => {
    expect(solidNetErrors(INVALID_OVERLAPPING_CUBE_NET).some((error) => error.code === 'overlapping_solid_net_face')).toBe(true);
  });

  it('rejects rhombi and degenerate non-rectangular faces', () => {
    expect(solidNetErrors(INVALID_CONNECTED_RECTANGLE_CUBE_NET).some((error) => error.code === 'invalid_solid_net_shape')).toBe(true);
    const degenerate = { ...VALID_CUBE_NET, points: VALID_CUBE_NET.points.map((point, index) => index === 1 ? { ...point, x: 0 } : point) };
    expect(solidNetErrors(degenerate).some((error) => error.code === 'invalid_solid_net_shape')).toBe(true);
  });

  it('checks rectangular-prism face-pair multiplicities and dimensions', () => {
    expect(solidNetErrors(INVALID_DIMENSION_RECTANGULAR_PRISM_NET).some((error) => error.code === 'incompatible_solid_net_dimensions')).toBe(true);
    const sixLongFaces = { ...VALID_RECTANGULAR_PRISM_NET, faces: VALID_RECTANGULAR_PRISM_NET.faces.map((face) => face.id === 'bottom' ? { ...face, points: ['k', 'l', 'c', 'b'] } : face) };
    expect(solidNetErrors(sixLongFaces).some((error) => error.code === 'incompatible_solid_net_dimensions')).toBe(true);
  });
});
