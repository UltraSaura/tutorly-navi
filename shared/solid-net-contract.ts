export type SolidNetPoint = { id: string; x: number; y: number };
export type SolidNetFace = { id: string; points: string[] };
export type SolidNetData = { netKind: 'cube' | 'rectangular_prism'; points: SolidNetPoint[]; faces: SolidNetFace[]; segments?: Array<{ from: string; to: string }>; dimensions?: { width: number; height: number; depth: number } };

type Issue = { path: string; code: string; message: string };
const pointKey = (a: SolidNetPoint, b: SolidNetPoint) => `${a.x},${a.y}|${b.x},${b.y}`;

export function solidNetErrors(value: unknown, basePath = 'visual.data'): Issue[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [{ path: basePath, code: 'invalid_solid_net', message: 'Le patron doit être un objet.' }];
  const data = value as Partial<SolidNetData>;
  if (data.netKind !== 'cube' && data.netKind !== 'rectangular_prism') return [{ path: `${basePath}.netKind`, code: 'invalid_solid_net_kind', message: 'Le patron doit être de type cube ou rectangular_prism.' }];
  const points = Array.isArray(data.points) ? data.points : [];
  const faces = Array.isArray(data.faces) ? data.faces : [];
  const byId = new Map(points.map((point) => [point.id, point]));
  const errors: Issue[] = [];
  if (faces.length !== 6) errors.push({ path: `${basePath}.faces`, code: 'invalid_solid_net_face_count', message: 'Un patron de solide doit contenir exactement six faces.' });
  const faceEdges = new Map<string, number>();
  const occupied = new Set<string>();
  faces.forEach((face, faceIndex) => {
    if (!Array.isArray(face.points) || face.points.length !== 4 || new Set(face.points).size !== 4) {
      errors.push({ path: `${basePath}.faces[${faceIndex}].points`, code: 'invalid_solid_net_face', message: 'Chaque face doit contenir quatre sommets distincts.' });
      return;
    }
    const vertices = face.points.map((id) => byId.get(id));
    if (vertices.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
      errors.push({ path: `${basePath}.faces[${faceIndex}].points`, code: 'invalid_solid_net_point', message: 'Chaque sommet de face doit référencer un point numérique.' });
      return;
    }
    const validVertices = vertices as SolidNetPoint[];
    const lengths = validVertices.map((point, index) => {
      const next = validVertices[(index + 1) % validVertices.length];
      return Math.hypot(next.x - point.x, next.y - point.y);
    });
    if (lengths.some((length) => length <= 0) || (data.netKind === 'cube' && Math.max(...lengths) - Math.min(...lengths) > 1e-9)) {
      errors.push({ path: `${basePath}.faces[${faceIndex}]`, code: 'invalid_solid_net_shape', message: 'La face ne forme pas un quadrilatère dessinable cohérent.' });
    }
    const cell = validVertices.map((point) => `${point.x},${point.y}`).sort().join(';');
    if (occupied.has(cell)) errors.push({ path: `${basePath}.faces[${faceIndex}]`, code: 'overlapping_solid_net_face', message: 'Deux faces occupent la même position.' });
    occupied.add(cell);
    validVertices.forEach((point, index) => {
      const next = validVertices[(index + 1) % validVertices.length];
      const key = pointKey(point, next) < pointKey(next, point) ? pointKey(point, next) : pointKey(next, point);
      faceEdges.set(key, (faceEdges.get(key) ?? 0) + 1);
    });
  });
  if (faces.length === 6 && [...faceEdges.values()].filter((count) => count === 2).length < 5) {
    errors.push({ path: `${basePath}.faces`, code: 'disconnected_solid_net', message: 'Les six faces ne forment pas un patron connecté.' });
  }
  if (data.dimensions) {
    const dimensions = [data.dimensions.width, data.dimensions.height, data.dimensions.depth];
    if (dimensions.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
      errors.push({ path: `${basePath}.dimensions`, code: 'invalid_solid_net_dimensions', message: 'Les dimensions du pavé doivent être positives.' });
    } else {
      const observed = [...faceEdges.keys()].map((key) => {
        const [a, b] = key.split('|').map((value) => value.split(',').map(Number));
        return Math.hypot((b?.[0] ?? 0) - (a?.[0] ?? 0), (b?.[1] ?? 0) - (a?.[1] ?? 0));
      });
      for (const dimension of dimensions) {
        if (!observed.some((length) => Math.abs(length - dimension) < 1e-9)) errors.push({ path: `${basePath}.dimensions`, code: 'incompatible_solid_net_dimensions', message: `La dimension ${dimension} n’est pas représentée par les faces du patron.` });
      }
    }
  }
  return errors;
}

