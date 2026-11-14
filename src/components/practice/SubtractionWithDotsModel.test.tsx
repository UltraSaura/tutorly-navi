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

  it('renders full color objects and a clear color-count cue when requested', () => {
    const html = renderToStaticMarkup(<SubtractionWithDotsModel targetCount={6} dotsAdded={6} dotsRemoved={2} object="apple" seed="color-count-test" countColor="red" />);
    expect(html).toContain('data-object-color=');
    expect(html).toContain('Count the red apples');
    expect(html).toMatch(/\d red apples? left/);
    expect(html).toContain('fill="#');
  });

  it('does not reveal the result in a learner prompt before an answer is chosen', () => {
    const html = renderToStaticMarkup(<SubtractionWithDotsModel targetCount={8} dotsAdded={8} dotsRemoved={1} object="apple" revealAnswerCount={false} />);
    expect(html).not.toContain('Apples: 8 of 8');
    expect(html).not.toContain('Apples left: 7');
    expect(html).not.toContain('Taken away: 1');
    expect(html).not.toContain('8 of 8 apples added');
    expect(html).toContain('Count the apples. Objects marked with a cross have been taken away.');
    expect(html.match(/apple, still here/g)).toHaveLength(7);
    expect(html.match(/apple, crossed out/g)).toHaveLength(1);
  });

  it('renders all objects for larger authored counts with smaller icons', () => {
    const html = renderToStaticMarkup(<SubtractionWithDotsModel targetCount={100} dotsAdded={100} dotsRemoved={0} object="apple" seed="hundred" revealAnswerCount={false} />);
    expect(html.match(/data-testid="subtraction-object-left"/g)).toHaveLength(100);
    expect(html).toContain('h-3 w-3');
  });
});
