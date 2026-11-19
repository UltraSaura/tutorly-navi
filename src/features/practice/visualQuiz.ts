import { evaluateNumberLineItems } from './numberLine/numberLineFeedback';
import { normalizedNumberLinePosition, parseNumberLineValue } from './numberLine/numberLineUtils';
import type { GraduatedNumberLineConfiguration } from './numberLine/numberLineTypes';
import { oneHourLater } from './oneHourLater';

export type VisualQuizKind = 'graduated-number-line' | 'analogue-clock';
type Base = { id: string; prompt: string; points?: number };
export type GraduatedNumberLineQuiz = Base & { kind: 'graduated-number-line'; configuration: GraduatedNumberLineConfiguration };
export type AnalogueClockQuiz = Base & { kind: 'analogue-clock'; mode: 'read' | 'one-hour-later'; startHour: number; answerChoices: number[] };
export type VisualQuizExercise = GraduatedNumberLineQuiz | AnalogueClockQuiz;
export type VisualQuizAnswer = {
  value: string;
  position: number | null;
  selectedHour: number | null;
  attempts: number;
  supported: boolean;
  complete: boolean;
};
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** A bounded authored quiz pilot, not a new generated exercise or lesson catalogue. */
export function validateVisualQuizExercise(value: unknown): string[] {
  if (!record(value)) return ['An authored exercise object is required.'];
  const errors: string[] = [];
  if (!text(value.id)) errors.push('A non-empty question ID is required.');
  if (!text(value.prompt)) errors.push('A non-empty question prompt is required.');
  if (value.points !== undefined && !integer(value.points, 0, 100)) errors.push('Points must be a whole number from 0 to 100.');
  if (value.kind === 'analogue-clock') {
    if (value.mode !== 'read' && value.mode !== 'one-hour-later') errors.push('Choose read or one-hour-later mode.');
    if (!integer(value.startHour, 1, 12)) errors.push('Choose a whole hour from 1 to 12.');
    const expected = integer(value.startHour, 1, 12) ? (value.mode === 'read' ? value.startHour : oneHourLater(value.startHour)) : null;
    if (!Array.isArray(value.answerChoices) || value.answerChoices.length !== 4 || !value.answerChoices.every(hour => integer(hour, 1, 12)) || new Set(value.answerChoices).size !== 4 || expected === null || !value.answerChoices.includes(expected)) errors.push('Supply four distinct whole-hour choices, including the correct hour.');
    return errors;
  }
  if (value.kind !== 'graduated-number-line') return [...errors, 'Unsupported visual quiz kind.'];
  const config = value.configuration;
  if (!record(config)) return [...errors, 'An authored number-line configuration is required.'];
  if (!text(config.id) || !text(config.title) || !text(config.instruction)) errors.push('The number line needs an ID, title and instruction.');
  if (config.mode !== 'read_point_value' && config.mode !== 'place_value') errors.push('This quiz pilot supports reading or placing one point.');
  const line = config.line;
  if (!record(line) || !finite(line.start) || !finite(line.end) || line.end <= line.start || line.start < -1000 || line.end > 1000 || !integer(line.subdivisions, 1, 20)) errors.push('Use a finite increasing scale from −1000 to 1000 with 1 to 20 intervals.');
  if (!Array.isArray(config.skillTags) || !config.skillTags.every(tag => typeof tag === 'string')) errors.push('Skill tags must be an array of strings.');
  if (config.snapMode !== undefined && config.snapMode !== 'tick') errors.push('This quiz pilot places points on graduation marks.');
  if (config.validationMode !== undefined && config.validationMode !== 'exact_position') errors.push('Use exact-position validation.');
  if (config.validPositions !== undefined) errors.push('Use the authored graduation marks rather than a separate position list.');
  if (!Array.isArray(config.items) || config.items.length !== 1 || !record(config.items[0])) return [...errors, 'Supply exactly one authored point.'];
  const item = config.items[0];
  if (!text(item.id) || !text(item.label)) errors.push('The point needs an ID and a label.');
  const target = parseNumberLineValue(item.value);
  if (target === null || !record(line) || !finite(line.start) || !finite(line.end) || target < line.start || target > line.end) errors.push('The target must be a finite number or fraction within the displayed scale.');
  else if (integer(line.subdivisions, 1, 20)) {
    const position = normalizedNumberLinePosition(target, line.start, line.end);
    if (position === null || Math.abs(position * line.subdivisions - Math.round(position * line.subdivisions)) > 1e-8) errors.push('Place the authored point on a graduation mark.');
  }
  if (item.tolerance !== undefined && (!finite(item.tolerance) || item.tolerance < 0 || (record(line) && finite(line.subdivisions) && item.tolerance >= 0.5 / line.subdivisions))) errors.push('Placement tolerance must be less than half a graduation interval.');
  if (item.acceptedAnswers !== undefined || item.initialPosition !== undefined || item.placed !== undefined) errors.push('Do not prefill an answer, placement or alternate answer in this quiz pilot.');
  if (config.mode === 'read_point_value' && (!text(item.label) || parseNumberLineValue(item.label) !== null || item.displayValue !== undefined)) errors.push('Reading tasks need a neutral point label such as A, not the answer.');
  if (record(line) && line.visibleLabels !== undefined && (!Array.isArray(line.visibleLabels) || !line.visibleLabels.every(label => finite(label) && finite(line.start) && finite(line.end) && label >= line.start && label <= line.end))) errors.push('Visible scale labels must be finite values within the line.');
  return errors;
}
export function isVisualQuizExercise(value: unknown): value is VisualQuizExercise {
  return validateVisualQuizExercise(value).length === 0;
}

