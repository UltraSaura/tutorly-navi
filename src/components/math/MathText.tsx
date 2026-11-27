import { Children, cloneElement, Fragment, isValidElement, type ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './math-renderer.css';

type Segment = { kind: 'text' | 'math'; value: string; display?: boolean };

const fractionPattern = /(?<![\w./:-])([+-]?\d+)\s*\/\s*(\d+)(?![\w/:-]|\.\d)/g;
const explicitMathPattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
const rawFractionPattern = /\\(?:d?frac)\{[^{}\n]{1,80}\}\{[^{}\n]{1,80}\}/g;

function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(explicitMathPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push(...tokenizePlain(text.slice(cursor, index)));
    const display = match[1] !== undefined || match[4] !== undefined;
    const value = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    segments.push({ kind: 'math', value, display });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) segments.push(...tokenizePlain(text.slice(cursor)));
  return segments;
}

function tokenizePlain(text: string): Segment[] {
  const candidates: Array<{ start: number; end: number; value: string }> = [];
  for (const match of text.matchAll(fractionPattern)) {
    const index = match.index ?? 0;
    const context = text.slice(Math.max(0, index - 24), index).toLocaleLowerCase();
    if (/(?:ratio|rapport|chemin|path|url)\s*(?:est\s*)?$/.test(context)) continue;
    candidates.push({ start: index, end: index + match[0].length, value: `\\frac{${match[1]}}{${match[2]}}` });
  }
  for (const match of text.matchAll(rawFractionPattern)) {
    const index = match.index ?? 0;
    candidates.push({ start: index, end: index + match[0].length, value: match[0] });
  }
  candidates.sort((a, b) => a.start - b.start || a.end - b.end);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const candidate of candidates) {
    if (candidate.start < cursor) continue;
    if (candidate.start > cursor) segments.push({ kind: 'text', value: text.slice(cursor, candidate.start) });
    segments.push({ kind: 'math', value: candidate.value });
    cursor = candidate.end;
  }
  if (cursor < text.length) segments.push({ kind: 'text', value: text.slice(cursor) });
  return segments.length ? segments : [{ kind: 'text', value: text }];
}

function renderMath(value: string, display: boolean): ReactNode {
  // KaTeX runs with trust disabled. HTML is generated only by KaTeX from LaTeX;
  // lesson text is never interpreted as HTML and input fields do not use this component.
  const commands = [...value.slice(0, 500).matchAll(/\\([A-Za-z]+|.)/g)].map((match) => match[1]);
  const allowed = new Set(['frac', 'dfrac', 'tfrac', 'sqrt', 'times', 'cdot', 'div', 'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'pi', 'alpha', 'beta', 'gamma', 'theta', 'begin', 'end', 'aligned', 'text', 'left', 'right', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'operatorname', 'overline', 'bar', 'vec', 'ldots', 'cdots', 'infty', 'sum', 'prod', 'displaystyle']);
  if (commands.some((command) => command !== '\\' && !allowed.has(command) && !',;:!()[]{}%&_#$ '.includes(command))) {
    return <span className="stuwy-math-unsupported">Expression mathématique non prise en charge.</span>;
  }
  let html: string;
  try {
    html = katex.renderToString(value.slice(0, 500), {
      displayMode: display,
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 100,
      maxSize: 10,
      output: 'htmlAndMathml',
    });
  } catch {
    return <span className="stuwy-math-unsupported">Expression mathématique non prise en charge.</span>;
  }
  const Tag = 'span';
  return <Tag className={display ? 'stuwy-math-display' : 'stuwy-math-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
}

function plainMathToLatex(value: string): string {
  return value.replace(/(?<![\w./:-])([+-]?\d+)\s*\/\s*(\d+)(?![\w/:-]|\.\d)/g, '\\frac{$1}{$2}');
}

export function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const segments = tokenize(children);
  return <span className={className}>{segments.map((segment, index) =>
    segment.kind === 'math'
      ? <span key={index}>{renderMath(segment.value, segment.display ?? false)}</span>
      : <span key={index}>{segment.value}</span>,
  )}</span>;
}

export function MathFormula({
  latex,
  className,
  ariaLabel,
}: {
  latex: string;
  className?: string;
  ariaLabel?: string;
}) {
  const source = latex.trim()
    .replace(/^\$\$([\s\S]*)\$\$$/, '$1')
    .replace(/^\$([^$]*)\$$/, '$1')
    .replace(/^\\\(([\s\S]*)\\\)$/, '$1')
    .replace(/^\\\[([\s\S]*)\\\]$/, '$1');
  return <div className={className} role="math" aria-label={ariaLabel ?? latex}>
    {renderMath(plainMathToLatex(source), true)}
  </div>;
}

/** Adds safe math rendering to visible text descendants without touching values/attributes. */
export function MathTextTree({ children }: { children: ReactNode }) {
  const visit = (node: ReactNode, key: string): ReactNode => {
    if (typeof node === 'string' && /(?:[+-]?\d+\s*\/\s*\d+|\\(?:d?frac)\{)/.test(node)) {
      return <MathText key={key}>{node}</MathText>;
    }
    if (Array.isArray(node)) return node.map((child, index) => visit(child, `${key}-${index}`));
    if (!isValidElement<{ children?: ReactNode }>(node)) return node;
    const type = node.type;
    if (type === Fragment) {
      return cloneElement(node, { key }, Children.map(node.props.children, (child, index) => visit(child, `${key}-${index}`)));
    }
    if (type === MathText || type === MathFormula || typeof type !== 'string' || ['svg', 'math', 'code', 'pre', 'script', 'style', 'textarea', 'option'].includes(type)) return node;
    const nested = node.props.children;
    if (nested === undefined) return node;
    return cloneElement(node, { key }, Children.map(nested, (child, index) => visit(child, `${key}-${index}`)));
  };
  return <>{visit(children, 'math-text')}</>;
}
