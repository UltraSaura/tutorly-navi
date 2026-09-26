import { describe, expect, it } from 'vitest';
import { inferAnswerUnit } from './QuestionCard';

describe('numeric answer target units', () => {
  it('uses seconds for minute-to-second conversions', () => {
    expect(inferAnswerUnit({ prompt: 'Convertis 5 minutes en secondes.', hint: '1 minute = 60 secondes.' })).toBe('s');
  });

  it('uses minutes for hour-to-minute conversions', () => {
    expect(inferAnswerUnit({ prompt: 'Convertis 2 heures en minutes.' })).toBe('min');
  });

  it('uses centimetres for metre-to-centimetre conversions', () => {
    expect(inferAnswerUnit({ prompt: 'Convertis 3 mètres en centimètres.' })).toBe('cm');
  });

  it('prefers explicit target metadata over prompt order', () => {
    expect(inferAnswerUnit({ prompt: 'Convertis 5 minutes en secondes.', answer_unit: 'seconds' })).toBe('s');
  });
});
