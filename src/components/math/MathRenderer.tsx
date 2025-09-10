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
        const { renderMathInElement } = await import('mathlive');
        
        if (renderRef.current) {
          // Normalize LaTeX for proper rendering
          const normalizedLatex = normalizeLatexForDisplay(latex);
          
          // Wrap latex in delimiters if not already present
          const mathContent = normalizedLatex.startsWith('$') || normalizedLatex.startsWith('\\') 
            ? normalizedLatex 
            : inline ? `$${normalizedLatex}$` : `$$${normalizedLatex}$$`;
          
          console.log('[MathRenderer] Rendering math:', {
            original: latex,
            normalized: normalizedLatex,
            mathContent: mathContent
          });
          
          renderRef.current.innerHTML = mathContent;
          renderMathInElement(renderRef.current);
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