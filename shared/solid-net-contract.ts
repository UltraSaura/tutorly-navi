export type SolidNetPoint = { id: string; x: number; y: number };
export type SolidNetFace = { id: string; points: string[] };
export type SolidNetData = {
  netKind: 'cube' | 'rectangular_prism';
  points: SolidNetPoint[];
  faces: SolidNetFace[];
  segments?: Array<{ from: string; to: string }>;
  dimensions?: { width: number; height: number; depth: number };
};

type Issue = { path: string; code: string; message: string };
type RecordValue = Record<string, unknown>;
const EPSILON = 1e-8;
const isRecord = (value: unknown): value is RecordValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const pointKey = (a: SolidNetPoint, b: SolidNetPoint) => `${a.x},${a.y}|${b.x},${b.y}`;
const edgeKey = (a: SolidNetPoint, b: SolidNetPoint) => { const first = pointKey(a, b); const second = pointKey(b, a); return first < second ? first : second; };
const close = (a: number, b: number) => Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
const pairKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).map((value) => value.toFixed(8)).join('|');
const issue = (path: string, code: string, message: string): Issue => ({ path, code, message });

function cross(a: SolidNetPoint, b: SolidNetPoint, c: SolidNetPoint) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function segmentsIntersect(a: SolidNetPoint, b: SolidNetPoint, c: SolidNetPoint, d: SolidNetPoint) {
  const ab = cross(a, b, c); const ab2 = cross(a, b, d); const cd = cross(c, d, a); const cd2 = cross(c, d, b);
  return ((ab > EPSILON && ab2 < -EPSILON) || (ab < -EPSILON && ab2 > EPSILON))
    && ((cd > EPSILON && cd2 < -EPSILON) || (cd < -EPSILON && cd2 > EPSILON));
}

function faceGeometry(vertices: SolidNetPoint[], cube: boolean) {
  const edges = vertices.map((point, index) => { const next = vertices[(index + 1) % vertices.length]; return { from: point, to: next, length: Math.hypot(next.x - point.x, next.y - point.y) }; });
  if (edges.some((edge) => edge.length <= EPSILON)) return { valid: false, dimensions: null };
  for (let index = 0; index < vertices.length; index += 1) {
    const previous = vertices[(index + vertices.length - 1) % vertices.length]; const current = vertices[index]; const next = vertices[(index + 1) % vertices.length];
    const left = { x: previous.x - current.x, y: previous.y - current.y }; const right = { x: next.x - current.x, y: next.y - current.y };
    const dot = left.x * right.x + left.y * right.y;
    if (Math.abs(dot) > EPSILON * Math.max(1, Math.hypot(left.x, left.y) * Math.hypot(right.x, right.y))) return { valid: false, dimensions: null };
  }
  const area = Math.abs(vertices.reduce((sum, point, index) => { const next = vertices[(index + 1) % vertices.length]; return sum + point.x * next.y - next.x * point.y; }, 0));
  if (area <= EPSILON || segmentsIntersect(vertices[0], vertices[1], vertices[2], vertices[3]) || segmentsIntersect(vertices[1], vertices[2], vertices[3], vertices[0])) return { valid: false, dimensions: null };
  const lengths = edges.map((edge) => edge.length);
  if (!close(lengths[0], lengths[2]) || !close(lengths[1], lengths[3]) || (cube && !lengths.every((length) => close(length, lengths[0])))) return { valid: false, dimensions: null };
  return { valid: true, dimensions: [lengths[0], lengths[1]] as [number, number] };
}

