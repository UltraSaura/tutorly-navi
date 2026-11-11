import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CountableDotModel } from './CountableDotModel';

describe('CountableDotModel', () => {
  it('communicates a full ten and extra ones with countable dots', () => {
    const html = renderToStaticMarkup(<CountableDotModel value={12} />);
    expect(html).toContain('12 dots: 1 group of ten and 2 ones');
    expect(html).toContain('grid-cols-10');
    expect((html.match(/data-dot="true"/g) ?? []).length).toBe(12);
    expect(html).toContain('Each group of 10');
    expect(html).toContain('Extra ones');
  });

  it('clamps the displayed quantity to the configured model maximum', () => {
    const html = renderToStaticMarkup(<CountableDotModel value={25} maximum={20} />);
    expect(html).toContain('20 dots: 2 groups of ten and 0 ones');
    expect((html.match(/data-dot="true"/g) ?? []).length).toBe(20);
  });
});
