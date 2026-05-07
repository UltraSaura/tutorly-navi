import { describe, expect, it } from 'vitest';
import {
  buildJustificationDocumentRequest,
  normalizeJustificationOcrPayload,
} from './justificationOcr';

describe('justification OCR helpers', () => {
  it('normalizes a confident handwritten mean extraction', () => {
    const result = normalizeJustificationOcrPayload({
      rawText: '12 + 15 + 10 + 7 + 13 = 57\nMoyenne = 57 / 5 = 11.40',
      normalizedText: '12 + 15 + 10 + 7 + 13 = 57\nMoyenne = 57 / 5 = 11.40',
      confidence: 0.92,
      warnings: [],
    });

    expect(result.rawText).toContain('12 + 15');
    expect(result.normalizedText).toContain('57 / 5');
    expect(result.confidence).toBe(0.92);
    expect(result.warnings).toEqual([]);
  });

  it('preserves low-confidence warnings for misread arithmetic', () => {
    const result = normalizeJustificationOcrPayload({
      rawText: '18 + 23 + 10 + 7 + 13 : 53 =\n53 : 5 = 11.40',
      confidence: 0.48,
      warnings: ['Arithmetic appears inconsistent: 18 + 23 + 10 + 7 + 13 equals 71, not 53.'],
    });

    expect(result.rawText).toContain('18 + 23');
    expect(result.confidence).toBeLessThan(0.65);
    expect(result.warnings?.join(' ')).toContain('inconsistent');
  });

  it('builds a justification-mode document processor request', () => {
    const request = buildJustificationDocumentRequest({
      fileData: 'data:image/jpeg;base64,abc',
      fileType: 'image/jpeg',
      fileName: 'Response detail Problem 1.jpg',
      subjectId: 'math',
      rowPrompt: 'La moyenne des prix est 11,40 €.',
      problemContext: 'Prix : 12 ; 15 ; 10 ; 7 ; 13.',
    });

    expect(request.mode).toBe('justification');
    expect(request.rowPrompt).toContain('moyenne');
    expect(request.problemContext).toContain('12 ; 15');
  });
});
