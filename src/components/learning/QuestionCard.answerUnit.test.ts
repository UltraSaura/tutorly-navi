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

  it('does not read the J in a French contraction as the unit j', () => {
    expect(inferAnswerUnit({ prompt: 'J’achète un jus.' })).toBeUndefined();
  });

  it('does not read the g in gâteaux as grams', () => {
    expect(inferAnswerUnit({ prompt: 'Combien de gâteaux ?' })).toBeUndefined();
  });

  it('shows euros when a price question also mentions litres and uses J’achète', () => {
    expect(inferAnswerUnit({ prompt: '3 litres de jus coûtent 9 euros. J’achète 5 litres. Combien vais-je payer ?' })).toBe('€');
  });

  it('shows euros when a price question contains grams as part of gâteaux', () => {
    expect(inferAnswerUnit({ prompt: '3 gâteaux coûtent 6 euros. Combien coûtent 8 gâteaux ?' })).toBe('€');
  });

  it('shows euros instead of the source mass unit when the question asks for a price', () => {
    expect(inferAnswerUnit({ prompt: '5 kg de riz coûtent 10 euros. Combien coûtent 8 kg ?' })).toBe('€');
  });

  it('keeps a requested mass unit when the question asks for a quantity', () => {
    expect(inferAnswerUnit({ prompt: '5 kg de riz coûtent 10 euros. Combien de kilogrammes peut-on acheter ?' })).toBe('kg');
  });
});
