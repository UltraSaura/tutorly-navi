import type { GraduatedNumberLineConfiguration } from './numberLineTypes';
import { equivalentNumberLineValues, normalizedNumberLinePosition, numberLineValidPositions, parseNumberLineValue } from './numberLineUtils';

type ItemResult = { id: string; correct: boolean };
const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isPosition = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const numericValue = (value: unknown) => typeof value === 'string' && !value.trim() ? null : parseNumberLineValue(value);

/** Pure item validation shared by a full submission and feedback that preserves correct work. */
export function evaluateNumberLineItems(
  config: GraduatedNumberLineConfiguration,
  answers: Record<string, string>,
  placements: Record<string, number>,
): ItemResult[] {
  if (config.mode === 'read_point_value') return config.items.map(item => {
    const answer = answers[item.id];
    const correct = hasText(answer) && (
      (numericValue(item.value) !== null && equivalentNumberLineValues(answer, item.value))
      || Boolean(item.acceptedAnswers?.some(alias => hasText(alias) && (
        answer.trim().toLocaleLowerCase() === alias.trim().toLocaleLowerCase()
        || equivalentNumberLineValues(answer, alias)
      )))
    );
    return { id: item.id, correct };
  });

  const validLine = Number.isFinite(config.line.start) && Number.isFinite(config.line.end)
    && config.line.end > config.line.start && Number.isFinite(config.line.subdivisions) && config.line.subdivisions > 0;
  if (!validLine) return config.items.map(item => ({ id: item.id, correct: false }));

  if (config.mode === 'order_values' && config.validationMode === 'relative_order') {
    const positions = config.items.map(item => placements[item.id]);
    const values = config.items.map(item => numericValue(item.value));
    // Missing/tied positions have no unambiguous rank; never let Array.sort invent it.
    if (positions.some(position => !isPosition(position)) || new Set(positions).size !== positions.length || values.some(value => value === null)) {
      return config.items.map(item => ({ id: item.id, correct: false }));
    }
    const ranked = config.items.map((item, index) => ({ id: item.id, position: positions[index], value: values[index]! }))
      .sort((left, right) => left.position - right.position);
    const expectedValues = values.map(value => value!).sort((left, right) => left - right);
    const results = new Map(ranked.map((item, index) => [item.id, equivalentNumberLineValues(item.value, expectedValues[index])]));
    return config.items.map(item => ({ id: item.id, correct: results.get(item.id) === true }));
  }

  const ticks = [...new Set(numberLineValidPositions(config.line.start, config.line.end, config.line.subdivisions, config.validPositions))]
    .filter(isPosition).sort((left, right) => left - right);
  let defaultTolerance = 0.08;
  if (config.snapMode !== 'free' && ticks.length > 1) {
    const smallestGap = Math.min(...ticks.slice(1).map((position, index) => position - ticks[index]));
    defaultTolerance = Math.min(defaultTolerance, smallestGap / 2);
  }
  return config.items.map(item => {
    const actual = placements[item.id];
    const expected = numericValue(item.value) === null ? null : normalizedNumberLinePosition(item.value, config.line.start, config.line.end);
    const tolerance = item.tolerance ?? defaultTolerance;
    return {
      id: item.id,
      correct: isPosition(actual) && expected !== null && isPosition(expected)
        && Number.isFinite(tolerance) && tolerance >= 0
        && Math.abs(actual - expected) <= tolerance + Math.min(Number.EPSILON, tolerance * 1e-9),
    };
  });
}

/** A method scaffold only: it contains no target value, computed step size or destination. */
export function numberLineMethodHint(config: GraduatedNumberLineConfiguration, language = 'fr'): string {
  const fr = language.startsWith('fr');
  const unit = fr
    ? 'Repère des valeurs connues et compte les intervalles entre leurs traits. Les espaces doivent être égaux. Le dénominateur d’une fraction indique le nombre de parts égales dans une unité.'
    : 'Find known labels and count the intervals between their marks. The spaces must be equal. A fraction’s denominator tells you how many equal parts make a whole unit.';
  if (config.mode === 'read_point_value') return unit + (fr
    ? ' Déduis la valeur d’un intervalle, puis avance par pas égaux depuis une valeur connue jusqu’au point.'
    : 'Work out the value of an interval, then repeat equal steps from a known label to the point.');
  if (config.mode === 'place_value') return unit + (fr
    ? ' Décompose le nombre à placer en unités et en parts d’unité. Avance par pas égaux depuis une valeur connue et place l’étiquette quand tu atteins cette quantité.'
    : 'Split the number to place into whole units and parts of a unit. Repeat equal steps from a known label and place the label when you reach that amount.');
  return unit + (fr
    ? ' Compare les valeurs en les écrivant sous une même forme si nécessaire. Range les plus petites à gauche et les plus grandes à droite ; deux écritures équivalentes représentent la même quantité.'
    : 'Compare the values using the same form if needed. Put smaller values to the left and larger values to the right; equivalent forms represent the same amount.');
}
