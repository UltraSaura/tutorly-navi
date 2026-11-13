import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubtractionWithDotsModel } from './SubtractionWithDotsModel';

describe('SubtractionWithDotsModel', () => {
  it('renders the chosen objects scattered through the picture area', () => {
    const html = renderToStaticMarkup(<SubtractionWithDotsModel targetCount={6} dotsAdded={6} dotsRemoved={2} object="star" seed="test-stars" />);
    expect(html).toContain('4 stars left; 2 taken away');
    expect(html.match(/data-testid="subtraction-object-left"/g)).toHaveLength(4);
    expect(html.match(/data-testid="subtraction-object-taken"/g)).toHaveLength(2);
    expect(html).toContain('left:');
    expect(html).toContain('top:');
    expect(html).not.toContain('No stars yet');
  });

  it('keeps a clear empty state before the first object is added', () => {
    const html = renderToStaticMarkup(<SubtractionWithDotsModel targetCount={8} dotsAdded={0} dotsRemoved={0} object="apple" />);
    expect(html).toContain('No apples yet');
    expect(html).toContain('0 apples left; 0 taken away');
  });
});
