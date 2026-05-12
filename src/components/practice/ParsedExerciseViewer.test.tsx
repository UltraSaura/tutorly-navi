import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ParsedExerciseViewer, type ParsedExerciseContent } from './ParsedExerciseViewer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const parsedWithTableAndFallback: ParsedExerciseContent = {
  title: 'Exercice 1 (20 points)',
  context: 'Cette feuille de calcul présente les températures moyennes mensuelles à Tours en 2019.',
  documents: [
    {
      id: 'table-temperatures',
      type: 'table',
      label: 'Tableau des températures',
      caption: 'Températures moyennes mensuelles à Tours en 2019',
      table: {
        headers: ['Mois', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        rows: [['Température en °C', '4,4', '7,8', '9,6', '11,2', '13,4', '19,4', '22,6', '20,5', '17,9', '14,4', '8,2', '7,8']],
      },
      source: { page: 2 },
    },
    {
      type: 'image',
      label: "Capture de l'exercice",
      public_url: 'https://example.test/page-2.png',
      alt: 'Capture PDF complète',
      fallback: true,
    },
  ],
  questions: [
    { id: '1', label: '1.', text: 'Quelle température en novembre ?', points: 4, answer_type: 'short_text', student_answer: null },
  ],
  confidence: 'high',
};

describe('ParsedExerciseViewer structured tables', () => {
  it('renders structured tables as responsive HTML tables', () => {
    const html = renderToStaticMarkup(<ParsedExerciseViewer title="Exercice 1" parsed={parsedWithTableAndFallback} />);

    expect(html).toContain('<table');
    expect(html).toContain('<caption');
    expect(html).toContain('Températures moyennes mensuelles à Tours en 2019');
    expect(html).toContain('<th');
    expect(html).toContain('Température en °C');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('min-w-[34rem]');
  });

  it('keeps fallback images collapsed when a structured table exists', () => {
    const html = renderToStaticMarkup(<ParsedExerciseViewer title="Exercice 1" parsed={parsedWithTableAndFallback} />);
    const tableIndex = html.indexOf('<table');
    const detailsIndex = html.indexOf('<details');

    expect(detailsIndex).toBeGreaterThan(tableIndex);
    expect(html).toContain('Voir la capture originale');
    expect(html).toContain('https://example.test/page-2.png');
  });

  it('does not render student answer controls for raw annale consultation', () => {
    const html = renderToStaticMarkup(<ParsedExerciseViewer title="Exercice 1" parsed={parsedWithTableAndFallback} />);

    expect(html).toContain('Quelle température en novembre ?');
    expect(html).not.toContain('Valider ma réponse');
    expect(html).not.toContain('Voir la correction');
    expect(html).not.toContain('Demander un indice');
    expect(html).not.toContain('Ta réponse');
  });

  it('renders image first and hides html table by default when render_mode is image_first', () => {
    const imageFirstParsed: ParsedExerciseContent = {
      title: 'Exercice 1 (20 points)',
      documents: [
        {
          id: 'table-temperatures',
          type: 'table',
          label: 'Tableau des températures',
          render_mode: 'image_first',
          public_url: 'https://example.test/crop.png',
          table: {
            headers: ['Mois'],
            rows: [['Janvier']],
          },
        },
      ],
      questions: [],
    };
    const html = renderToStaticMarkup(<ParsedExerciseViewer title="Exercice 1" parsed={imageFirstParsed} />);

    // L'image doit être rendue (balise img avec la bonne src)
    expect(html).toContain('<img src="https://example.test/crop.png"');
    
    // Le tableau doit être dans un <details> (caché par défaut)
    expect(html).toContain('<details');
    expect(html).toContain('Voir en tableau accessible');
    expect(html).toContain('<table');
  });
});
