import { describe, expect, it } from 'vitest';
import { semanticDuplicationDiagnostics } from './pedagogical-quality';
import { stagingFullLevelExample, stagingLevelMetadata, validateStagingLevel } from './staging-level-workflow';

const distinctGeometryPoints = [
  { label: 'Nombre', text: 'Le rectangle possède quatre sommets.' },
  { label: 'Repérage', text: 'Les sommets du rectangle se nomment A, B, C et D.' },
];

const duplicateGeometryPoints = [
  { label: 'Nombre', text: 'Le rectangle possède quatre sommets.' },
  { label: 'Rappel', text: 'LE RECTANGLE possède quatre sommets !' },
];

describe('statement-based geometry key-point validation (provider-free)', () => {
  const diagnostics = (key_points: Array<{ label: string; text: string }>) => semanticDuplicationDiagnostics({
    content: 'Une aire décrit la surface occupée par une figure.', key_points, takeaway: 'Astuce : pense à un tapis.',
  });

  it('accepts distinct geometry facts sharing rectangle and sommets', () => {
    expect(diagnostics(distinctGeometryPoints)).toEqual([]);
  });

  it('accepts the reported angle explanation and distinct vertex fact despite overlap=4, ratio=0.67', () => {
    expect(semanticDuplicationDiagnostics({
      content: 'Un angle est formé par deux demi-droites qui partent du même sommet. Son ouverture se mesure en degrés avec un rapporteur.',
      key_points: [
        { label: 'Sommet', text: 'Le sommet est le point commun des deux demi-droites.' },
        { label: 'Lecture', text: 'La lettre du milieu indique où placer le centre.' },
      ],
      takeaway: 'Astuce : pense à un éventail.',
    })).toEqual([]);
  });

  it('keeps a complete explanation subset invalid', () => {
    const result = semanticDuplicationDiagnostics({
      content: 'Un triangle possède trois sommets et trois côtés. Un côté relie deux sommets.',
      key_points: [{ label: 'Lien', text: 'Un côté relie deux sommets.' }],
      takeaway: 'Astuce : pense à une tente.',
    });
    expect(result.some((issue) => issue.fieldA === 'content' && issue.fieldB === 'key_points[0]')).toBe(true);
  });

  it('accepts those facts through the actual staging pedagogical validator', () => {
    const level = stagingLevelMetadata('7be61901-cc83-4cb3-90bb-b7056c4542bc', 'Les aires', [])[0];
    const lesson = structuredClone(stagingFullLevelExample(level));
    (lesson.sequence as Array<Record<string, unknown>>)[0].key_points = distinctGeometryPoints;
    expect(validateStagingLevel(lesson, level, 'Les aires', 'CM2').pedagogicalIssues).toEqual([]);
  });

  it('rejects exact duplicates even when labels differ', () => {
    expect(diagnostics([distinctGeometryPoints[0], { label: 'Rappel', text: distinctGeometryPoints[0].text }])).toHaveLength(1);
  });

  it('rejects punctuation, case and accent-normalized duplicates', () => {
    expect(diagnostics(duplicateGeometryPoints)[0]?.reason).toContain('identiques après normalisation');
  });

  it.each([
    'Ce rectangle possède quatre sommets.',
    'Le rectangle possède quatre sommets nommés A, B, C et D.',
    'Quatre sommets possède le rectangle.',
  ])('rejects a near-identical or subset copy: %s', (text) => {
    expect(diagnostics([distinctGeometryPoints[0], { label: 'Rappel', text }])).toHaveLength(1);
  });

  it('does not collapse different quantities or negation into duplicates', () => {
    expect(diagnostics([
      { label: 'A', text: 'Le rectangle possède quatre sommets.' },
      { label: 'B', text: 'Un triangle possède trois sommets.' },
      { label: 'C', text: 'Un cercle ne possède pas quatre sommets.' },
    ])).toEqual([]);
  });
});