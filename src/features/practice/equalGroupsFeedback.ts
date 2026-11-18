import { guidedFamilyAnswer, guidedFamilyPrompt, type EqualGroupsExercise } from './guidedFamilies';

/** Diagnose an answer cautiously; retain the learner's already-built equal groups. */
export function equalGroupsFeedback(exercise: EqualGroupsExercise, selected: number, language = 'fr', hasModel = true): string {
  const fr = language.startsWith('fr');
  const answer = guidedFamilyAnswer(exercise);
  if (selected === answer) return fr
    ? (hasModel ? 'Tes groupes sont bien construits et ta réponse correspond à tous les objets réunis.' : 'Ta réponse correspond à tous les objets réunis.')
    : (hasModel ? 'Your groups are built correctly and your answer matches all the objects together.' : 'Your answer matches all the objects together.');
  const preserve = hasModel ? (fr ? 'Tes groupes restent en place. ' : 'Your groups stay in place. ') : '';
  const generic = fr
    ? 'Pense aux groupes dans l’ordre. Additionne la quantité d’un groupe autant de fois qu’il y a de groupes.'
    : 'Think through the groups in order. Add the amount in one group once for every group.';
  if (selected === exercise.groups && selected === exercise.perGroup) return preserve + generic;
  if (selected === exercise.groups) return preserve + (fr
    ? 'Tu as peut-être compté les groupes. Chaque groupe contient une quantité d’objets : compte les objets de chaque groupe et réunis ces quantités.'
    : 'You may have counted the groups. Each group contains objects: count the objects in every group and combine those amounts.');
  if (selected === exercise.perGroup) return preserve + (fr
    ? 'Tu as peut-être compté les objets d’un seul groupe. Garde cette quantité et ajoute la même quantité pour chaque autre groupe.'
    : 'You may have counted the objects in just one group. Keep that amount and add the same amount for every other group.');
  if (selected === exercise.groups + exercise.perGroup) return preserve + (fr
    ? 'Tu as peut-être additionné le nombre de groupes et la taille d’un groupe. Ici, chaque groupe apporte la même quantité : additionne ces quantités répétées.'
    : 'You may have added the number of groups to the size of one group. Each group contributes the same amount: add those repeated amounts.');
  return preserve + generic;
}

/** Fresh transfer preserves the object, but changes both factors and their product. */
export function createEqualGroupsTransfer(exercise: EqualGroupsExercise): EqualGroupsExercise {
  const groups = exercise.groups % 10 + 1;
  const perGroup = exercise.perGroup % 10 + 1;
  const transfer: EqualGroupsExercise = {
    ...exercise,
    id: `${exercise.id}:transfer:${groups}x${perGroup}`,
    groups,
    perGroup,
    prompt: '',
  };
  transfer.prompt = guidedFamilyPrompt(transfer);
  return transfer;
}
