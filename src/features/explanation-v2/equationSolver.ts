/**
 * IM-D02: exact, deterministic algebra transformations for ax + b = dx + c.
 * This is a bounded template solver, NOT a free-form symbolic algebra parser.
 * Every intermediate state is checked for algebraic equivalence using integer arithmetic.
 */
export type EquationCoefficients = { a: number; b: number; c: number; d?: number };
export type Rational = { n: number; d: number };
export type EquationState = { a: number; b: number; d: number; c: number };
export type EquationOperation = 'subtract-variable' | 'subtract-constant' | 'divide' | 'verify';
export type EquationTransformation = {
  id: EquationOperation;
  before: string;
  after: string;
  leftOperation: string;
  rightOperation: string;
  title: string;
  explanation: string;
  rule: string;
  choice: string;
  wrongFeedback: string;
  beforeState: EquationState;
  afterState: EquationState | null;
};

export function gcd(a: number, b: number): number {
  let x = Math.abs(a), y = Math.abs(b);
  while (y !== 0) { const remainder = x % y; x = y; y = remainder; }
  return x || 1;
}
export function rational(n: number, d = 1): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) throw new Error('Invalid rational');
  if (n === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return { n: sign * n / divisor, d: sign * d / divisor };
}
export function rationalText(value: Rational): string {
  return value.d === 1 ? String(value.n) : value.n + '/' + value.d;
}
export function parseRational(value: string): Rational | null {
  const match = /^\s*([+-]?\d{1,3})(?:\s*\/\s*(\d{1,3}))?\s*$/.exec(value);
  if (!match) return null;
  const n = Number(match[1]), d = match[2] === undefined ? 1 : Number(match[2]);
  if (d === 0) return null;
  return rational(n, d);
}
function term(coefficient: number, variable: string): string {
  if (coefficient === 0) return '';
  return (coefficient === 1 ? '' : coefficient === -1 ? '−' : String(coefficient)) + variable;
}
function side(coefficient: number, constant: number): string {
  const variable = term(coefficient, 'x');
  if (coefficient === 0) return String(constant);
  if (constant === 0) return variable;
  return variable + (constant < 0 ? ' − ' + Math.abs(constant) : ' + ' + constant);
}
export function equationText(state: EquationState): string {
  return side(state.a, state.b) + ' = ' + side(state.d, state.c);
}
function signedNumber(n: number): string { return n < 0 ? '+ ' + Math.abs(n) : '− ' + n; }
function signedVariable(n: number): string { return n < 0 ? '+ ' + term(Math.abs(n), 'x') : '− ' + term(n, 'x'); }
export function solutionOf(input: EquationCoefficients): Rational {
  const d = input.d ?? 0;
  if (input.a === d) throw new Error('This version requires a unique solution');
  return rational(input.c - input.b, input.a - d);
}
export function satisfiesEquation(input: EquationCoefficients, x: Rational): boolean {
  const d = input.d ?? 0;
  return input.a * x.n + input.b * x.d === d * x.n + input.c * x.d;
}
/** Exact equivalence of the two linear equations for every x. */
export function equivalentStates(before: EquationState, after: EquationState): boolean {
  const deltaA = before.a - before.d, deltaB = before.c - before.b;
  const nextA = after.a - after.d, nextB = after.c - after.b;
  return deltaA * nextB === nextA * deltaB && deltaA !== 0 && nextA !== 0;
}
export function equationSteps(input: EquationCoefficients): EquationTransformation[] {
  const original: EquationState = { a: input.a, b: input.b, c: input.c, d: input.d ?? 0 };
  const solution = solutionOf(input);
  let current = original;
  const steps: EquationTransformation[] = [];
  if (current.d !== 0) {
    const before = current;
    const next: EquationState = { a: current.a - current.d, b: current.b, d: 0, c: current.c };
    if (!equivalentStates(before, next)) throw new Error('Invalid variable cancellation');
    const operation = signedVariable(current.d);
    steps.push({
      id: 'subtract-variable', before: equationText(before), after: equationText(next),
      leftOperation: operation, rightOperation: operation,
      title: 'Regrouper les x du même côté',
      explanation: (current.d > 0 ? 'On retire ' + term(current.d, 'x') : 'On ajoute ' + term(-current.d, 'x')) + ' aux deux membres. Les termes en x à droite s’annulent.',
      rule: 'Ajouter ou soustraire la même expression des deux côtés conserve les solutions.',
      choice: (current.d > 0 ? 'Soustraire ' + term(current.d, 'x') : 'Ajouter ' + term(-current.d, 'x')) + ' des deux côtés',
      wrongFeedback: 'Les x doivent être regroupés en effectuant la même opération sur les deux membres.',
      beforeState: before, afterState: next,
    });
    current = next;
  }
  if (current.b !== 0) {
    const before = current;
    const next: EquationState = { a: current.a, b: 0, d: current.d, c: current.c - current.b };
    if (!equivalentStates(before, next)) throw new Error('Invalid constant cancellation');
    const operation = signedNumber(current.b);
    steps.push({
      id: 'subtract-constant', before: equationText(before), after: equationText(next),
      leftOperation: operation, rightOperation: operation,
      title: 'Isoler le terme en x',
      explanation: (current.b > 0 ? 'On soustrait ' + current.b : 'On ajoute ' + Math.abs(current.b)) + ' aux deux membres. Le nombre à gauche s’annule.',
      rule: 'Pour conserver l’égalité, on effectue la même opération à gauche et à droite.',
      choice: (current.b > 0 ? 'Soustraire ' + current.b : 'Ajouter ' + Math.abs(current.b)) + ' des deux côtés',
      wrongFeedback: 'Il faut d’abord supprimer le nombre qui accompagne x, des deux côtés.',
      beforeState: before, afterState: next,
    });
    current = next;
  }
  if (current.a !== 1) {
    const before = current;
    // A rational final result cannot be represented by integer EquationState.
    const after = 'x = ' + rationalText(solution);
    steps.push({
      id: 'divide', before: equationText(before), after,
      leftOperation: '÷ (' + current.a + ')', rightOperation: '÷ (' + current.a + ')',
      title: 'Trouver la valeur de x',
      explanation: 'Le nombre devant x est ' + current.a + '. On divise les deux membres par ce nombre non nul. On obtient x = ' + rationalText(solution) + '.',
      rule: 'Diviser les deux membres par un même nombre non nul conserve l’égalité. Le résultat peut être une fraction.',
      choice: 'Diviser les deux côtés par ' + current.a,
      wrongFeedback: 'Le terme en x est isolé : il faut maintenant obtenir un seul x en divisant par son coefficient.',
      beforeState: before, afterState: null,
    });
  }
  const originalText = equationText(original);
  const leftValue = rationalText(rational(original.a * solution.n + original.b * solution.d, solution.d));
  const rightValue = rationalText(rational(original.d * solution.n + original.c * solution.d, solution.d));
  steps.push({
    id: 'verify', before: originalText,
    after: leftValue + ' = ' + rightValue + '  ✓',
    leftOperation: 'x → ' + rationalText(solution), rightOperation: 'x → ' + rationalText(solution),
    title: 'Vérifier dans l’équation de départ',
    explanation: 'On remplace x par ' + rationalText(solution) + ' dans l’équation de départ (' + originalText + '). Le membre gauche vaut ' + leftValue + ' et le membre droit vaut ' + rightValue + '.',
    rule: 'Une solution doit rendre l’égalité initiale vraie. Vérification exacte, sans arrondi.',
    choice: 'Remplacer x dans l’équation de départ',
    wrongFeedback: 'Une réponse se vérifie dans l’équation de départ, pas seulement dans la dernière ligne.',
    beforeState: original, afterState: null,
  });
  if (!satisfiesEquation(input, solution)) throw new Error('Solution failed substitution check');
  return steps;
}
