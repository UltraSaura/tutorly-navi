import { describe, expect, it } from 'vitest';
import { normalizeLessonComposition } from './composition-normalization.ts';
import { semanticDuplicationDiagnostics, pedagogicalIssues } from './pedagogical-quality.ts';

const base = (content: string, takeaway?: string, keyPoints?: unknown) => ({
  lesson_goal: 'Comprendre les fractions.', success_criteria: ['Je sais lire une fraction.'], prerequisites: [], misconceptions: [],
  sequence: [
    { id: 'c1', type: 'concept', title: 'Fractions', content, key_points: keyPoints ?? [{ label: 'Numérateur', text: 'Il compte les parts prises.' }, { label: 'Dénominateur', text: 'Il indique les parts égales.' }], takeaway, visual: { kind: 'fraction_bar', purpose: 'Montrer les parts.', alt_text: 'Barre fractionnée.', data: { parts: 4, filled: 1 } } },
    { id: 's1', type: 'student_try', question: 'Quelle fraction ?', answer_type: 'short_text', correct_answer: '1/4', success_feedback: 'Bravo !', error_feedback: 'Compte les parts.' },
  ], mastery: { skills: ['fractions'], threshold: 0.8 },
});

describe('provider-free composition cleanup', () => {
  it('replaces a nearly identical fraction takeaway', () => {
    const input = base('Quand on partage une quantité en parts égales, la fraction montre combien de parts on prend.', 'Une fraction montre combien de parts égales on prend.');
    const result = normalizeLessonComposition(input, 'Fractions');
    const concept = result.lesson.sequence?.[0] as Record<string, unknown>;
    expect(['Le numérateur compte les parts prises.', 'Le dénominateur indique en combien de parts égales l’unité est partagée.', 'Utilise le visuel pour repérer les parts égales.']).toContain(concept.takeaway);
    expect(semanticDuplicationDiagnostics(concept).some((issue) => issue.fieldB === 'takeaway')).toBe(false);
    expect(result.events.some((event) => event.action === 'takeaway_replaced')).toBe(true);
  });

  it('keeps missing takeaway and malformed key points usable without a provider', () => {
    const result = normalizeLessonComposition(base('Une fraction partage un tout en parts égales.', undefined, ['parts égales', { label: 'Numérateur', text: 'Il compte les parts.' }, { label: 'Numérateur', text: 'Il compte les parts.' }]), 'Fractions');
    const concept = result.lesson.sequence?.[0] as Record<string, unknown>;
    expect(typeof concept.takeaway).toBe('string');
    expect((concept.key_points as unknown[]).length).toBe(1);
    expect(pedagogicalIssues(result.lesson, 'CM2', 'Fractions').filter((issue) => issue.path.endsWith('.takeaway') || issue.path.endsWith('.key_points'))).toEqual([]);
  });
});
