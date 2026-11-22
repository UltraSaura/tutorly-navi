import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedagogicalVisual } from './PedagogicalVisual';

const render = (data: unknown) => renderToStaticMarkup(
  <PedagogicalVisual block={{ title: 'Tableau de proportionnalité', content: 'Comparer les deux grandeurs.', visual: { kind: 'table', data, alt_text: 'Tableau du nombre d’objets et de leur prix' } }} />,
);

describe('PedagogicalVisual table data', () => {
  it('renders a labelled proportionality table with row and column headings', () => {
    const html = render({
      caption: 'Nombre d’objets et prix',
      headers: ['Grandeur', 'Situation de départ', 'Après ×3'],
      rows: [
        ['Nombre d’objets', '3', '9'],
        ['Prix (€)', '6', '18'],
      ],
      note: 'On applique ×3 dans chaque ligne.',
    });

    expect(html).toContain('data-testid="proportionality-table"');
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('<th scope="row"');
    for (const text of ['Nombre d’objets et prix', 'Situation de départ', 'Après ×3', 'Nombre d’objets', '3', '9', 'Prix (€)', '6', '18', 'On applique ×3 dans chaque ligne.']) {
      expect(html).toContain(text);
    }
  });

  it('shows a clear fallback when table rows do not match the headings', () => {
    const html = render({ headers: ['Grandeur', 'Départ', 'Après'], rows: [['Prix (€)', '6']] });
    expect(html).toContain('Tableau non affichable');
    expect(html).toContain('même largeur');
  });
});