/** Recheck raw answers against authored targets; never trust a status/correct flag. */
export function isVisualQuizAnswerCorrect(exercise: VisualQuizExercise, value: unknown): boolean {
  if (!isVisualQuizExercise(exercise) || !record(value) || value.complete !== true || !integer(value.attempts, 1, 1_000_000) || typeof value.supported !== 'boolean') return false;
  if (exercise.kind === 'analogue-clock') {
    const expected = exercise.mode === 'read' ? exercise.startHour : oneHourLater(exercise.startHour);
    return integer(value.selectedHour, 1, 12) && exercise.answerChoices.includes(value.selectedHour) && value.selectedHour === expected;
  }
  const item = exercise.configuration.items[0];
  if (exercise.configuration.mode === 'read_point_value' && typeof value.value !== 'string') return false;
  if (exercise.configuration.mode === 'place_value') {
    if (!finite(value.position) || value.position < 0 || value.position > 1) return false;
    const tick = value.position * exercise.configuration.line.subdivisions;
    if (Math.abs(tick - Math.round(tick)) > 1e-8) return false;
  }
  return evaluateNumberLineItems(exercise.configuration, { [item.id]: typeof value.value === 'string' ? value.value : '' }, { [item.id]: finite(value.position) ? value.position : NaN }).every(result => result.correct);
}

export function visualQuizPrompt(exercise: VisualQuizExercise, language = 'fr'): string {
  const fr = language.startsWith('fr');
  if (exercise.kind === 'analogue-clock') return exercise.mode === 'read'
    ? (fr ? 'Quelle heure indique cette horloge ?' : 'What time does this clock show?')
    : (fr ? 'Quelle heure sera-t-il une heure plus tard ?' : 'What time will it be one hour later?');
  return exercise.configuration.mode === 'read_point_value'
    ? (fr ? 'Lis la valeur du point marqué sur la droite graduée.' : 'Read the value of the marked point on the number line.')
    : (fr ? 'Place la valeur demandée sur la droite graduée.' : 'Place the requested value on the number line.');
}

/** Admin-only defaults. Learner renderers never call this or generate sample content. */
export function createVisualQuizDraft(kind: VisualQuizKind, id: string): VisualQuizExercise {
  if (kind === 'analogue-clock') return { id, kind, prompt: 'Quelle heure sera-t-il une heure plus tard ?', mode: 'one-hour-later', startHour: 3, answerChoices: [2, 3, 4, 5], points: 1 };
  return { id, kind, prompt: 'Lis la valeur du point A.', points: 1, configuration: { id: `${id}:line`, mode: 'read_point_value', title: 'Droite graduée', instruction: 'Observe les graduations et lis le point A.', line: { start: 0, end: 1, subdivisions: 4 }, items: [{ id: 'a', label: 'A', value: '1/2' }], skillTags: ['fractions.number_line'], snapMode: 'tick', validationMode: 'exact_position' } };
}
