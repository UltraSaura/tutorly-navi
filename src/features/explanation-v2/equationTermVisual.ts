import { equationText, rationalText, solutionOf, type EquationTransformation } from './equationSolver';

/** Pure, deterministic term-level storyboard for the validated linear-equation solver.
 * The tokens describe a *single* operation applied to both sides; no string parsing,
 * AI-generated algebra, or heuristic sign changes are involved.
 */
export type EquationTermToken = {
  key: string;
  text: string;
  role: 'cancel' | 'combine' | 'keep' | 'substitute';
};
export type EquationTermVisual = {
  left: EquationTermToken[];
  right: EquationTermToken[];
  caption: string;
  cancellationSide: 'left' | 'right' | 'none';
  cancellationValues: [number, number] | null;
};

const token = (key: string, text: string, role: EquationTermToken['role']): EquationTermToken => ({ key, text, role });
const variable = (n: number): string => n === 1 ? 'x' : n === -1 ? '−x' : n + 'x';
const signedVariable = (n: number): string => n < 0 ? '− ' + variable(-n) : '+ ' + variable(n);
const signedConstant = (n: number): string => n < 0 ? '− ' + Math.abs(n) : '+ ' + n;
const firstConstant = (n: number): string => String(n);

/** This visual always represents the same equation as the solver's beforeState. */
export function equationTermVisual(step: EquationTransformation): EquationTermVisual {
  const { a, b, c, d } = step.beforeState;
  if (step.id === 'subtract-constant') {
    if (b === 0 || !step.afterState || equationText(step.afterState) !== step.after) throw new Error('Invalid constant-cancellation storyboard');
    return {
      left: [
        token('left-x', variable(a), 'keep'),
        token('left-constant', signedConstant(b), 'cancel'),
        token('left-inverse', signedConstant(-b), 'cancel'),
      ],
      right: [
        token('right-constant', firstConstant(c), 'combine'),
        token('right-operation', signedConstant(-b), 'combine'),
      ],
      caption: (b > 0 ? '+' + b + ' et −' + b : '−' + Math.abs(b) + ' et +' + Math.abs(b)) +
        ' font 0 à gauche. À droite, on calcule ' + c + (b > 0 ? ' − ' + b : ' + ' + Math.abs(b)) + '.',
      cancellationSide: 'left',
      cancellationValues: [b, -b],
    };
  }
  if (step.id === 'subtract-variable') {
    if (d === 0 || !step.afterState || equationText(step.afterState) !== step.after) throw new Error('Invalid variable-cancellation storyboard');
    return {
      left: [
        ...(a !== 0 ? [token('left-variable', variable(a), 'combine')] : []),
        ...(b !== 0 ? [token('left-constant', a === 0 ? firstConstant(b) : signedConstant(b), 'keep')] : []),
        ...(a === 0 && b === 0 ? [token('left-zero', '0', 'keep')] : []),
        token('left-operation', signedVariable(-d), 'combine'),
      ],
      right: [
        token('right-variable', variable(d), 'cancel'),
        ...(c !== 0 ? [token('right-constant', signedConstant(c), 'keep')] : []),
        token('right-operation', signedVariable(-d), 'cancel'),
      ],
      caption: variable(d) + ' et ' + signedVariable(-d) + ' font 0 à droite. À gauche, on regroupe ' + variable(a) + ' et ' + signedVariable(-d) + '.',
      cancellationSide: 'right',
      cancellationValues: [d, -d],
    };
  }
  if (step.id === 'divide') {
    if (a === 0 || a === 1 || b !== 0 || d !== 0) throw new Error('Invalid division storyboard');
    const answer = rationalText(solutionOf(step.beforeState));
    if (step.after !== 'x = ' + answer) throw new Error('Division result differs from exact solution');
    return {
      left: [
        token('left-coefficient', String(a), 'cancel'),
        token('left-multiply', '×', 'keep'),
        token('left-x', 'x', 'keep'),
        token('left-divisor', '÷ (' + a + ')', 'cancel'),
      ],
      right: [
        token('right-constant', String(c), 'combine'),
        token('right-divisor', '÷ (' + a + ')', 'combine'),
      ],
      caption: 'Le coefficient ' + a + ' est annulé par la division par ' + a + ' : il reste un seul x. À droite, ' + c + ' ÷ (' + a + ') = ' + answer + '.',
      cancellationSide: 'left',
      cancellationValues: null, // multiplicative inverse, not additive cancellation
    };
  }
  if (step.id === 'verify') {
    const value = rationalText(solutionOf(step.beforeState));
    const left = a === 0 ? [token('left-constant', String(b), 'keep')] : [
      token('left-substitution', String(a) + ' × (' + value + ')', 'substitute'),
      ...(b !== 0 ? [token('left-constant', signedConstant(b), 'keep')] : []),
    ];
    const right = d === 0 ? [token('right-constant', String(c), 'keep')] : [
      token('right-substitution', String(d) + ' × (' + value + ')', 'substitute'),
      ...(c !== 0 ? [token('right-constant', signedConstant(c), 'keep')] : []),
    ];
    return {
      left, right,
      caption: 'On remplace chaque x par ' + value + ' dans l’équation de départ. Les deux membres doivent avoir la même valeur.',
      cancellationSide: 'none',
      cancellationValues: null,
    };
  }
  throw new Error('Unsupported transformation');
}
