import { describe, expect, it } from 'vitest';
import { createEqualGroupsTransfer, equalGroupsFeedback } from './equalGroupsFeedback';
import { guidedFamilyAnswer, makeGuidedFamilyChoices, validateGuidedFamilyExercise, type EqualGroupsExercise } from './guidedFamilies';

const exercise: EqualGroupsExercise = { id: 'groups-source', kind: 'equal-groups', groups: 3, perGroup: 4, object: 'apple', prompt: 'Build equal groups.' };

describe('focused feedback for equal groups', () => {
  it('offers distinct misconception choices so the feedback paths are reachable', () => {
    expect(makeGuidedFamilyChoices(exercise).sort((a, b) => a - b)).toEqual([3, 4, 7, 12]);
    for (let groups = 1; groups <= 10; groups++) for (let perGroup = 1; perGroup <= 10; perGroup++) {
      const choices = makeGuidedFamilyChoices({ ...exercise, groups, perGroup });
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(groups * perGroup);
      expect(choices.every(choice => choice >= 0 && choice <= 100)).toBe(true);
    }
  });
  it('preserves constructed groups and describes the selected possible mismatch', () => {
    expect(equalGroupsFeedback(exercise, 3)).toContain('Tu as peut-être compté les groupes.');
    expect(equalGroupsFeedback(exercise, 4)).toContain('Tu as peut-être compté les objets d’un seul groupe.');
    expect(equalGroupsFeedback(exercise, 7)).toContain('Tu as peut-être additionné le nombre de groupes');
    expect(equalGroupsFeedback(exercise, 5)).toContain('Pense aux groupes dans l’ordre.');
    for (const selected of [3, 4, 7, 5]) expect(equalGroupsFeedback(exercise, selected)).toContain('Tes groupes restent en place.');
  });

  it('does not invent certainty when both simple error patterns share a value', () => {
    const square = { ...exercise, groups: 3, perGroup: 3 };
    expect(equalGroupsFeedback(square, 3)).toContain('Pense aux groupes dans l’ordre.');
  });

  it('recognizes a correct answer before diagnosing a coincidentally equal sum', () => {
    const square = { ...exercise, groups: 2, perGroup: 2 };
    expect(equalGroupsFeedback(square, 4)).toContain('ta réponse correspond');
    expect(equalGroupsFeedback(square, 4)).not.toContain('peut-être');
  });

  it('supports English wording without disclosing the result', () => {
    expect(equalGroupsFeedback(exercise, 3, 'en')).toContain('may have counted the groups');
    expect(equalGroupsFeedback(exercise, 4, 'en')).toContain('just one group');
    expect(equalGroupsFeedback(exercise, 7, 'en')).toContain('may have added');
    expect(equalGroupsFeedback(exercise, 5, 'en')).toContain('Add the amount in one group');
  });

  it('does not claim a model is present during independent transfer', () => {
    for (const selected of [3, 4, 7, 5, 12]) {
      const text = equalGroupsFeedback(exercise, selected, 'fr', false);
      expect(text).not.toContain('restent en place');
      expect(text).not.toContain('bien construits');
      const english = equalGroupsFeedback(exercise, selected, 'en', false);
      expect(english).not.toContain('stay in place');
      expect(english).not.toContain('built correctly');
    }
  });

  it('never writes a numerical result into feedback for any supported factors', () => {
    for (let groups = 1; groups <= 10; groups++) for (let perGroup = 1; perGroup <= 10; perGroup++) {
      const value = { ...exercise, groups, perGroup };
      for (const selected of [groups, perGroup, groups + perGroup, groups * perGroup, 0, 101]) {
        for (const language of ['fr', 'en']) expect(equalGroupsFeedback(value, selected, language)).not.toMatch(/\d/);
      }
    }
  });
});

describe('fresh equal-groups transfer exercise', () => {
  it('changes both factors and product, stays valid and never only swaps the operands', () => {
    for (let groups = 1; groups <= 10; groups++) for (let perGroup = 1; perGroup <= 10; perGroup++) {
      const source = { ...exercise, groups, perGroup };
      const transfer = createEqualGroupsTransfer(source);
      expect(validateGuidedFamilyExercise(transfer)).toEqual([]);
      expect(transfer.groups).not.toBe(groups);
      expect(transfer.perGroup).not.toBe(perGroup);
      expect(guidedFamilyAnswer(transfer)).not.toBe(guidedFamilyAnswer(source));
      expect([transfer.groups, transfer.perGroup]).not.toEqual([perGroup, groups]);
      expect(transfer.object).toBe(source.object);
      expect(transfer.id).not.toBe(source.id);
      expect(transfer.id).toContain(source.id);
      expect(createEqualGroupsTransfer(source)).toEqual(transfer);
      expect(source).toEqual({ ...exercise, groups, perGroup });
    }
  });

  it('updates the prompt and derived identifier from the fresh factors', () => {
    const transfer = createEqualGroupsTransfer(exercise);
    expect(transfer.groups).toBe(4);
    expect(transfer.perGroup).toBe(5);
    expect(transfer.prompt).toContain('4 groupes de 5 pommes');
    expect(transfer.id).toBe('groups-source:transfer:4x5');
  });
});
