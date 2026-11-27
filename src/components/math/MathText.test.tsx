import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathFormula, MathText, MathTextTree } from './MathText';

describe('shared mathematical display', () => {
  it('renders a plain fraction in vertical MathML and visual markup', () => {
    const html = renderToStaticMarkup(<MathText>Résultat : 3/4.</MathText>);
    expect(html).toContain('<mfrac>');
    expect(html).toContain('<mn>3</mn>');
    expect(html).toContain('<mn>4</mn>');
  });

  it('supports explicit frac and dfrac notation with negative, mixed and symbolic terms', () => {
    const html = renderToStaticMarkup(<MathText>{'\\( -\\dfrac{5}{2} + 1 + \\frac{a+b}{c} + \\frac{2}{3}\\times\\frac{4}{5} \\)'}</MathText>);
    expect((html.match(/<mfrac>/g) ?? []).length).toBe(4);
    expect(html).toContain('frac-line');
  });

  it('does not rewrite URL, path, date, or explicitly named ratio slashes', () => {
    const html = renderToStaticMarkup(<MathText>{'https://example.com/3/4 src/3/4 2026/11/27 ratio 3/4'}</MathText>);
    expect(html).not.toContain('<mfrac>');
    expect(html).toContain('https://example.com/3/4');
  });

  it('renders a fraction inside a complete dynamic student instruction', () => {
    const question = `Sélectionne 3 quarts sur les 4 parts de la barre pour représenter la fraction ${3}/${4}.`;
    const html = renderToStaticMarkup(<MathText>{question}</MathText>);
    expect(html).toContain('<mfrac>');
    expect(html).toContain('Sélectionne 3 quarts');
  });

  it('renders existing delimited fractions embedded in lesson prose', () => {
    const prose = 'Chaque morceau représente un quart (\\(\\frac{1}{4}\\)).';
    const html = renderToStaticMarkup(<MathTextTree><section><><p>{prose}</p></></section></MathTextTree>);
    expect(html).toContain('<mfrac>');
    expect(html.slice(html.indexOf('class="katex-html">'))).not.toContain('\\frac');
  });

  it('keeps raw HTML inert and renders an aligned display formula', () => {
    const html = renderToStaticMarkup(<MathFormula latex={'\\begin{aligned}\\frac{3}{4}\\\\&=\\frac{5}{4}\\end{aligned}'} />);
    expect(html).toContain('<mfrac>');
    expect(html).toContain('katex-display');
    const text = renderToStaticMarkup(<MathText>{'<img src=x onerror=alert(1)>'}</MathText>);
    expect(text).not.toContain('<img');
  });

  it('renders unsupported LaTeX commands as a safe message, not raw source', () => {
    const html = renderToStaticMarkup(<MathText>{'\\(\\href{javascript:alert(1)}{ouvrir}\\)'}</MathText>);
    expect(html).toContain('Expression mathématique non prise en charge.');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('\\href');
  });
});
