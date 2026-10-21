import { describe, expect, it } from 'vitest';
import { semanticDuplicationDiagnostics, keyPointContentOverlap } from './pedagogical-quality.ts';
import { stagingFullLevelExample, stagingLevelMetadata, validateStagingLevel, stagingValidationFailure } from './staging-level-workflow.ts';

const timeBlock = {
  type: 'concept',
  content: 'Une journée se mesure avec plusieurs unités : la seconde, la minute, l’heure puis le jour. On passe d’une unité à la suivante.',
  key_points: [
    { label: 'Petites unités', text: '1 minute = 60 secondes, puis 1 heure = 60 minutes.' },
    { label: 'Grandes unités', text: '1 jour = 24 heures : chaque unité vaut plus que la précédente.' },
  ],
  takeaway: 'Astuce : pense à une échelle qui grandit.',
};

describe('key-point overlap for time topics', () => {
  const topic = 'Le repérage dans le temps et les durées';
  const level = stagingLevelMetadata('7588497a-6173-4144-864e-25bcab6b4011', topic, [])[0];
  const validatePoints = (points: Array<{ label: string; text: string }>) => {
    const lesson = structuredClone(stagingFullLevelExample(level));
    const sequence = lesson.sequence as Array<Record<string, unknown>>;
    sequence[0].key_points = points;
    return validateStagingLevel(lesson, level, topic, 'CM2');
  };

  it('rejects duplicate complete statements after normalization', () => {
    const result = validatePoints([
      { label: 'A', text: 'Une minute contient soixante secondes.' },
      { label: 'B', text: 'UNE MINUTE contient soixante secondes !' },
    ]);
    expect(result.pedagogicalIssues.some((issue) => issue.message.includes('identiques après normalisation'))).toBe(true);
  });

  it('accepts different conversion ideas even when multiplier repeats', () => {
    const result = validatePoints([
      { label: 'Minutes', text: 'Multiplier par 60 transforme les minutes en secondes.' },
      { label: 'Jours', text: 'Multiplier par 24 transforme les jours en heures.' },
    ]);
    expect(result.pedagogicalIssues).toEqual([]);
  });

  it('reports the single-word duplicate with both indexes and a pedagogical failure', () => {
    const result = validatePoints([{ label: 'A', text: 'multiplier' }, { label: 'B', text: 'Multiplier !' }]);
    const failure = stagingValidationFailure(1, result.pedagogicalIssues, 1);
    expect(failure).toMatchObject({ code: 'staging_level_validation_failed', level: 1, validationCategory: 'pedagogical', providerCalls: 1 });
    expect(failure.technicalDetail).toContain('key_points[0].text et key_points[1].text');
    expect(failure.technicalDetail).toContain('"multiplier"');
    expect(failure.technicalDetail).toContain('deux phrases complètes');
  });

  it('accepts repeated valid time vocabulary (seconde, minute, heure, jour, unité, puis)', () => {
    expect(semanticDuplicationDiagnostics(timeBlock)).toEqual([]);
  });

  it('rejects a key point copied verbatim from the content', () => {
    const block = { ...timeBlock, key_points: [{ label: 'Rappel', text: 'On passe d’une unité à la suivante.' }] };
    const diags = semanticDuplicationDiagnostics(block);
    expect(diags.some((d) => d.fieldB === 'key_points[0]')).toBe(true);
  });

  it('rejects two near-identical key points', () => {
    const block = { ...timeBlock, key_points: [
      { label: 'A', text: '1 heure = 60 minutes.' },
      { label: 'B', text: '1 Heure = 60 minutes !' },
    ] };
    const diags = semanticDuplicationDiagnostics(block);
    expect(diags.some((d) => d.fieldA === 'key_points[0]' && d.fieldB === 'key_points[1]')).toBe(true);
  });

  it('keeps geometry key-point overlap strict (geometry words are not ignored)', () => {
    const block = {
      type: 'concept',
      content: 'Le rectangle possède quatre angles droits et ses côtés opposés sont parallèles et de même longueur.',
      key_points: [{ label: 'Rectangle', text: 'Rectangle : quatre angles droits, côtés opposés parallèles, même longueur.' }],
      takeaway: 'Astuce : pense à une porte.',
    };
    expect(keyPointContentOverlap(block.content, block.key_points[0].text).overlap).toBeGreaterThanOrEqual(2);
    expect(semanticDuplicationDiagnostics(block).some((d) => d.fieldB === 'key_points[0]')).toBe(true);
  });
});
