/** One payload owns the example, frames and check. No expression-by-expression repairs. */
export type DivisionSkill = 'exact_integer_division' | 'integer_division_with_remainder' | 'decimal_division' | 'fraction_division' | 'unknown';
export type Division = { dividend: number; divisor: number };
export interface QuickExplanation {
  sourceSkill: DivisionSkill;
  concept: string;
  workedExample: Division;
  frames: Array<{ title: string; body: string }>;
  check: Division & { question: string; choices: string[]; correctChoice: string; hint: string; explanation: string };
  retryGuidance: string;
  lessonLinkReason?: string;
}
export function parseSourceDivision(source: string): Division | null {
  // Ignore the student's equality RHS. Multiple operations/fractions are not simple integer division.
  const lhs = source.split('=')[0].trim();
  const match = lhs.match(/^(-?\d+(?:[.,]\d+)?)\s*[÷/:]\s*(-?\d+(?:[.,]\d+)?)$/);
  return match ? { dividend: Number(match[1].replace(',', '.')), divisor: Number(match[2].replace(',', '.')) } : null;
}
export function classifyDivision(source: string): DivisionSkill {
  if (/\\frac|\d+\s*\/\s*\d+\s*[÷/]\s*\d+/.test(source)) return 'fraction_division';
  const p = parseSourceDivision(source);
  if (!p || !Number.isFinite(p.dividend) || !Number.isFinite(p.divisor) || p.divisor === 0) return 'unknown';
  if (!Number.isInteger(p.dividend) || !Number.isInteger(p.divisor) || /\d[.,]\d/.test(source.split('=')[0])) return 'decimal_division';
  return p.dividend % p.divisor === 0 ? 'exact_integer_division' : 'integer_division_with_remainder';
}
export const isSupportedDivision = (source: string) => {
  const p = parseSourceDivision(source);
  return !!p && Number.isSafeInteger(p.dividend) && Number.isSafeInteger(p.divisor) && p.dividend > 0 && p.divisor > 0 &&
    ['exact_integer_division', 'integer_division_with_remainder'].includes(classifyDivision(source));
};
const digits = (n: number) => String(n).length;
const quotient = (p: Division) => Math.floor(p.dividend / p.divisor);
const remainder = (p: Division) => p.dividend % p.divisor;
const equation = (p: Division) => `${p.dividend} ÷ ${p.divisor}`;
const answer = (p: Division, fr: boolean) => remainder(p) ? `${quotient(p)} ${fr ? 'reste' : 'remainder'} ${remainder(p)}` : String(quotient(p));

/** Closed arithmetic grammar: displayed numbers and equalities are computed, never trusted prose.
 * Generated prose for supported divisions must match these templates. This deliberately rejects
 * unparseable verbal calculations as well as false symbolic equalities; retry then safe fallback.
 */
