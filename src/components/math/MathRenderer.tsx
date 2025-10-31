import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { normalizeLatexForDisplay } from '@/utils/latexUtils';

interface MathRendererProps {
  latex: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer = ({
  latex,
  className,
  inline = false
}: MathRendererProps) => {
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMath = async () => {
      try {
        const mathlive = await import('mathlive');
        
        if (renderRef.current) {
          // Normalize LaTeX for proper rendering
          const normalizedLatex = normalizeLatexForDisplay(latex);

          // Strip common math delimiters to get raw LaTeX
          const stripDelimiters = (text: string): string => {
            const s = text.trim();
            if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
            if (s.startsWith('$') && s.endsWith('$') && !s.startsWith('$$')) return s.slice(1, -1).trim();
            if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();
            if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
            return s;
          };

          const baseLatex = stripDelimiters(normalizedLatex);

          // Prefer direct conversion to markup so symbols like √ render correctly
          let markup = '';
          try {
            const anyMathlive = mathlive as any;
            if (anyMathlive.convertLatexToMarkup) {
              markup = anyMathlive.convertLatexToMarkup(baseLatex);
            }
          } catch (e) {
            // ignore, will fallback below
          }

          if (markup) {
            renderRef.current.innerHTML = markup;
          } else if ((mathlive as any).renderMathInElement) {
            // Fallback: use delimiter scanning
            const content = inline ? `$${baseLatex}$` : `$$${baseLatex}$$`;
            renderRef.current.innerHTML = content;
            (mathlive as any).renderMathInElement(renderRef.current);
          } else {
            // Ultimate fallback to plain text
            renderRef.current.textContent = latex;
          }

        }
      } catch (error) {
        console.error('Failed to render math:', error);
        // Fallback to plain text
        if (renderRef.current) {
          renderRef.current.textContent = latex;
        }
      }
    };

    if (latex) {
      renderMath();
    }
  }, [latex, inline]);

  return (
    <div
      ref={renderRef}
      className={cn(
        "math-renderer",
        inline ? "inline-block" : "block",
        className
      )}
    />
  );
};