import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseExercisePedagogical, parsePdfToExam, splitExercises } from './pdf-to-exam.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const syntheticPaper = `
DIPLÔME national
Exercice 1 (10 points)
Court.
1) Un?

Exercice 3 (20 points)

Pour chaque question trois réponses. Recopier le numéro et la réponse.

PARTIE A :
Une urne contient des jetons.

1. Première question partie A?

2. Deuxième question partie A?

\fPARTIE B :
On considère la figure suivante.

   3. Troisième question partie B?

   4. Quatrième question partie B?

   5. Cinquième question partie B?

Exercice 4 (20 points)
Suite sujet suivant.
1) Question suivante exercice quatre?
`;

const exercise1WithTemperatureTable = `
Exercice 1 (20 points)

Cette feuille de calcul présente les températures moyennes mensuelles à Tours en 2019.

  Mois          J     F     M     A     M     J     J     A     S     O     N     D
  Température en °C  4,4   7,8   9,6   11,2  13,4  19,4  22,6  20,5  17,9  14,4  8,2   7,8

1) D’après le tableau ci-dessus, quelle a été la température moyenne à Tours en novembre 2019 ?
2) Déterminer l’étendue de cette série.
3) Quelle formule doit-on saisir en cellule N2 pour calculer la température moyenne annuelle ?
4) Vérifier que la température moyenne annuelle est 13,1 °C.
5) La température moyenne annuelle à Tours en 2009 était de 11,9 °C. Justifier la réponse.

21GENMATMEAG1 Page 2 sur 8
`;

describe('pdf-to-exam PARTIE markers and form feed inside one exercise', () => {
  it('splitExercises keeps a single fragment for Exercise 3 (PARTIE B is not a new exercise)', () => {
    const { items } = splitExercises(syntheticPaper);
    const numbers = items.map((i) => i.number).filter((n): n is number => typeof n === 'number');
    expect(numbers).toContain(1);
    expect(numbers).toContain(3);
    expect(numbers).toContain(4);

    const ex3 = items.find((i) => i.number === 3);
    expect(ex3).toBeDefined();
    expect(ex3!.raw_text).toMatch(/PARTIE\s+A/i);
    expect(ex3!.raw_text).toMatch(/PARTIE\s+B/i);
    expect(/\f/u.test(ex3!.raw_text)).toBe(true);
    expect(ex3!.raw_text).not.toMatch(/Exercice\s+4/);
  });

  it('parseExercisePedagogical: Partie A + Partie B, questions 1–5, merged flat list', () => {
    const ex3 = splitExercises(syntheticPaper).items.find((i) => i.number === 3)!;
    const parsed = parseExercisePedagogical(ex3.raw_text, 'Exercice 3 (20 points)', 3);

    expect(parsed.parts?.length).toBe(2);
    expect(parsed.parts?.[0]?.label).toMatch(/partie\s+a/i);
    expect(parsed.parts?.[1]?.label).toMatch(/partie\s+b/i);

    expect(parsed.questions).toHaveLength(5);
    expect(parsed.questions.map((q) => q.id)).toEqual(['1', '2', '3', '4', '5']);

    expect(parsed.parts![0]!.questions).toHaveLength(2);
    expect(parsed.parts![1]!.questions).toHaveLength(3);
    expect(parsed.questions[0]?.text).toMatch(/Première question partie A/i);
    expect(parsed.questions[4]?.text).toMatch(/Cinquième question partie B/i);
  });

  it('normalizes \\f before question detection (Partie B questions included)', () => {
    const onlyEx3 =
      'Exercice 3 (20 points)\n\nInstructions communes.\n\nPARTIE A :\nCx A.\n\n1. Q1?\n\fPARTIE B :\nCx B.\n\n2. Q2?\n3. Q3?\n';
    const parsed = parseExercisePedagogical(onlyEx3, 'Exercice 3 (20 points)', 3);
    expect(parsed.parts?.length).toBeGreaterThanOrEqual(2);
    const ids = parsed.questions.map((q) => q.id);
    expect(ids).toContain('1');
    expect(ids).toContain('3');
  });

  it('fixture file: Exercice 3 unique avec \\f et PARTIE B attachée', () => {
    const paper = readFileSync(join(__dirname, '../fixtures/dnb-exercise3-partie-pagebreak.txt'), 'utf8');
    expect(paper.includes('\f') || paper.includes('\u000c')).toBe(true);
    const { items } = splitExercises(paper);
    const ex3 = items.find((i) => i.number === 3);
    expect(ex3).toBeDefined();
    expect(ex3!.raw_text).toMatch(/PARTIE\s+B/i);
    const parsed = parseExercisePedagogical(ex3!.raw_text, 'Exercice 3 (20 points)', 3);
    expect(parsed.parts?.length).toBe(2);
    expect(parsed.questions.map((q) => q.id).join(',')).toBe('1,2,3,4,5');
  });
});

describe('pdf-to-exam structured documents', () => {
  it('adds the DNB Amiens 2021 temperature table as a structured table document', () => {
    const parsed = parseExercisePedagogical(exercise1WithTemperatureTable, 'Exercice 1 (20 points)', 1);
    const table = parsed.documents.find((doc) => doc.id === 'table-temperatures');
    expect(table).toBeDefined();
    expect(table?.type).toBe('table');
    expect(table?.table?.headers).toEqual(['Mois', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']);
    expect(table?.table?.rows[0]).toContain('22,6');
    expect(parsed.questions.map((q) => q.id)).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('pdf-to-exam exam levels', () => {
  it('generates DNB papers with level 3eme and cycle_4', async () => {
    const text = 'Exercice 1 (10 points)\\n1) Calculer 2 + 2.';
    const fakePdf = new TextEncoder().encode(`(${text}) Tj`);
    const parsed = await parsePdfToExam({
      source_name: 'ac-amiens-maths',
      source_url: 'https://example.test/source',
      fetched_at: '2026-05-09T00:00:00.000Z',
      exam: 'dnb',
      session_year: 2021,
      discipline: 'mathematiques',
      series: 'generale',
      location: 'metropole',
      variant: 'standard',
      pdf_url: 'https://example.test/dnb.pdf',
      title: 'DNB 2021',
    }, fakePdf);

    expect(parsed.paper.level).toBe('3eme');
    expect(parsed.paper.school_cycle).toBe('cycle_4');
  });
});
