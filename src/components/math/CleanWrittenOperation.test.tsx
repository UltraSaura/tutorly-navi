import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CleanWrittenOperation } from './CleanWrittenOperation';
import { buildPlaceValueSolution } from '@/utils/mathStepper/placeValueGrid';

describe('CleanWrittenOperation', () => {
  it('renders a conventional regrouping explanation without technical rows', () => {
    const solution = buildPlaceValueSolution('325 - 148');
    const frame = solution.frames.find((item) => item.id === 'column-0');
    expect(frame).toBeDefined();
    const html = renderToStaticMarkup(<CleanWrittenOperation frame={frame!} columns={solution.columns} expression="325 - 148" result={solution.result} />);

    expect(html).toContain('On commence par les unités');
    expect(html).toContain('15 unités');
    expect(html).not.toContain('unités avant');
    expect(html).not.toContain('valeur avant échange');
    expect(html).not.toContain('Regroupe 1 unité de rang supérieur');
  });

  it('keeps the complete written operation visible while focusing the active column', () => {
    const solution = buildPlaceValueSolution('403 - 178');
    const frame = solution.frames.find((item) => item.id === 'column-0');
    const html = renderToStaticMarkup(<CleanWrittenOperation frame={frame!} columns={solution.columns} expression="403 - 178" result={solution.result} />);

    expect((html.match(/>4</g) ?? []).length).toBeGreaterThan(0);
    expect((html.match(/>0</g) ?? []).length).toBeGreaterThan(0);
    expect((html.match(/>3</g) ?? []).length).toBeGreaterThan(0);
    expect((html.match(/>1</g) ?? []).length).toBeGreaterThan(0);
    expect((html.match(/>7</g) ?? []).length).toBeGreaterThan(0);
    expect((html.match(/>8</g) ?? []).length).toBeGreaterThan(0);
    expect(html).toContain('13 unités');
  });

  it('does not reveal padded zeroes before an intermediate result', () => {
    const solution = buildPlaceValueSolution('247 × 36');
    const frame = solution.frames.find((item) => item.id === 'partial-0');
    expect(frame).toBeDefined();
    const html = renderToStaticMarkup(<CleanWrittenOperation frame={frame!} columns={solution.columns} expression="247 × 36" result={solution.result} />);

    expect(html).not.toContain('>00247<');
    expect(html).not.toContain('>00036<');
    expect(html).toContain('>2</span>');
    expect(html).toContain('>4</span>');
    expect(html).toContain('>7</span>');
  });
});
