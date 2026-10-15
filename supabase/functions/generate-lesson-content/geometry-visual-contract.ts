// @ts-nocheck -- Deno strict typecheck; covered by vitest/node tests.
export type GeometryContractIssue = { path: string; code: string; message: string };
type Obj = Record<string, unknown>;
const obj = (value: unknown): value is Obj => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const point = (value: unknown): value is Obj => obj(value) && finite(value.x) && finite(value.y);

const issue = (path: string, code: string, message: string): GeometryContractIssue => ({ path, code, message });
const points = (data: Obj, field: string, min: number, path: string, aliases: string[] = []): GeometryContractIssue[] => {
  const key = [field, ...aliases].find((candidate) => Array.isArray(data[candidate]));
  if (!key) return [issue(`${path}.${field}`, 'missing_geometry_data', `Renderable ${field} coordinates are required.`)];
  const values = data[key] as unknown[];
  if (values.length < min) return [issue(`${path}.${key}`, 'missing_geometry_data', `At least ${min} renderable points are required.`)];
  return values.flatMap((value, index) => point(value) ? [] : [issue(`${path}.${key}[${index}]`, 'invalid_geometry_point', 'Each point must contain finite numeric x and y coordinates.')]);
};

export function geometryVisualDataErrors(kind: string, data: unknown, basePath = 'visual.data'): GeometryContractIssue[] {
  if (!['diagram', 'angle', 'circle', 'polygon', 'symmetry', 'triangle', 'rectangle'].includes(kind)) return [];
  if (!obj(data)) return [issue(basePath, 'missing_geometry_data', `Visual kind ${kind} requires complete renderable data.`)];
  const d = data;
  switch (kind) {
    case 'diagram': {
      const errors = points(d, 'points', 1, basePath);
      const relations = [...(Array.isArray(d.segments) ? d.segments : []), ...(Array.isArray(d.lines) ? d.lines : [])];
      if (!relations.length) errors.push(issue(`${basePath}.segments`, 'missing_geometry_data', 'A diagram requires at least one segment or line relation.'));
      return errors;
    }
    case 'angle': {
      const errors: GeometryContractIssue[] = [];
      if (!(finite(d.degrees) && d.degrees > 0 && d.degrees <= 360) && d.rightAngle !== true) errors.push(issue(`${basePath}.degrees`, 'missing_geometry_data', 'Angle degrees or rightAngle=true is required.'));
      if (point(d.vertex)) { /* valid */ } else errors.push(issue(`${basePath}.vertex`, 'missing_geometry_data', 'Angle vertex coordinates are required.'));
      if (!Array.isArray(d.rays) || d.rays.length < 2 || d.rays.some((ray) => !point(ray))) errors.push(issue(`${basePath}.rays`, 'missing_geometry_data', 'Two ray endpoint coordinates are required.'));
      return errors;
    }
    case 'circle': {
      const errors: GeometryContractIssue[] = [];
      if (!point(d.center) && !point(d.centre)) errors.push(issue(`${basePath}.center`, 'missing_geometry_data', 'Circle centre coordinates are required.'));
      if (!(finite(d.radius) && d.radius > 0) && !(finite(d.diameter) && d.diameter > 0)) errors.push(issue(`${basePath}.radius`, 'missing_geometry_data', 'A positive numeric radius or diameter is required.'));
      return errors;
    }
    case 'polygon': case 'triangle': case 'rectangle': {
      const errors = points(d, 'vertices', 3, basePath, ['points']);
      const shape = typeof d.shape === 'string' ? d.shape.trim().toLowerCase() : '';
      if (!shape) errors.push(issue(`${basePath}.shape`, 'missing_geometry_data', 'Polygon shape identity is required.'));
      return errors;
    }
    case 'symmetry': {
      const errors: GeometryContractIssue[] = [];
      if (!(point(d.axis) || (obj(d.axis) && (finite(d.axis.x) || finite(d.axis.y))) || (typeof d.axis === 'string' && d.axis.trim()))) errors.push(issue(`${basePath}.axis`, 'missing_geometry_data', 'A renderable symmetry axis is required.'));
      if (!obj(d.grid) || !finite(d.grid.width) || !finite(d.grid.height)) errors.push(issue(`${basePath}.grid`, 'missing_geometry_data', 'Grid width and height are required.'));
      errors.push(...points(d, 'figure', 1, basePath, ['original']));
      errors.push(...points(d, 'symmetric_figure', 1, basePath, ['reflected']));
      return errors;
    }
  }
}
