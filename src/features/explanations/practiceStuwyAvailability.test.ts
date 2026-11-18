import { describe, expect, it } from 'vitest';
import { findPracticeSubtractionTopic } from './practiceStuwyAvailability';

const topics = [{ id: 'sub', topicLabel: 'Soustractions posées', orderIndex: 1 }, { id: 'add', topicLabel: 'Additions', orderIndex: 2 }];

describe('findPracticeSubtractionTopic', () => {
  it('requires a CM1 maths topic and an active Practice assignment', () => {
    expect(findPracticeSubtractionTopic('mathematiques', 'CM1', topics, new Set(['sub']))?.id).toBe('sub');
    expect(findPracticeSubtractionTopic('francais', 'CM1', topics, new Set(['sub']))).toBeNull();
    expect(findPracticeSubtractionTopic('mathematiques', 'CM2', topics, new Set(['sub']))).toBeNull();
    expect(findPracticeSubtractionTopic('mathematiques', 'CM1', topics, new Set())).toBeNull();
  });
  it('does not surface an unrelated topic or practice subject', () => {
    expect(findPracticeSubtractionTopic('maths', 'CM1', topics.slice(1), new Set(['add']))).toBeNull();
  });
  it('accepts a CM1 four-operations topic when it has an active Practice assignment', () => {
    const fourOperations = [{ id: 'operations', topicLabel: 'Les quatre opérations', orderIndex: 1 }];
    expect(findPracticeSubtractionTopic('mathematiques', 'cm1', fourOperations, new Set(['operations']))?.id).toBe('operations');
    expect(findPracticeSubtractionTopic('mathematiques', 'cm1', fourOperations, new Set())).toBeNull();
  });
});
