import { describe, expect, it } from 'vitest';
import { detectStructuredTables } from './table-detector.ts';

const exercise1Text = `
Exercice 1 (20 points)

Cette feuille de calcul présente les températures moyennes mensuelles à Tours en 2019.

  Mois          J     F     M     A     M     J     J     A     S     O     N     D
  Température en °C  4,4   7,8   9,6   11,2  13,4  19,4  22,6  20,5  17,9  14,4  8,2   7,8

1) D’après le tableau ci-dessus, quelle a été la température moyenne à Tours en novembre 2019 ?

21GENMATMEAG1 Page 2 sur 8
`;

describe('detectStructuredTables', () => {
  it('detects the DNB Amiens 2021 temperature table', () => {
    const [doc] = detectStructuredTables(exercise1Text);
    expect(doc).toBeDefined();
    expect(doc.id).toBe('table-temperatures');
    expect(doc.type).toBe('table');
    expect(doc.label).toBe('Tableau des températures');
    expect(doc.caption).toBe('Températures moyennes mensuelles à Tours en 2019');
    expect(doc.table.headers).toEqual(['Mois', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']);
    expect(doc.table.rows).toEqual([
      ['Température en °C', '4,4', '7,8', '9,6', '11,2', '13,4', '19,4', '22,6', '20,5', '17,9', '14,4', '8,2', '7,8'],
    ]);
    expect(doc.source?.page).toBe(2);
  });

  it('does not emit a table when the temperature values are absent', () => {
    expect(detectStructuredTables('Exercice sans tableau de températures.')).toEqual([]);
  });

  it('reconstructs the Amiens 2021 table when the PDF text omits spreadsheet cells', () => {
    const [doc] = detectStructuredTables(`
      Cette feuille de calcul présente les températures moyennes mensuelles à Tours en 2019.
      1) D’après le tableau ci-dessus, quelle a été la température moyenne à Tours en novembre 2019 ?
      3) Quelle formule doit-on saisir en cellule N2 pour calculer la température moyenne annuelle ?
      21GENMATMEAG1 Page 2 sur 8
    `);

    expect(doc?.id).toBe('table-temperatures');
    expect(doc?.table.rows[0]?.at(-1)).toBe('7,8');
  });
});