export function divisionExplanation(source: string, worked: Division, check: Division, language = 'fr'): QuickExplanation {
  const fr = /^fr/i.test(language);
  const exact = classifyDivision(source) === 'exact_integer_division';
  const q = quotient(worked), r = remainder(worked), cq = quotient(check), cr = remainder(check);
  const fact = `${worked.divisor} × ${q}${exact ? '' : ` + ${r}`} = ${worked.dividend}`;
  const checkFact = `${check.divisor} × ${cq}${exact ? '' : ` + ${cr}`} = ${check.dividend}`;
  const correctChoice = answer(check, fr);
  const choices = exact ? [String(cq - 1), correctChoice, String(cq + 1)] :
    [`${cq - 1} ${fr ? 'reste' : 'remainder'} ${cr}`, correctChoice, `${cq + 1} ${fr ? 'reste' : 'remainder'} ${cr}`];
  return {
    sourceSkill: classifyDivision(source),
    concept: exact
      ? (fr ? 'Une division exacte cherche le nombre qui, multiplié par le diviseur, redonne exactement le dividende.' : 'Exact division finds the number that, multiplied by the divisor, gives the dividend exactly.')
      : (fr ? 'On cherche combien de groupes complets on peut former. Le reste doit être plus petit que le diviseur.' : 'Find how many complete groups you can make. The remainder must be smaller than the divisor.'),
    workedExample: worked,
    frames: [
      { title: fr ? 'Exemple guidé' : 'Guided example', body: `${equation(worked)}\n${fr ? (exact ? `Quel nombre multiplié par ${worked.divisor} donne ${worked.dividend} ?` : `Combien de groupes de ${worked.divisor} peut-on former avec ${worked.dividend} ?`) : `How many groups of ${worked.divisor} fit into ${worked.dividend}?`}` },
      { title: fr ? 'Vérifions ensemble' : 'Check together', body: `${fact}\n${exact ? (fr ? 'La division est exacte.' : 'The division is exact.') : (fr ? `Le reste est ${r}, plus petit que ${worked.divisor}.` : `The remainder is ${r}, smaller than ${worked.divisor}.`)}` },
    ],
    check: { ...check, question: `${equation(check)} = ?`, choices, correctChoice,
      hint: exact ? (fr ? `Cherche dans la table de ${check.divisor} le produit qui donne ${check.dividend}. Essaie encore.` : `Find ${check.dividend} in the ${check.divisor} times table. Try again.`) : (fr ? `Cherche le plus grand multiple de ${check.divisor} qui ne dépasse pas ${check.dividend}. Essaie encore.` : `Find the largest multiple of ${check.divisor} no greater than ${check.dividend}. Try again.`),
      explanation: `${checkFact}. ${fr ? 'Tu peux utiliser cette vérification dans ton exercice.' : 'You can use this check in your exercise.'}` },
    retryGuidance: fr ? 'Utilise cette méthode pour réessayer ton exercice.' : 'Use this method to retry your exercise.',
  };
}

export function validateQuickExplanation(source: string, value: unknown, language = 'fr'): string[] {
  if (!isSupportedDivision(source)) return ['Unsupported division: no unvalidated lesson may be displayed.'];
  if (!value || typeof value !== 'object') return ['Expected structured explanation.'];
  const v = value as QuickExplanation;
  const original = parseSourceDivision(source)!;
  const errors: string[] = [];
  const exact = classifyDivision(source) === 'exact_integer_division';
  for (const [name, p] of [['worked example', v.workedExample], ['check', v.check]] as const) {
    if (!p || !Number.isSafeInteger(p.dividend) || !Number.isSafeInteger(p.divisor) || p.dividend <= 0 || p.divisor <= 0) {
      errors.push(`${name}: require positive integer operands and nonzero divisor.`); continue;
    }
    if ((p.dividend % p.divisor === 0) !== exact) errors.push(`${name}: wrong division subtype.`);
    if (digits(p.dividend) !== digits(original.dividend) || digits(p.divisor) !== digits(original.divisor)) errors.push(`${name}: operand difficulty changed.`);
    if ([p.dividend, p.divisor].some(n => [original.dividend, original.divisor].includes(n))) errors.push(`${name}: original operands reused.`);
  }
  if (errors.length) return errors;
  if ([v.check.dividend, v.check.divisor].some(n => [v.workedExample.dividend, v.workedExample.divisor].includes(n))) errors.push('Check must use fresh operands.');
  const expected = divisionExplanation(source, v.workedExample, v.check, language);
  // Compare every rendered field against the closed grammar. No spare visual/answer fields.
  if (v.sourceSkill !== expected.sourceSkill || v.concept !== expected.concept || v.retryGuidance !== expected.retryGuidance) errors.push('Concept/skill/retry must use the safe division template.');
  if (!Array.isArray(v.frames) || v.frames.length !== expected.frames.length || v.frames.some((f, i) => f.title !== expected.frames[i].title || f.body !== expected.frames[i].body)) errors.push('Guided frames contain unrelated numbers, an invalid equality, or unsupported arithmetic prose.');
  if (v.check.question !== expected.check.question || v.check.hint !== expected.check.hint || v.check.explanation !== expected.check.explanation || v.check.correctChoice !== expected.check.correctChoice) errors.push('Check has leaked, inconsistent or unsupported content.');
  if (!Array.isArray(v.check.choices) || v.check.choices.length !== 3 || new Set(v.check.choices).size !== 3 || !expected.check.choices.every(c => v.check.choices.includes(c))) errors.push('Check must have three distinct verified choices.');
  const permitted = ['dividend', 'divisor', 'question', 'choices', 'correctChoice', 'hint', 'explanation'];
  if (Object.keys(v.check).some(k => !permitted.includes(k))) errors.push('Check must not include a visual or extra answer presentation.');
  // Never disclose the original quotient, even through a coincidentally equal distractor.
  const visible = [v.concept, ...(v.frames || []).map(f => f.body), v.check.question, ...(v.check.choices || []), v.check.hint, v.check.explanation].join(' ');
  if ((visible.match(/\d+/g) || []).includes(String(quotient(original)))) errors.push('Content exposes the original quotient.');
  return errors;
}

