import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColumnArithmetic } from './ColumnArithmetic';

describe('shared written arithmetic display', () => {
  it.each(['+', '−', '×'])('keeps identical row geometry for %s', operator => {
    const html = renderToStaticMarkup(<ColumnArithmetic columns={3} rows={[
      { id: 'annotations', annotation: true, cells: ['', '1', ''] },
      { id: 'operand-top', cells: ['2', '6', '8'] },
      { id: 'operand-bottom', operator, cells: ['4', '5', '7'] },
      { id: 'result', lineBefore: true, cells: ['', '', ''], tone: 'result' },
    ]} explanation="Work from the ones column." />);
    expect(html.match(/grid-template-columns:repeat\(4, 2rem\)/g)).toHaveLength(4);
    expect(html.match(/data-arithmetic-cell=/g)).toHaveLength(12);
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('overflow-hidden');
  });
});
