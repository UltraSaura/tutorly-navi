import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GeometryDiagram } from './GeometryDiagram';
import { GroupedRetryPractice } from '@/types/chat';

type DiagramSpec = NonNullable<GroupedRetryPractice['diagram']>;

const renderDiagram = (diagram: DiagramSpec) => renderToStaticMarkup(<GeometryDiagram diagram={diagram} />);

describe('GeometryDiagram', () => {
  it('renders a rectangle outline with explicit visible SVG paint attributes', () => {
    const html = renderDiagram({
      type: 'rectangle',
      labels: ['A', 'B', 'C', 'D'],
      dimensions: { bottom: '10 cm', left: '5 cm' },
      caption: 'Rectangle ABCD',
    });

    expect(html).toContain('<rect');
    expect(html).toContain('fill="white"');
    expect(html).toContain('stroke="#334155"');
    expect(html).toContain('stroke-width="2"');
    expect(html).toContain('vector-effect="non-scaling-stroke"');
    expect(html).toContain('A');
    expect(html).toContain('B');
    expect(html).toContain('C');
    expect(html).toContain('D');
    expect(html).toContain('10 cm');
    expect(html).toContain('5 cm');
  });

  it('renders a square outline with the same explicit visible SVG paint attributes', () => {
    const html = renderDiagram({
      type: 'square',
      labels: ['E', 'F', 'G', 'H'],
      dimensions: { bottom: '6 cm', left: '6 cm' },
    });

    expect(html).toContain('<rect');
    expect(html).toContain('fill="white"');
    expect(html).toContain('stroke="#334155"');
    expect(html).toContain('stroke-width="2"');
    expect(html).toContain('vector-effect="non-scaling-stroke"');
    expect(html).toContain('E');
    expect(html).toContain('F');
    expect(html).toContain('G');
    expect(html).toContain('H');
    expect(html).toContain('6 cm');
  });
});
