import { describe, expect, it } from 'vitest';
import { buildPracticeBankCatalogue } from './usePracticeBankCatalogue';

const topic = { id: 'topic-5e', curriculum_country_code: 'FR', curriculum_level_code: '5ème' };
const bank = { id: 'bank-1', school_levels: ['5e'] };
const question = { bank_id: 'bank-1', payload: { id: 'q1', kind: 'single', prompt: 'Question' } };

function build(overrides: Partial<Parameters<typeof buildPracticeBankCatalogue>[0]> = {}) {
  return buildPracticeBankCatalogue({
    topics: [topic],
    assignments: [{ topic_id: topic.id, bank_id: bank.id, display_context: 'practice', is_active: true }],
    banks: [bank],
    questions: [question],
    country: 'fr',
    level: '5eme',
    ...overrides,
  });
}

describe('Practice bank catalogue', () => {
  it('returns only a bank assigned to the exact learner topic with questions', () => {
    const result = build();
    expect(result.bankByTopic.get(topic.id)).toBe(bank.id);
    expect(result.eligibleBankIds).toEqual(new Set([bank.id]));
  });

  it('allows legacy empty bank level metadata to inherit the matched topic level', () => {
    expect(build({ banks: [{ id: bank.id, school_levels: null }] }).eligibleBankIds.has(bank.id)).toBe(true);
    expect(build({ banks: [{ id: bank.id, school_levels: [] }] }).eligibleBankIds.has(bank.id)).toBe(true);
  });

  it('requires explicit bank levels to include the learner level alias', () => {
    expect(build({ banks: [{ id: bank.id, school_levels: ['cm2'] }] }).eligibleBankIds.size).toBe(0);
  });

  it('requires an exact learner country and level on the assigned topic', () => {
    expect(build({ country: 'be' }).eligibleBankIds.size).toBe(0);
    expect(build({ topics: [{ ...topic, curriculum_level_code: 'cm2' }] }).eligibleBankIds.size).toBe(0);
  });

  it('accepts Practice and Both assignments, but excludes lesson-only and inactive assignments', () => {
    expect(build({ assignments: [{ topic_id: topic.id, bank_id: bank.id, display_context: 'both', is_active: true }] }).eligibleBankIds.size).toBe(1);
    expect(build({ assignments: [{ topic_id: topic.id, bank_id: bank.id, display_context: 'lesson', is_active: true }] }).eligibleBankIds.size).toBe(0);
    expect(build({ assignments: [{ topic_id: topic.id, bank_id: bank.id, display_context: 'practice', is_active: false }] }).eligibleBankIds.size).toBe(0);
    expect(build({ assignments: [{ topic_id: topic.id, bank_id: bank.id, display_context: 'practice', is_active: null }] }).eligibleBankIds.size).toBe(0);
  });

  it('hides empty banks and banks containing any learner-ineligible curriculum question', () => {
    expect(build({ questions: [] }).eligibleBankIds.size).toBe(0);
    expect(build({ questions: [question, { bank_id: bank.id, payload: { kind: 'coordinate-plane', curriculumCountry: 'fr', schoolLevels: ['cm2'] } }] }).eligibleBankIds.size).toBe(0);
  });

  it('does not expose an assignment to a topic outside the supplied topic catalogue', () => {
    expect(build({ assignments: [{ topic_id: 'other-topic', bank_id: bank.id, display_context: 'practice', is_active: true }] }).eligibleBankIds.size).toBe(0);
  });
});
