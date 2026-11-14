import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CountableDotModel } from './CountableDotModel';

describe('CountableDotModel', () => {
  it('communicates a full ten and extra ones with countable dots', () => {
    const html = renderToStaticMarkup(<CountableDotModel value={12} />);
    expect(html).toContain('12 dots: 1 group of ten and 2 ones');
    expect(html).toContain('grid-cols-5');
    expect(html).toContain('border-[#5145B5]');
    expect((html.match(/data-dot="true"/g) ?? []).length).toBe(12);
    expect(html).toContain('Each group of 10');
    expect(html).toContain('Extra ones');
  });

  it('clamps the displayed quantity to the configured model maximum', () => {
    const html = renderToStaticMarkup(<CountableDotModel value={25} maximum={20} />);
    expect(html).toContain('20 dots: 2 groups of ten and 0 ones');
    expect((html.match(/data-dot="true"/g) ?? []).length).toBe(20);
  });

  it('can describe a question model without revealing the total', () => {
    const html = renderToStaticMarkup(<CountableDotModel value={30} showTotal={false} />);
    expect(html).toContain('Countable dots arranged as 3 groups of ten and 0 ones');
    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain('>30</span>');
  });
});
