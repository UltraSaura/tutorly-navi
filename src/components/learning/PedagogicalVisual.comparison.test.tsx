import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedagogicalVisual } from './PedagogicalVisual';

const render = (data: unknown) => renderToStaticMarkup(
  <PedagogicalVisual block={{ title: 'Comparer', content: 'Comparer deux situations.', visual: { kind: 'comparison', data, alt_text: 'Comparaison de deux situations' } }} />,
);

describe('PedagogicalVisual comparison data', () => {
  it('renders the lesson Level 1 comparison lists side by side', () => {
    const html = render({
      left: { label: 'Cahiers et prix', items: ['1 cahier → 2 €', '2 cahiers → 4 €', '3 cahiers → 6 €'] },
      right: { label: 'Âges', items: ['1 an → 10 ans', '2 ans → 11 ans', '3 ans → 12 ans'] },
    });

    expect(html).toContain('data-testid="comparison-visual"');
    expect(html).toContain('aria-label="Comparaison de situations"');
    for (const text of ['Cahiers et prix', '1 cahier → 2 €', '3 cahiers → 6 €', 'Âges', '1 an → 10 ans', '3 ans → 12 ans']) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain('class="space-y-2"></div>');
  });

  it('renders the lesson Level 3 cases and their combined result', () => {
    const html = render({
      left: { label: 'Cas 1', value: '3 objets pour 6 euros' },
      right: { label: 'Cas 2', value: '2 objets pour 4 euros' },
      result: { label: 'Réunion', value: '5 objets pour 10 euros' },
    });

    for (const text of ['Cas 1', '3 objets pour 6 euros', 'Cas 2', '2 objets pour 4 euros', 'Réunion', '5 objets pour 10 euros']) {
      expect(html).toContain(text);
    }
  });

  it('renders the lesson Level 4 two-step comparison without requiring a result panel', () => {
    const html = render({
      left: { label: '2 objets', value: '6 euros' },
      right: { label: '4 objets', value: '12 euros' },
    });

    expect(html).toContain('2 objets');
    expect(html).toContain('6 euros');
    expect(html).toContain('4 objets');
    expect(html).toContain('12 euros');
  });

  it('keeps flat legacy comparison items visible', () => {
    const html = render({ items: ['Premier cas', 'Deuxième cas'] });
    expect(html).toContain('Premier cas');
    expect(html).toContain('Deuxième cas');
  });

  it('shows a visible explanation when comparison data is missing', () => {
    const html = render({});
    expect(html).toContain('role="status"');
    expect(html).toContain('Données de comparaison indisponibles.');
  });
});
