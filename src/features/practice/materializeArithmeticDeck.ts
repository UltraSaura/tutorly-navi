export type ArithmeticDeckKind = 'calculation-race' | 'number-flashcards';
export type ArithmeticDeckOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type ArithmeticDeckValidation = {
  kind: ArithmeticDeckKind;
  count: number;
  leftDigits: number;
  rightDigits: number;
  allowedOperations: string[];
  tableNumbers: number[];
  schoolLevels: string[];
  allowNegative: boolean;
};

function answerFor(operation: ArithmeticDeckOperation, left: number, right: number) {
  if (operation === 'addition') return left + right;
  if (operation === 'subtraction') return left - right;
  if (operation === 'multiplication') return left * right;
  return right === 0 || left % right !== 0 ? NaN : left / right;
}

function choicesFor(answer: number, id: string) {
  const candidates = [...new Set([answer - 1, answer + 1, answer, answer + 2].filter((value) => answer < 0 || value >= 0))];
  for (let offset = 3; candidates.length < 4; offset += 1) candidates.push(answer + offset);
  if (candidates.some((value) => !Number.isSafeInteger(value))) return [];
  const shift = Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % candidates.length;
  return candidates.slice(shift).concat(candidates.slice(0, shift));
}

/** Validate an AI-produced deck, then derive its answers and distractors in Tutorly. */
export function materializeArithmeticDeck(raw: unknown, config: ArithmeticDeckValidation): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (input.kind !== config.kind || typeof input.prompt !== 'string' || !input.prompt.trim()
    || !Array.isArray(input.problems) || input.problems.length !== config.count) return null;

  const seen = new Set<string>();
  const problems: Array<Record<string, unknown>> = [];
  for (let index = 0; index < input.problems.length; index += 1) {
    const rawProblem = input.problems[index];
    if (!rawProblem || typeof rawProblem !== 'object' || Array.isArray(rawProblem)) return null;
    const problem = rawProblem as Record<string, unknown>;
    const operation = problem.operation;
    const left = Number(problem.left);
    const right = Number(problem.right);
    if (typeof operation !== 'string' || !['addition', 'subtraction', 'multiplication', 'division'].includes(operation)
      || !config.allowedOperations.includes(operation)
      || !Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left < 0 || right < 0
      || String(left).length > config.leftDigits || String(right).length > config.rightDigits) return null;
    const typedOperation = operation as ArithmeticDeckOperation;
    if (typedOperation === 'subtraction' && !config.allowNegative && left < right) return null;
    if (config.tableNumbers.length && typedOperation === 'multiplication'
      && !config.tableNumbers.includes(left) && !config.tableNumbers.includes(right)) return null;
    if (config.tableNumbers.length && typedOperation === 'division' && !config.tableNumbers.includes(right)) return null;

    const answer = answerFor(typedOperation, left, right);
    if (!Number.isSafeInteger(answer)) return null;
    const id = typeof problem.id === 'string' && problem.id.trim() ? problem.id.trim() : `calculation-${index + 1}`;
    const uniqueKey = `${typedOperation}:${left}:${right}`;
    if (seen.has(uniqueKey)) return null;
    seen.add(uniqueKey);
    const choices = choicesFor(answer, id);
    if (choices.length !== 4 || choices.filter((choice) => choice === answer).length !== 1) return null;
    problems.push({ id, operation: typedOperation, left, right, choices });
  }

  const operations = [...new Set(problems.map((problem) => String(problem.operation)))];
  if (!operations.length || operations.some((operation) => !config.allowedOperations.includes(operation))) return null;
  const points = Number(input.points);
  return {
    id: typeof input.id === 'string' && input.id.trim() ? input.id : 'q-1',
    kind: config.kind,
    prompt: input.prompt.trim(),
    operations,
    leftDigits: config.leftDigits,
    rightDigits: config.rightDigits,
    problems,
    points: Number.isSafeInteger(points) && points >= 0 && points <= 100 ? points : 1,
    curriculumCountry: 'fr',
    schoolLevels: config.schoolLevels,
    hint: undefined,
  };
}