export function solidNetErrors(value: unknown, basePath = 'visual.data'): Issue[] {
  if (!isRecord(value)) return [issue(basePath, 'invalid_solid_net', 'Le patron doit être un objet.')];
  if (value.netKind !== 'cube' && value.netKind !== 'rectangular_prism') return [issue(`${basePath}.netKind`, 'invalid_solid_net_kind', 'Le patron doit être de type cube ou rectangular_prism.')];
  const errors: Issue[] = []; const rawPoints = value.points; const rawFaces = value.faces; const points = Array.isArray(rawPoints) ? rawPoints : []; const faces = Array.isArray(rawFaces) ? rawFaces : [];
  const byId = new Map<string, SolidNetPoint>();
  points.forEach((rawPoint, index) => {
    if (!isRecord(rawPoint) || typeof rawPoint.id !== 'string' || !isFiniteNumber(rawPoint.x) || !isFiniteNumber(rawPoint.y)) { errors.push(issue(`${basePath}.points[${index}]`, 'invalid_solid_net_point', 'Chaque point doit être un objet avec id, x et y numériques.')); return; }
    if (byId.has(rawPoint.id)) { errors.push(issue(`${basePath}.points[${index}].id`, 'duplicate_solid_net_point', 'Les identifiants de points doivent être uniques.')); return; }
    byId.set(rawPoint.id, { id: rawPoint.id, x: rawPoint.x, y: rawPoint.y });
  });
  if (!Array.isArray(rawPoints)) errors.push(issue(`${basePath}.points`, 'invalid_solid_net_points', 'points doit être un tableau.'));
  if (faces.length !== 6) errors.push(issue(`${basePath}.faces`, 'invalid_solid_net_face_count', 'Un patron de solide doit contenir exactement six faces.'));
  const adjacency = faces.map(() => new Set<number>()); const owners = new Map<string, number[]>(); const occupiedFaces = new Set<string>(); const faceDimensions: Array<[number, number] | null> = [];
  faces.forEach((rawFace, faceIndex) => {
    if (!isRecord(rawFace)) { errors.push(issue(`${basePath}.faces[${faceIndex}]`, 'invalid_solid_net_face', 'Chaque face doit être un objet.')); faceDimensions.push(null); return; }
    const facePoints = rawFace.points;
    if (!Array.isArray(facePoints) || facePoints.length !== 4 || facePoints.some((pointId) => typeof pointId !== 'string') || new Set(facePoints).size !== 4) { errors.push(issue(`${basePath}.faces[${faceIndex}].points`, 'invalid_solid_net_face', 'Chaque face doit contenir quatre sommets distincts.')); faceDimensions.push(null); return; }
    const vertices = facePoints.map((pointId) => byId.get(pointId));
    if (vertices.some((point) => !point)) { errors.push(issue(`${basePath}.faces[${faceIndex}].points`, 'invalid_solid_net_reference', 'Chaque sommet de face doit référencer un point valide.')); faceDimensions.push(null); return; }
    const typedVertices = vertices as SolidNetPoint[];
    const faceSignature = typedVertices.map((point) => `${point.x},${point.y}`).sort().join(';');
    if (occupiedFaces.has(faceSignature)) errors.push(issue(`${basePath}.faces[${faceIndex}]`, 'overlapping_solid_net_face', 'Deux faces occupent la même position.'));
    occupiedFaces.add(faceSignature);
    const geometry = faceGeometry(typedVertices, value.netKind === 'cube');
    if (!geometry.valid) errors.push(issue(`${basePath}.faces[${faceIndex}]`, 'invalid_solid_net_shape', 'Chaque face doit être un rectangle non dégénéré avec des angles droits et des côtés opposés égaux.'));
    faceDimensions.push(geometry.dimensions);
    typedVertices.forEach((point, index) => { const next = typedVertices[(index + 1) % typedVertices.length]; const key = edgeKey(point, next); owners.set(key, [...(owners.get(key) ?? []), faceIndex]); });
  });
  owners.forEach((faceIndexes) => { const unique = [...new Set(faceIndexes)]; unique.forEach((faceIndex) => unique.filter((other) => other !== faceIndex).forEach((other) => adjacency[faceIndex]?.add(other))); });
  if (faces.length === 6) {
    const visited = new Set<number>(); const queue = [0];
    while (queue.length) { const faceIndex = queue.shift()!; if (visited.has(faceIndex)) continue; visited.add(faceIndex); adjacency[faceIndex]?.forEach((next) => { if (!visited.has(next)) queue.push(next); }); }
    if (visited.size !== 6) errors.push(issue(`${basePath}.faces`, 'disconnected_solid_net', 'Les six faces doivent former un graphe connecté par leurs arêtes partagées.'));
  }
  if (value.netKind === 'cube') {
    const lengths = faceDimensions.filter((pair): pair is [number, number] => Boolean(pair)).flat();
    if (lengths.length && !lengths.every((length) => close(length, lengths[0]))) errors.push(issue(`${basePath}.faces`, 'inconsistent_cube_face_size', 'Toutes les faces du cube doivent être des carrés de même taille.'));
  }
  const dimensions = value.dimensions;
  if (value.netKind === 'rectangular_prism') {
    if (!isRecord(dimensions) || !isFiniteNumber(dimensions.width) || !isFiniteNumber(dimensions.height) || !isFiniteNumber(dimensions.depth) || dimensions.width <= 0 || dimensions.height <= 0 || dimensions.depth <= 0) {
      errors.push(issue(`${basePath}.dimensions`, 'invalid_solid_net_dimensions', 'Les dimensions du pavé doivent être positives.'));
    } else {
      const expected = new Map<string, number>(); [[dimensions.width, dimensions.height], [dimensions.width, dimensions.depth], [dimensions.height, dimensions.depth]].forEach(([a, b]) => { const key = pairKey(a, b); expected.set(key, (expected.get(key) ?? 0) + 2); });
      const observed = new Map<string, number>(); faceDimensions.forEach((pair) => { if (pair) { const key = pairKey(pair[0], pair[1]); observed.set(key, (observed.get(key) ?? 0) + 1); } });
      if (expected.size !== observed.size || [...expected.entries()].some(([key, count]) => observed.get(key) !== count)) errors.push(issue(`${basePath}.faces`, 'incompatible_solid_net_dimensions', 'Les six faces du pavé doivent respecter les trois paires de dimensions et leurs multiplicités.'));
    }
  }
  return errors;
}

