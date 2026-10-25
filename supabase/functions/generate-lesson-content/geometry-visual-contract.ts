export type GeometryContractIssue = { path: string; code: string; message: string };
type Obj = Record<string, unknown>;
const obj = (value: unknown): value is Obj => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const point = (value: unknown): value is Obj => obj(value) && finite(value.x) && finite(value.y);

const issue = (path: string, code: string, message: string): GeometryContractIssue => ({ path, code, message });
const received = (value: unknown): string => {
  if (value === undefined) return '<missing>';
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  try { return JSON.stringify(value); } catch { return '<unserializable>'; }
};
const points = (data: Obj, field: string, min: number, path: string, aliases: string[] = []): GeometryContractIssue[] => {
  const key = [field, ...aliases].find((candidate) => Array.isArray(data[candidate]));
  if (!key) return [issue(`${path}.${field}`, 'missing_geometry_data', `Renderable ${field} coordinates are required.`)];
  const values = data[key] as unknown[];
  if (values.length < min) return [issue(`${path}.${key}`, 'missing_geometry_data', `At least ${min} renderable points are required.`)];
  return values.flatMap((value, index) => point(value) ? [] : [issue(`${path}.${key}[${index}]`, 'invalid_geometry_point', 'Each point must contain finite numeric x and y coordinates.')]);
};

export function geometryVisualDataErrors(kind: string, data: unknown, basePath = 'visual.data'): GeometryContractIssue[] {
  if (!['clock', 'timeline', 'unit_conversion', 'diagram', 'angle', 'circle', 'polygon', 'symmetry', 'triangle', 'rectangle', 'number_line', 'table'].includes(kind)) return [];
  if (!obj(data)) return [issue(basePath, 'missing_geometry_data', `Visual kind ${kind} requires complete renderable data.`)];
  const d = data;
  switch (kind) {
    case 'number_line': {
      const errors: GeometryContractIssue[] = [];
      if (!finite(d.min)) errors.push(issue(`${basePath}.min`, 'missing_geometry_data', 'Number line requires numeric min.'));
      if (!finite(d.max)) errors.push(issue(`${basePath}.max`, 'missing_geometry_data', 'Number line requires numeric max.'));
      return errors;
    }
    case 'table': {
      const errors: GeometryContractIssue[] = [];
      if (!Array.isArray(d.columns) || d.columns.length === 0) errors.push(issue(`${basePath}.columns`, 'missing_geometry_data', 'Table requires non-empty columns.'));
      return errors;
    }
    case 'clock':
      return [
        ...(Number.isInteger(d.hour) && Number(d.hour) >= 1 && Number(d.hour) <= 12
          ? []
          : [issue(`${basePath}.hour`, 'invalid_clock_hour', `Clock hour must be an integer from 1 to 12; received ${received(d.hour)}.`)]),
        ...(Number.isInteger(d.minute) && Number(d.minute) >= 0 && Number(d.minute) <= 59
          ? []
          : [issue(`${basePath}.minute`, 'invalid_clock_minute', `Clock minute must be an integer from 0 to 59; received ${received(d.minute)}.`)]),
      ];
    case 'timeline': {
      const units = Array.isArray(d.units) ? d.units.filter((unit) => typeof unit === 'string' && unit.trim().length > 0) : [];
      const relations = Array.isArray(d.relations) ? d.relations : [];
      if (units.length >= 2 || relations.length >= 1) return [];
      return [issue(basePath, 'missing_geometry_data', 'Timeline requires at least two non-empty units or one relation.')];
    }
    case 'unit_conversion': {
      const units = Array.isArray(d.units) ? d.units.filter((unit) => typeof unit === 'string' && unit.trim().length > 0) : [];
      const relations = Array.isArray(d.relations) ? d.relations : [];
      const pair = typeof d.from === 'string' && d.from.trim().length > 0
        && typeof d.to === 'string' && d.to.trim().length > 0
        && finite(d.factor) && d.factor > 0;
      if (pair || (units.length >= 2 && relations.length >= 1)) return [];
      return [issue(basePath, 'missing_geometry_data', 'Unit conversion requires from/to/factor or declared units and relations.')];
    }
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
      const axis = obj(d.axis) ? d.axis : null;
      const axisKeys = axis ? Object.keys(axis).filter((key) => key === 'x' || key === 'y') : [];
      const hasExactlyOneAxisCoordinate = !!axis && axisKeys.length === 1 && ((axisKeys[0] === 'x' && finite(axis.x)) || (axisKeys[0] === 'y' && finite(axis.y)));
      if (!hasExactlyOneAxisCoordinate) errors.push(issue(`${basePath}.axis`, 'missing_geometry_data', 'Symmetry axis must be an object with exactly one finite x or y coordinate.'));
      if (!obj(d.grid) || !finite(d.grid.width) || d.grid.width <= 0 || !finite(d.grid.height) || d.grid.height <= 0) errors.push(issue(`${basePath}.grid`, 'missing_geometry_data', 'Grid width and height must be positive numbers.'));
      errors.push(...points(d, 'figure', 2, basePath, ['original']));
      errors.push(...points(d, 'symmetric_figure', 2, basePath, ['reflected']));
      return errors;
    }
  }
  return [];
}
