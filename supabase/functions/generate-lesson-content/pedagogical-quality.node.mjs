import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pedagogicalIssues, semanticDuplicationDiagnostics, validateCompositionRepairOutput } from './pedagogical-quality.ts';

const lesson = (content) => ({ sequence: [
  { type: 'visual' }, { type: 'concept', content }, { type: 'student_try' },
] });

test('repeated duration units do not imply distinct facts', () => {
  const content = 'Une heure contient 60 minutes. Pour convertir des heures en minutes, compte 60 minutes pour chaque heure. Deux heures font donc 120 minutes. Les minutes permettent de décrire la même durée que les heures.';
  assert.deepEqual(pedagogicalIssues({ sequence: [
    { type: 'visual' }, { type: 'concept', content, visual: { kind: 'unit_conversion', purpose: 'Comparer les unités', alt_text: 'Conversion', data: { factor: 60 } }, key_points: [{ label: 'Facteur', text: 'Une heure vaut 60 minutes.' }], takeaway: 'Multiplier par 60.' }, { type: 'student_try' },
  ] }, 'CM2', 'Durées'), []);
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
  assert.ok(issues.some((issue) => /interaction/.test(issue.message)));
  assert.ok(issues.some((issue) => /visuel/i.test(issue.message)));
});

test('structured concepts require useful visual support', () => {
  const issues = pedagogicalIssues({ sequence: [
    { type: 'concept', title: 'Les unités de durée', content: 'On compare des unités de durée.', visual: { kind: 'timeline', data: {} }, key_points: [], takeaway: '' },
    { type: 'student_try' },
  ] }, 'CM2', 'Durées');
  assert.ok(issues.some((issue) => issue.path.endsWith('.visual.data')));
  assert.ok(issues.some((issue) => issue.path.endsWith('.key_points')));
  assert.ok(issues.some((issue) => issue.path.endsWith('.takeaway')));
});

test('a prose-appropriate concept does not need a decorative visual', () => {
  assert.deepEqual(pedagogicalIssues({ sequence: [
    { type: 'concept', title: 'Définition', content: 'Une définition explique le sens précis d’un mot.' },
    { type: 'student_try' },
  ] }, 'CM2', 'Vocabulaire'), []);
});

test('structured concepts reject semantic duplication across teaching fields', () => {
  const issues = pedagogicalIssues({ sequence: [
    { type: 'concept', title: "Lire l'heure", content: "La petite aiguille indique les heures et la grande aiguille indique les minutes.", visual: { kind: 'clock', data: { hour: 3, minute: 30 } }, key_points: [
      { label: 'Heures', text: "La petite aiguille indique les heures." },
      { label: 'Minutes', text: "La grande aiguille indique les minutes." },
    ], takeaway: "Petite aiguille : heures ; grande aiguille : minutes." },
    { type: 'student_try' },
  ] }, 'CM2', 'Durées');
  assert.ok(issues.some((issue) => issue.path.endsWith('.key_points')));
  assert.ok(issues.some((issue) => issue.path.endsWith('.takeaway')));
});

test('structured concepts allow distinct visual, rule and takeaway roles', () => {
  assert.deepEqual(pedagogicalIssues({ sequence: [
    { type: 'concept', title: "Lire l'heure", content: "Une horloge utilise deux aiguilles pour lire l'heure.", visual: { kind: 'clock', data: { hour: 3, minute: 45 } }, key_points: [
      { label: 'Minutes', text: 'Chaque grand chiffre correspond à 5 minutes.' },
    ], takeaway: 'Petite aiguille → heures • Grande aiguille → minutes.' },
    { type: 'visual' },
    { type: 'student_try' },
  ] }, 'CM2', 'Durées'), []);
});

const valid = (title, content, visual) => pedagogicalIssues({ sequence: [
  { type: 'concept', title, content, visual, key_points: [{ label: 'Idée', text: 'Une information utile.' }], takeaway: 'Une règle à retenir.' },
  { type: 'student_try' },
] }, 'CM2', title);