export function safeDivisionExplanation(source: string, language = 'fr'): QuickExplanation {
  if (!isSupportedDivision(source)) throw new Error('This division needs a different supported explanation.');
  const original = parseSourceDivision(source)!;
  const exact = classifyDivision(source) === 'exact_integer_division';
  const candidates: Division[] = [{ dividend: exact ? 72 : 73, divisor: 8 }, { dividend: exact ? 45 : 46, divisor: 5 }];
  const base = 10 ** (digits(original.divisor) - 1);
  const minA = 10 ** (digits(original.dividend) - 1);
  for (let b = Math.max(2, base); b < Math.min(base * 10, base + 100); b++) {
    const minQ = Math.max(2, Math.ceil(minA / b));
    for (let q = minQ; q < minQ + 40; q++) candidates.push({ dividend: b * q + (exact ? 0 : 1), divisor: b });
  }
  for (const worked of candidates) for (const check of candidates) {
    const candidate = divisionExplanation(source, worked, check, language);
    if (!validateQuickExplanation(source, candidate, language).length) return candidate;
  }
  throw new Error('No comparable safe example found. Please use the curriculum lesson.');
}

export const QUICK_EXPLANATION_PROMPT = `Teach only with a changed example. Return JSON with sourceSkill, concept, workedExample:{dividend,divisor}, ordered frames:[{title,body}], check:{dividend,divisor,question,choices,correctChoice,hint,explanation}, retryGuidance, optional lessonLinkReason.
Preserve the source operation subtype and operand difficulty. Adapt to country, curriculum, grade and response language. Never reveal the original answer or comment on the correctness of the student's answer. Use exactly one worked example, then a fresh independent three-choice check. No solution, multiplication fact, diagram result or highlighted answer in the check question. Feedback is only displayed after selection. Verify all arithmetic. Do not generate a full lesson.
For supported integer division use the supplied safeTemplate's exact wording and structure. It is a closed verified arithmetic grammar. You may return the safeTemplate unchanged. Do not add visual fields, other examples or prose calculations. Code validation is authoritative.`;

export async function generateQuickExplanation(source: string, language: string, generate: (prompt: string) => Promise<unknown>): Promise<QuickExplanation> {
  const fallback = safeDivisionExplanation(source, language);
  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generate(`${QUICK_EXPLANATION_PROMPT}\nsafeTemplate: ${JSON.stringify(fallback)}\n${feedback}`);
      const errors = validateQuickExplanation(source, result, language);
      if (!errors.length) return result as QuickExplanation;
      feedback = `Validation failed. Rebuild the entire response: ${errors.join(' ')}`;
    } catch {
      feedback = 'Generation or JSON parsing failed. Return the supplied safeTemplate as valid JSON.';
    }
  }
  return fallback;
}