const row = (prefix: string, y: number, count: number, width: number) => Array.from({ length: count + 1 }, (_, index) => ({ id: `${prefix}${index}`, x: index * width, y }));
const cubePoints: SolidNetPoint[] = [...row('t', 0, 4, 50), ...row('m', 50, 4, 50), ...row('b', 100, 4, 50), { id: 'u1', x: 50, y: -50 }, { id: 'u2', x: 100, y: -50 }, { id: 'd1', x: 50, y: 150 }, { id: 'd2', x: 100, y: 150 }];
const VALID_CUBE_NET_SEGMENTS = [{ from: 'm0', to: 'm1' }, { from: 'm1', to: 'm2' }, { from: 'm2', to: 'm3' }, { from: 'm3', to: 'm4' }, { from: 'm0', to: 'b0' }, { from: 'm1', to: 'b1' }, { from: 'm2', to: 'b2' }, { from: 'm3', to: 'b3' }, { from: 'm4', to: 'b4' }, { from: 'b0', to: 'b1' }, { from: 'b1', to: 'b2' }, { from: 'b2', to: 'b3' }, { from: 'b3', to: 'b4' }, { from: 't1', to: 't2' }, { from: 't1', to: 'm1' }, { from: 't2', to: 'm2' }, { from: 'd1', to: 'b1' }, { from: 'd2', to: 'b2' }, { from: 'd1', to: 'd2' }];
export const VALID_CUBE_NET: SolidNetData = { netKind: 'cube', points: cubePoints, segments: VALID_CUBE_NET_SEGMENTS, faces: [{ id: 'f1', points: ['m0', 'm1', 'b1', 'b0'] }, { id: 'f2', points: ['m1', 'm2', 'b2', 'b1'] }, { id: 'f3', points: ['m2', 'm3', 'b3', 'b2'] }, { id: 'f4', points: ['m3', 'm4', 'b4', 'b3'] }, { id: 'f5', points: ['t1', 't2', 'm2', 'm1'] }, { id: 'f6', points: ['b1', 'b2', 'd2', 'd1'] }] };
export const INVALID_DISJOINT_CUBE_NET: SolidNetData = { ...VALID_CUBE_NET, faces: VALID_CUBE_NET.faces.map((face, index) => ({ ...face, id: `disjoint-${index}`, points: face.points.map((_, pointIndex) => `d${index}-${pointIndex}`) })), points: Array.from({ length: 24 }, (_, index) => ({ id: `d${Math.floor(index / 4)}-${index % 4}`, x: (index % 4) * 50, y: Math.floor(index / 4) * 50 })) };
export const INVALID_CYCLE_WITH_DISCONNECTED_PAIR: SolidNetData = {
  netKind: 'cube',
  points: [
    { id: 'a', x: 0, y: 0 }, { id: 'b', x: 1, y: 0 }, { id: 'c', x: 1, y: 1 }, { id: 'd', x: 0, y: 1 },
    { id: 'e', x: 2, y: 0 }, { id: 'f', x: 2, y: 1 }, { id: 'g', x: 0, y: 2 }, { id: 'h', x: 1, y: 2 }, { id: 'i', x: 2, y: 2 },
    { id: 'j', x: 10, y: 0 }, { id: 'k', x: 11, y: 0 }, { id: 'l', x: 11, y: 1 }, { id: 'm', x: 10, y: 1 }, { id: 'n', x: 12, y: 0 }, { id: 'o', x: 12, y: 1 },
  ],
  faces: [
    { id: 'block-1', points: ['a', 'b', 'c', 'd'] }, { id: 'block-2', points: ['b', 'e', 'f', 'c'] },
    { id: 'block-3', points: ['d', 'c', 'h', 'g'] }, { id: 'block-4', points: ['c', 'f', 'i', 'h'] },
    { id: 'separate-1', points: ['j', 'k', 'l', 'm'] }, { id: 'separate-2', points: ['k', 'n', 'o', 'l'] },
  ],
};
export const INVALID_CONNECTED_RECTANGLE_CUBE_NET: SolidNetData = { ...VALID_CUBE_NET, points: VALID_CUBE_NET.points.map((point) => ({ ...point, x: point.x + point.y * 0.6, y: point.y * 0.8 })) };
export const INVALID_OVERLAPPING_CUBE_NET: SolidNetData = { ...VALID_CUBE_NET, faces: [...VALID_CUBE_NET.faces.slice(0, 5), { ...VALID_CUBE_NET.faces[0], id: 'overlap' }] };
export const VALID_RECTANGULAR_PRISM_NET: SolidNetData = { netKind: 'rectangular_prism', dimensions: { width: 60, height: 50, depth: 50 }, segments: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' }, { from: 'd', to: 'e' }, { from: 'a', to: 'f' }, { from: 'b', to: 'g' }, { from: 'c', to: 'h' }, { from: 'd', to: 'i' }, { from: 'e', to: 'j' }, { from: 'f', to: 'g' }, { from: 'g', to: 'h' }, { from: 'h', to: 'i' }, { from: 'i', to: 'j' }, { from: 'a', to: 'p' }, { from: 'p', to: 'q' }, { from: 'q', to: 'f' }, { from: 'e', to: 'r' }, { from: 'r', to: 's' }, { from: 's', to: 'j' }], points: [{ id: 'a', x: 0, y: 50 }, { id: 'b', x: 60, y: 50 }, { id: 'c', x: 120, y: 50 }, { id: 'd', x: 180, y: 50 }, { id: 'e', x: 240, y: 50 }, { id: 'f', x: 0, y: 100 }, { id: 'g', x: 60, y: 100 }, { id: 'h', x: 120, y: 100 }, { id: 'i', x: 180, y: 100 }, { id: 'j', x: 240, y: 100 }, { id: 'p', x: -50, y: 100 }, { id: 'q', x: -50, y: 50 }, { id: 'r', x: 290, y: 50 }, { id: 's', x: 290, y: 100 }], faces: [{ id: 'front', points: ['a', 'b', 'g', 'f'] }, { id: 'side1', points: ['b', 'c', 'h', 'g'] }, { id: 'side2', points: ['c', 'd', 'i', 'h'] }, { id: 'side3', points: ['d', 'e', 'j', 'i'] }, { id: 'top', points: ['a', 'f', 'p', 'q'] }, { id: 'bottom', points: ['e', 'j', 's', 'r'] }] };
export const INVALID_DIMENSION_RECTANGULAR_PRISM_NET: SolidNetData = { ...VALID_RECTANGULAR_PRISM_NET, dimensions: { width: 60, height: 70, depth: 50 } };
