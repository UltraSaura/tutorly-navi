import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PenCountModel } from './PenCountModel';

describe('PenCountModel', () => {
  it('shows bundled pens and loose pens without printing the answer total', () => {
    const html = renderToStaticMarkup(<PenCountModel value={47} />);
    expect((html.match(/data-testid="pen-bundle"/g) ?? []).length).toBe(4);
    expect((html.match(/data-testid="single-pens"/g) ?? []).length).toBe(1);
    expect((html.match(/lucide-pencil/g) ?? []).length).toBe(47);
    expect(html).toContain('Each outlined bundle has 10 pens');
    expect(html).not.toContain('47');
  });

  it('clamps the pen picture at one hundred', () => {
    const html = renderToStaticMarkup(<PenCountModel value={130} />);
    expect((html.match(/lucide-pencil/g) ?? []).length).toBe(100);
    expect((html.match(/data-testid="pen-bundle"/g) ?? []).length).toBe(10);
  });
});
