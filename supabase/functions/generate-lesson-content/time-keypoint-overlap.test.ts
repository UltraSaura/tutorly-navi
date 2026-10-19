import { describe, expect, it } from 'vitest';
import { semanticDuplicationDiagnostics, keyPointContentOverlap } from './pedagogical-quality.ts';

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
