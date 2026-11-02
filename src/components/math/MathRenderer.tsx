import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { latexToPlainText, normalizeLatexForDisplay } from '@/utils/latexUtils';
import { convertLatexToMarkup } from 'mathlive';

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
    const renderMath = () => {
      try {
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
            markup = convertLatexToMarkup(baseLatex);
          } catch (e) {
            // ignore, will fallback below
          }

          if (markup) {
            renderRef.current.innerHTML = markup;
          } else {
            // Ultimate fallback: keep the math readable instead of exposing raw LaTeX.
            renderRef.current.textContent = latexToPlainText(latex);
          }

        }
      } catch (error) {
        console.error('Failed to render math:', error);
        // Fallback to plain text
        if (renderRef.current) {
          renderRef.current.textContent = latexToPlainText(latex);
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
