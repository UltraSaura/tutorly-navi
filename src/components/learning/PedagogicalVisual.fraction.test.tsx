import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedagogicalVisual } from './PedagogicalVisual';

const render = (data: unknown) => renderToStaticMarkup(
  <PedagogicalVisual block={{ title: 'Fraction', content: 'Une fraction de pizza.', visual: { kind: 'fraction_circle', data, alt_text: 'Pizza partagée en parts égales' } }} />,
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
});