test('clock without visual is rejected by the shared policy', () => {
  const issues = pedagogicalIssues({ sequence: [{ type: 'concept', title: "Lire l'heure", content: "La petite aiguille indique l'heure." }, { type: 'student_try' }] }, 'CM2', 'Durées');
  assert.ok(issues.some((issue) => issue.path === 'sequence[0].visual'));
});
test('clock with deterministic visual passes', () => {
  assert.deepEqual(valid("Lire l'heure", "La petite aiguille indique l'heure.", { kind: 'clock', purpose: 'Lire les aiguilles', alt_text: 'Horloge', data: { hour: 3, minute: 0 } }), []);
});
test('fraction, number line and geometry require their matching visual families', () => {
  assert.deepEqual(valid('Fractions', 'Une fraction montre des parts égales d’un tout.', { kind: 'fraction_bar', purpose: 'Montrer les parts', alt_text: 'Barre fractionnée', data: { parts: 4, filled: 1 } }), []);
  assert.deepEqual(valid('Droite graduée', 'Repérer un nombre sur une droite graduée.', { kind: 'number_line', purpose: 'Positionner le nombre', alt_text: 'Droite graduée', data: { min: 0, max: 10, ticks: 10 } }), []);
  assert.deepEqual(valid('Triangle', 'Un triangle possède trois côtés.', { kind: 'triangle', purpose: 'Voir les côtés', alt_text: 'Triangle', data: { sides: 3 } }), []);
});
test('prose and non-visual relationships remain optional', () => {
  assert.deepEqual(valid('Commutativité', 'Dans une addition, changer l’ordre des nombres ne change pas le résultat.', undefined), []);
});
test('unit conversion without visual is rejected and with a timeline passes', () => {
  const missing = pedagogicalIssues({ sequence: [{ type: 'concept', title: 'Conversion', content: 'Convertir des minutes en secondes.' }, { type: 'student_try' }] }, 'CM2', 'Durées');
  assert.ok(missing.some((issue) => issue.path === 'sequence[0].visual'));
  assert.deepEqual(valid('Conversion', 'Convertir des minutes en secondes.', { kind: 'unit_conversion', purpose: 'Montrer le facteur', alt_text: 'Conversion', data: { from: 'minute', to: 'seconde', factor: 60 } }), []);
});
test('unsupported or empty visual data is rejected', () => {
  const issues = pedagogicalIssues({ sequence: [{ type: 'concept', title: "Lire l'heure", content: "Lire l'heure.", visual: { kind: 'unsupported', purpose: 'x', alt_text: 'x', data: {} }, key_points: [{ label: 'a', text: 'b' }], takeaway: 'c' }, { type: 'student_try' }] }, 'CM2', 'Durées');
  assert.ok(issues.some((issue) => issue.path === 'sequence[0].visual.kind'));
  assert.ok(issues.some((issue) => issue.path === 'sequence[0].visual.data'));
});

test('true mathematical duplication is diagnosed with normalized token evidence', () => {
  const diagnostics = semanticDuplicationDiagnostics({ content: 'Une minute contient 60 secondes.', key_points: [{ label: 'Conversion', text: '60 secondes = 1 minute.' }], takeaway: '1 minute = 60 secondes.' });
  assert.equal(diagnostics[0].fieldA, 'content');
  assert.equal(diagnostics[0].fieldB, 'key_points');
  assert.ok(diagnostics[0].diagnostic.overlap >= 2);
  assert.ok(diagnostics[0].diagnostic.ratio >= 0.65);
});

test('useful complement and visual-text reinforcement pass', () => {
  const base = { sequence: [
    { type: 'concept', title: 'Unités', content: 'On choisit une unité selon la durée mesurée.', visual: { kind: 'unit_conversion', data: { factor: 60 } }, key_points: [{ label: 'Fait', text: '60 secondes = 1 minute.' }], takeaway: 'Repère l’unité de départ et celle d’arrivée.' },
    { type: 'student_try' },
  ] };
  assert.deepEqual(pedagogicalIssues(base, 'CM2', 'Vocabulaire'), []);
});

