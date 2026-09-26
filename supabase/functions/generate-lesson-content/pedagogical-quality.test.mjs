import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pedagogicalIssues } from './pedagogical-quality.ts';

const lesson = (content) => ({ sequence: [
  { type: 'visual' }, { type: 'concept', content }, { type: 'student_try' },
] });

test('repeated duration units do not imply distinct facts', () => {
  const content = 'Une heure contient 60 minutes. Pour convertir des heures en minutes, compte 60 minutes pour chaque heure. Deux heures font donc 120 minutes. Les minutes permettent de décrire la même durée que les heures.';
  assert.deepEqual(pedagogicalIssues(lesson(content), 'CM2', 'Durées'), []);
});
test('long concepts remain rejected with the real sequence index and reason', () => {
  const issues = pedagogicalIssues(lesson(Array(91).fill('mot').join(' ')), 'CM2', 'Durées');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, 'sequence[1].content');
  assert.match(issues[0].message, /91 mots/);
});
test('90 word boundary passes', () => {
  assert.deepEqual(pedagogicalIssues(lesson(Array(90).fill('mot').join(' ')), 'CM2', 'Durées'), []);
});
test('missing interaction and visual remain rejected', () => {
  const issues = pedagogicalIssues({ sequence: [{ type: 'concept', content: 'Une heure vaut 60 minutes.' }] }, 'CM2', 'Durées');
  assert.equal(issues.length, 2);
  assert.match(issues[0].message, /interaction/);
  assert.match(issues[1].message, /visuel/);
});
