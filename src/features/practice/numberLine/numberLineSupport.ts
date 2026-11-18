import type { GraduatedNumberLineConfiguration } from './numberLineTypes';
import { formatNumberLineValue, parseNumberLineValue } from './numberLineUtils';

export type NumberLineSupportStage = 'independent' | 'offer' | 'guided';

/** Repeated mistakes offer help; only a learner's explicit request opens guided support. */
export function numberLineSupportStage(failedAttempts: number, supportRequested: boolean): NumberLineSupportStage {
  if (supportRequested) return 'guided';
  return failedAttempts >= 2 ? 'offer' : 'independent';
}

/** A translated independent task retains the scale and mode without recycling target values. */
export function createNumberLineTransfer(config: GraduatedNumberLineConfiguration): GraduatedNumberLineConfiguration {
  const span = config.line.end - config.line.start;
  if (!Number.isFinite(config.line.start) || !Number.isFinite(config.line.end) || !Number.isFinite(span) || span <= 0) {
    throw new Error('A number-line transfer requires a finite increasing scale.');
  }
  const offset = Math.max(1, Math.ceil(span));
  const start = config.line.start + offset;
  const end = config.line.end + offset;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === config.line.start || end === config.line.end) {
    throw new Error('The translated number-line scale is not representable.');
  }
  const prompts = {
    read_point_value: { title: 'Lire de nouveaux points', instruction: 'Observe cette nouvelle droite graduée et écris la valeur de chaque point.' },
    place_value: { title: 'Placer de nouvelles valeurs', instruction: 'Observe cette nouvelle échelle et place chaque étiquette sur la graduation qui correspond à sa valeur.' },
    order_values: { title: 'Ranger de nouvelles valeurs', instruction: 'Compare les nouvelles étiquettes et place-les dans l’ordre croissant sur la droite graduée.' },
  };
  return {
    ...config,
    id: `${config.id}:transfer`,
    title: prompts[config.mode].title,
    instruction: prompts[config.mode].instruction,
    line: {
      ...config.line,
      start,
      end,
      ...(config.line.visibleLabels ? { visibleLabels: config.line.visibleLabels.map(value => value + offset) } : {}),
    },
    items: config.items.map(source => {
      const previous = parseNumberLineValue(source.value);
      if (previous === null || !Number.isFinite(previous + offset) || previous + offset === previous) {
        throw new Error('A number-line transfer requires representable numeric target values.');
      }
      const value = previous + offset;
      const formatted = formatNumberLineValue(value);
      const item = {
        ...source,
        id: `${source.id}:transfer`,
        value,
        label: config.mode === 'read_point_value' ? source.label : formatted,
      };
      // Responses and placement state belong to the original attempt, not this transfer.
      delete item.acceptedAnswers;
      delete item.initialPosition;
      delete item.placed;
      delete item.displayValue;
      if (config.mode !== 'read_point_value') item.displayValue = formatted;
      return item;
    }),
    skillTags: [...config.skillTags],
    ...(config.validPositions ? { validPositions: [...config.validPositions] } : {}),
  };
}
