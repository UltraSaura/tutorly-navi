import katex from 'katex';

interface MathTextProps {
  children: string;
  className?: string;
  block?: boolean;
}

// Splits a string into alternating plain-text and math segments.
// Handles $$...$$ (display) and $...$ (inline), in that order.
function parseSegments(text: string): Array<{ type: 'text' | 'inline' | 'display'; value: string }> {
  const segments: Array<{ type: 'text' | 'inline' | 'display'; value: string }> = [];
  // Match $$...$$ first (display), then $...$ (inline)
  const re = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', value: text.slice(last, m.index) });
    }
    const raw = m[0];
    if (raw.startsWith('$$')) {
      segments.push({ type: 'display', value: raw.slice(2, -2) });
    } else {
      segments.push({ type: 'inline', value: raw.slice(1, -1) });
    }
    last = m.index + raw.length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }

  return segments;
}

function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    });
  } catch {
    return latex;
  }
}

// Renders a string that may contain $...$ inline math or $$...$$ display math.
// Falls back to plain text for segments with no math delimiters.
export function MathText({ children, className, block = false }: MathTextProps) {
  const segments = parseSegments(children ?? '');
  const hasMath = segments.some(s => s.type !== 'text');

  if (!hasMath) {
    return block
      ? <span className={className}>{children}</span>
      : <span className={className}>{children}</span>;
  }

  const Tag = block ? 'div' : 'span';

  return (
    <Tag className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: renderMath(seg.value, seg.type === 'display') }}
          />
        );
      })}
    </Tag>
  );
}
