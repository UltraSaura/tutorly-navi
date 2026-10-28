import { describe, expect, it } from 'vitest';
import { groupRelatedLessons } from './groupRelatedLessons';

describe('related lesson presentation', () => {
  it('groups known topics without losing their identity or progress', () => {
    const topics = [
      { id: 'ce93a21e-fce2-4f19-b4b8-4979afe69dc7', completed: true },
      { id: 'unrelated', completed: false },
      { id: '6541505b-1af3-4978-88bf-8787d75bc300', completed: false },
    ];
    const groups = groupRelatedLessons(topics);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Proportionnalité');
    expect(groups[0].topics).toEqual([topics[0], topics[2]]);
    expect(groups[0].topics[0]).toBe(topics[0]);
    expect(groups[1].topics).toEqual([topics[1]]);
  });
  it('does not merge unknown topics based on similar names', () => {
    expect(groupRelatedLessons([{ id: 'a' }, { id: 'b' }])).toHaveLength(2);
    expect(groupRelatedLessons([])).toEqual([]);
  });
});
