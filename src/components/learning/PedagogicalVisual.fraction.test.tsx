import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedagogicalVisual } from './PedagogicalVisual';

const render = (data: unknown) => renderToStaticMarkup(
  <PedagogicalVisual block={{ title: 'Fraction', content: 'Une fraction de pizza.', visual: { kind: 'fraction_circle', data, alt_text: 'Pizza partagée en parts égales' } }} />,
);
const renderPizzaComparison = () => renderToStaticMarkup(
  <PedagogicalVisual block={{ title: 'Comparer', content: 'Deux parts de pizza.', visual: { kind: 'comparison', data: { object: 'pizza', left: { label: '3/8', numerator: 3, denominator: 8, items: ['3 parts sur 8'] }, right: { label: '5/8', numerator: 5, denominator: 8, items: ['5 parts sur 8'] }, result: { label: 'Comparaison', items: ['3/8 < 5/8'] } }, alt_text: 'Comparer des fractions de pizza' } }} />,
);

describe('PedagogicalVisual fraction circle', () => {
  it('renders a pizza illustration with equal slices and accessible fraction description', () => {
    const html = render({ numerator: 3, denominator: 4, object: 'pizza' });
    expect(html).toContain('Pizza partagée en 4 parts égales, 3 parts prises : 3/4');
    expect(html).toContain('fill="#c87935"');
    expect((html.match(/<path/g) ?? [])).toHaveLength(4);
  });

  it('keeps generic fraction circles available without pizza decoration', () => {
    const html = render({ numerator: 1, denominator: 3 });
    expect(html).toContain('Disque fractionné');
    expect(html).not.toContain('fill="#c87935"');
  });

  it('shows an improper pizza fraction as one whole pizza and the remaining slices', () => {
    const html = render({ object: 'pizza', numerator: 7, denominator: 4 });
    expect(html).toContain('7/4 de pizza : une pizza entière et 3/4 d’une autre');
    expect(html).toContain('entière');
    expect(html).toContain('3/4');
    expect((html.match(/<path/g) ?? [])).toHaveLength(8);
  });

  it('renders two pizza circles when comparing pizza fractions', () => {
    const html = renderPizzaComparison();
    expect(html).toContain('Comparer deux parts de pizza');
    expect(html).toContain('Pizza partagée en 8 parts égales, 3 parts prises : 3/8');
    expect(html).toContain('Pizza partagée en 8 parts égales, 5 parts prises : 5/8');
    expect(html).not.toContain('class="h-7 flex-1');
  });
});