const row = (prefix: string, y: number, count: number, width: number) => Array.from({ length: count + 1 }, (_, index) => ({ id: `${prefix}${index}`, x: index * width, y }));
const cubePoints: SolidNetPoint[] = [
  ...row('t', 0, 4, 50), ...row('m', 50, 4, 50), ...row('b', 100, 4, 50),
  { id: 'u1', x: 50, y: -50 }, { id: 'u2', x: 100, y: -50 },
  { id: 'd1', x: 50, y: 150 }, { id: 'd2', x: 100, y: 150 },
];
const VALID_CUBE_NET_SEGMENTS = [
  { from: 'm0', to: 'm1' }, { from: 'm1', to: 'm2' }, { from: 'm2', to: 'm3' }, { from: 'm3', to: 'm4' },
  { from: 'm0', to: 'b0' }, { from: 'm1', to: 'b1' }, { from: 'm2', to: 'b2' }, { from: 'm3', to: 'b3' }, { from: 'm4', to: 'b4' },
  { from: 'b0', to: 'b1' }, { from: 'b1', to: 'b2' }, { from: 'b2', to: 'b3' }, { from: 'b3', to: 'b4' },
  { from: 't1', to: 't2' }, { from: 't1', to: 'm1' }, { from: 't2', to: 'm2' }, { from: 'd1', to: 'b1' }, { from: 'd2', to: 'b2' }, { from: 'd1', to: 'd2' },
];
export const VALID_CUBE_NET: SolidNetData = {
  netKind: 'cube', points: cubePoints,
  segments: VALID_CUBE_NET_SEGMENTS,
  faces: [
    { id: 'f1', points: ['m0', 'm1', 'b1', 'b0'] }, { id: 'f2', points: ['m1', 'm2', 'b2', 'b1'] },
    { id: 'f3', points: ['m2', 'm3', 'b3', 'b2'] }, { id: 'f4', points: ['m3', 'm4', 'b4', 'b3'] },
    { id: 'f5', points: ['t1', 't2', 'm2', 'm1'] }, { id: 'f6', points: ['b1', 'b2', 'd2', 'd1'] },
  ],
};

export const INVALID_DISJOINT_CUBE_NET: SolidNetData = {
  ...VALID_CUBE_NET,
  faces: VALID_CUBE_NET.faces.map((face, index) => ({ ...face, id: `disjoint-${index}`, points: face.points.map((_, pointIndex) => `d${index}-${pointIndex}`) })),
  points: Array.from({ length: 24 }, (_, index) => ({ id: `d${Math.floor(index / 4)}-${index % 4}`, x: (index % 4) * 50, y: Math.floor(index / 4) * 50 })),
};

export const INVALID_CONNECTED_RECTANGLE_CUBE_NET: SolidNetData = {
  ...VALID_CUBE_NET,
  points: VALID_CUBE_NET.points.map((point) => ({ ...point, x: point.x * 1.5 })),
};

export const INVALID_OVERLAPPING_CUBE_NET: SolidNetData = {
  ...VALID_CUBE_NET,
  faces: [...VALID_CUBE_NET.faces.slice(0, 5), { ...VALID_CUBE_NET.faces[0], id: 'overlap' }],
};

export const VALID_RECTANGULAR_PRISM_NET: SolidNetData = {
  netKind: 'rectangular_prism',
  dimensions: { width: 60, height: 50, depth: 50 },
  segments: [
    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' }, { from: 'd', to: 'e' },
    { from: 'a', to: 'f' }, { from: 'b', to: 'g' }, { from: 'c', to: 'h' }, { from: 'd', to: 'i' }, { from: 'e', to: 'j' },
    { from: 'f', to: 'g' }, { from: 'g', to: 'h' }, { from: 'h', to: 'i' }, { from: 'i', to: 'j' },
    { from: 'k', to: 'l' }, { from: 'k', to: 'b' }, { from: 'l', to: 'c' }, { from: 'g', to: 'm' }, { from: 'h', to: 'n' }, { from: 'm', to: 'n' },
  ],
  points: [
    { id: 'a', x: 0, y: 50 }, { id: 'b', x: 60, y: 50 }, { id: 'c', x: 120, y: 50 }, { id: 'd', x: 180, y: 50 }, { id: 'e', x: 240, y: 50 },
    { id: 'f', x: 0, y: 100 }, { id: 'g', x: 60, y: 100 }, { id: 'h', x: 120, y: 100 }, { id: 'i', x: 180, y: 100 }, { id: 'j', x: 240, y: 100 },
    { id: 'k', x: 60, y: 0 }, { id: 'l', x: 120, y: 0 }, { id: 'm', x: 60, y: 150 }, { id: 'n', x: 120, y: 150 },
  ],
  faces: [
    { id: 'front', points: ['a', 'b', 'g', 'f'] }, { id: 'side1', points: ['b', 'c', 'h', 'g'] }, { id: 'side2', points: ['c', 'd', 'i', 'h'] },
    { id: 'side3', points: ['d', 'e', 'j', 'i'] }, { id: 'top', points: ['k', 'l', 'c', 'b'] }, { id: 'bottom', points: ['g', 'h', 'n', 'm'] },
  ],
};

export const INVALID_DIMENSION_RECTANGULAR_PRISM_NET: SolidNetData = {
  ...VALID_RECTANGULAR_PRISM_NET,
  dimensions: { width: 60, height: 70, depth: 50 },
};
