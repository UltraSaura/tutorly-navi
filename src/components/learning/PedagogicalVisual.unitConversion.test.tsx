import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PedagogicalVisual, pluralizeUnit } from './PedagogicalVisual';

const render = (data: unknown) => renderToStaticMarkup(
  <PedagogicalVisual block={{ title: 'Conversions', content: 'Convertir les durées', visual: { kind: 'unit_conversion', data, alt_text: 'Facteurs de conversion' } }} />,
);

describe('PedagogicalVisual unit_conversion data', () => {
  it('renders the generated from/to/factor pair as a visible equality', () => {
    // Exact shape stored in draft 0aae7735 (time topic): {from, to, factor}.
    const html = render({ from: 'heure', to: 'minute', factor: 60 });
    expect(html).toContain('1 heure');
    expect(html).toContain('60 minutes');
    expect(html).not.toContain('[object Object]');
  });

  it('renders the minute-to-second pair from the same draft', () => {
    const html = render({ from: 'minute', to: 'seconde', factor: 60 });
    expect(html).toContain('1 minute');
    expect(html).toContain('60 secondes');
  });

  it('renders a day-to-hours conversion with pluralization', () => {
    const html = render({ from: 'jour', to: 'heure', factor: 24 });
    expect(html).toContain('1 jour');
    expect(html).toContain('24 heures');
  });

  it('renders every row of a conversions array', () => {
    const html = render({ conversions: [{ from: 'heure', to: 'minute', factor: 60 }, { from: 'jour', to: 'heure', factor: 24 }] });
    expect(html).toContain('1 heure');
    expect(html).toContain('60 minutes');
    expect(html).toContain('1 jour');
    expect(html).toContain('24 heures');
  });

  it('renders a units/relations chain as conversion rows', () => {
    const html = render({ units: ['seconde', 'minute', 'heure'], relations: [60, 60] });
    expect((html.match(/role="listitem"/g) ?? []).length).toBe(2);
    expect(html).toContain('1 seconde');
    expect(html).toContain('60 minutes');
    expect(html).toContain('1 minute');
    expect(html).toContain('60 heures');
  });

  it('shows an explicit fallback instead of an empty container when data is missing', () => {
    const html = render({});
    expect(html).toContain('Conversion non affichable');
    expect(html).not.toContain('[object Object]');
  });

  it('pluralizes French units only when the factor is greater than one', () => {
    expect(pluralizeUnit('minute', 60)).toBe('minutes');
    expect(pluralizeUnit('minute', 1)).toBe('minute');
    expect(pluralizeUnit('mois', 12)).toBe('mois');
    expect(pluralizeUnit('seconde', 60)).toBe('secondes');
  });
});