test('duplicate takeaway fails while strategic takeaway passes', () => {
  const duplicated = { sequence: [
    { type: 'concept', title: 'Unités', content: 'On choisit une unité selon la durée mesurée.', visual: { kind: 'unit_conversion', data: { factor: 60 } }, key_points: [{ label: 'Fait', text: '60 secondes = 1 minute.' }], takeaway: '60 secondes = 1 minute.' },
    { type: 'student_try' },
  ] };
  assert.ok(pedagogicalIssues(duplicated, 'CM2', 'Vocabulaire').some((issue) => issue.path.endsWith('.takeaway')));
  const strategic = JSON.parse(JSON.stringify(duplicated));
  strategic.sequence[0].takeaway = 'Repère l’unité de départ avant de convertir.';
  assert.deepEqual(pedagogicalIssues(strategic, 'CM2', 'Vocabulaire'), []);
});

test('bounded composition repair result revalidates cleanly', () => {
  const candidate = { sequence: [
    { type: 'concept', title: 'Unités', content: 'Une minute contient 60 secondes.', visual: { kind: 'unit_conversion', data: { factor: 60 } }, key_points: [{ label: 'Conversion', text: '60 secondes = 1 minute.' }], takeaway: '1 minute = 60 secondes.' },
    { type: 'student_try' },
  ] };
  assert.ok(pedagogicalIssues(candidate, 'CM2', 'Vocabulaire').length > 0);
  const repaired = { ...candidate, sequence: candidate.sequence.map((block) => block.type === 'concept' ? { ...block, content: 'On choisit une unité selon la durée mesurée.', key_points: [{ label: 'Conversion', text: '60 secondes = 1 minute.' }], takeaway: 'Repère l’unité de départ avant de convertir.' } : block) };
  assert.deepEqual(pedagogicalIssues(repaired, 'CM2', 'Vocabulaire'), []);
});

test('clock, fraction and geometry keep distinct field roles', () => {
  const examples = [
    { title: "Lire l'heure", content: 'Les deux aiguilles indiquent une heure.', visual: { kind: 'clock', data: { hour: 3, minute: 25 } }, key_points: [{ label: 'Minutes', text: 'Chaque grand chiffre vaut 5 minutes.' }], takeaway: 'Lis d’abord les heures, puis les minutes.' },
    { title: 'Fraction', content: 'Une fraction décrit une part d’un tout.', visual: { kind: 'fraction_bar', data: { parts: 4, filled: 1 } }, key_points: [{ label: 'Numérateur', text: 'Il compte les parts prises.' }, { label: 'Dénominateur', text: 'Il compte les parts égales.' }], takeaway: 'Lis le bas pour connaître le nombre de parts.' },
    { title: 'Triangle', content: 'Un triangle est une figure à trois côtés.', visual: { kind: 'triangle', data: { sides: 3 } }, key_points: [{ label: 'Côtés', text: 'Il possède trois côtés.' }], takeaway: 'Compte les côtés pour reconnaître la figure.' },
  ];
  for (const concept of examples) assert.deepEqual(pedagogicalIssues({ sequence: [concept, { type: 'student_try' }] }, 'CM2', concept.title), []);
});

test('composition repair boundary accepts only the canonical three-field shape', () => {
  const valid = validateCompositionRepairOutput({ content: 'On choisit une unité selon la durée mesurée.', key_points: [
    { label: 'Minute', text: '60 secondes = 1 minute' },
    { label: 'Heure', text: '60 minutes = 1 heure' },
  ], takeaway: "Repère l'unité de départ et celle d'arrivée." });
  assert.equal(valid.success, true);
  assert.equal(validateCompositionRepairOutput({ key_points: [{ label: 'Minute' }] }).success, false);
  assert.equal(validateCompositionRepairOutput({ key_points: [{ label: 'Minute', text: '' }] }).success, false);
  assert.equal(validateCompositionRepairOutput({ key_points: '60 secondes = 1 minute' }).success, false);
  assert.equal(validateCompositionRepairOutput({ content: 'x', key_points: [{ label: 'Minute', text: '60 secondes = 1 minute' }], takeaway: 'y', visual: { kind: 'clock' } }).success, false);
});
