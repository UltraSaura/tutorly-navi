import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CountableObjectModel } from './CountableObjectModel';

describe('CountableObjectModel', () => {
  it('renders authored quantities as groups and loose objects without revealing the answer', () => {
    const html = renderToStaticMarkup(<CountableObjectModel object="apple" value={23} />);
    expect((html.match(/data-testid="countable-group"/g) ?? []).length).toBe(2);
    expect((html.match(/data-testid="single-objects"/g) ?? []).length).toBe(1);
    expect((html.match(/lucide-apple/g) ?? []).length).toBe(23);
    expect(html).toContain('Each group has 10');
    expect(html).not.toContain('23');
  });

  it('supports a different object and clamps visual output to one hundred', () => {
    const html = renderToStaticMarkup(<CountableObjectModel object="star" value={130} />);
    expect((html.match(/lucide-star/g) ?? []).length).toBe(100);
    expect((html.match(/data-testid="countable-group"/g) ?? []).length).toBe(10);
  });
});
