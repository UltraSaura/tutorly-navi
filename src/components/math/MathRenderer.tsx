import { MathFormula, MathText } from './MathText';

interface MathRendererProps {
  latex: string;
  className?: string;
  inline?: boolean;
}

/** Shared safe KaTeX display entry point for existing math-only call sites. */
export function MathRenderer({ latex, className, inline = false }: MathRendererProps) {
  return inline
    ? <MathText className={className}>{latex}</MathText>
    : <MathFormula className={className} latex={latex} />;
}
