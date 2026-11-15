export const MENTAL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division'] as const;
export type MentalOperation = typeof MENTAL_OPERATIONS[number];
export type MentalCalculation = {
  id: string;
  operation: MentalOperation;
  left: number;
  right: number;
  answer: number;
};

export const MENTAL_OPERATION_LABELS: Record<MentalOperation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
};

function int(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function digitBounds(digits: number) {
  const size = Math.max(1, Math.min(7, Math.floor(digits)));
  return { min: size === 1 ? 0 : 10 ** (size - 1), max: 10 ** size - 1 };
}

export function createMentalCalculation(operation: MentalOperation, leftDigits = 1, rightDigits = leftDigits, random: () => number = Math.random): MentalCalculation {
  const leftBounds = digitBounds(leftDigits);
  const rightBounds = digitBounds(rightDigits);
  let left = 0;
  let right = 0;
  let answer = 0;

  if (operation === 'addition') {
    left = int(random, leftBounds.min, leftBounds.max);
    right = int(random, rightBounds.min, rightBounds.max);
    answer = left + right;
  } else if (operation === 'subtraction') {
    left = int(random, leftBounds.min, leftBounds.max);
    right = int(random, rightBounds.min, rightBounds.max);
    answer = left - right;
  } else if (operation === 'multiplication') {
    left = int(random, Math.max(1, leftBounds.min), leftBounds.max);
    right = int(random, Math.max(1, rightBounds.min), rightBounds.max);
    answer = left * right;
  } else {
    if (leftBounds.min < rightBounds.min || leftBounds.max < rightBounds.max) {
      throw new RangeError('For whole-number division, the first number must have at least as many digits as the second.');
    }
    const smallestDivisor = Math.max(2, rightBounds.min);
    const largestDivisor = Math.min(rightBounds.max, Math.floor(leftBounds.max / 2));
    right = int(random, smallestDivisor, largestDivisor);
    const smallestQuotient = Math.max(2, Math.ceil(leftBounds.min / right));
    const largestQuotient = Math.floor(leftBounds.max / right);
    const quotient = int(random, smallestQuotient, largestQuotient);
    left = right * quotient;
    answer = quotient;
  }

  return { id: `${operation}-${left}-${right}-${Math.floor(random() * 1_000_000)}`, operation, left, right, answer };
}

export function createMentalCalculationRace(operations: MentalOperation[], leftDigits = 1, rightDigits = leftDigits, random: () => number = Math.random, count = 10) {
  const available = MENTAL_OPERATIONS.filter((operation) => operations.includes(operation));
  if (!available.length) return [];
  const calculations = Array.from({ length: Math.max(1, count) }, (_, index) => {
    const operation = available[index % available.length];
    const calculation = createMentalCalculation(operation, leftDigits, rightDigits, random);
    return { ...calculation, id: `race-${index}-${calculation.id}` };
  });
  for (let index = calculations.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [calculations[index], calculations[other]] = [calculations[other], calculations[index]];
  }
  return calculations;
}

export function isCorrectMentalCalculation(calculation: MentalCalculation, response: string) {
  const normalized = response.trim();
  return /^-?\d+$/.test(normalized) && Number(normalized) === calculation.answer;
}

export function createAnswerChoices(answer: number, random: () => number = Math.random): number[] {
  const choices = new Set<number>([answer]);
  for (let offset = 1; choices.size < 4; offset += 1) choices.add(answer + (random() < 0.5 ? -offset : offset));
  return [...choices].sort(() => random() - 0.5);
}

export function formatMentalCalculation(calculation: MentalCalculation) {
  const symbol = calculation.operation === 'addition' ? '+'
    : calculation.operation === 'subtraction' ? '−'
      : calculation.operation === 'multiplication' ? '×' : '÷';
  return `${calculation.left} ${symbol} ${calculation.right} = ?`;
}

export type MentalLessonCandidate = { topicLabel: string; topicSlug: string; subjectSlug: string; hasLesson: boolean };

export function findMentalOperationLesson(operation: MentalOperation, topics: MentalLessonCandidate[]) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tokens: Record<MentalOperation, string[]> = {
    addition: ['addition', 'additions', 'somme'],
    subtraction: ['soustraction', 'subtraction', 'subtract'],
    multiplication: ['multiplication', 'multiplier', 'times table', 'table de multiplication'],
    division: ['division', 'diviser'],
  };
  const eligible = topics.filter((topic) => topic.hasLesson);
  return eligible.find((topic) => {
    const label = normalize(`${topic.topicLabel} ${topic.topicSlug}`);
    return tokens[operation].some((token) => label.includes(normalize(token)));
  }) ?? eligible.find((topic) => /calcul mental|nombres et calcul|numbers and calculation/.test(normalize(`${topic.topicLabel} ${topic.topicSlug}`))) ?? null;
}

export function getCalculationHint(calculation: MentalCalculation) {
  switch (calculation.operation) {
    case 'addition':
      return calculation.left >= 10 || calculation.right >= 10
        ? 'Split the numbers into tens and ones, add each part, then put the parts back together.'
        : `Start at ${calculation.left} and count on ${calculation.right} more.`;
    case 'subtraction':
      return `Start at ${calculation.left} and count back ${calculation.right} steps. You can also ask: what number added to ${calculation.right} makes ${calculation.left}?`;
    case 'multiplication':
      if (calculation.left > 12 || calculation.right > 12) {
        return 'Split one number into place-value parts, multiply each part, then add the partial products.';
      }
      return `Use the ${calculation.right} times table. Think of ${calculation.left} equal groups of ${calculation.right}.`;
    case 'division':
      if (calculation.right > 12 || calculation.answer > 12) {
        return 'Use the inverse operation: multiply the divisor by a number, then adjust until you reach the dividend.';
      }
      return `Use the ${calculation.right} times table: how many groups of ${calculation.right} make ${calculation.left}?`;
  }
}

export function getCalculationExplanation(calculation: MentalCalculation) {
  switch (calculation.operation) {
    case 'addition':
      return `${calculation.left} plus ${calculation.right} is ${calculation.answer}.`;
    case 'subtraction':
      return `${calculation.left} take away ${calculation.right} leaves ${calculation.answer}.`;
    case 'multiplication':
      if (calculation.left > 12 || calculation.right > 12) {
        return `${calculation.left} × ${calculation.right} can be worked out with place-value parts. The product is ${calculation.answer}.`;
      }
      return `${calculation.left} groups of ${calculation.right} make ${calculation.answer}: ${Array.from({ length: calculation.left }, () => calculation.right).join(' + ')}.`;
    case 'division':
      if (calculation.answer > 12) {
        return `${calculation.left} ÷ ${calculation.right} = ${calculation.answer}, because ${calculation.right} × ${calculation.answer} = ${calculation.left}.`;
      }
      return `${calculation.left} shared into groups of ${calculation.right} makes ${calculation.answer} groups, because ${calculation.right} × ${calculation.answer} = ${calculation.left}.`;
  }
}

export function getRelatedMultiplicationFacts(calculation: MentalCalculation) {
  if (calculation.operation !== 'multiplication' && calculation.operation !== 'division') return [];
  const relevantMultiplier = calculation.operation === 'multiplication' ? calculation.left : calculation.answer;
  if (calculation.operation === 'multiplication' && (calculation.left > 12 || calculation.right > 12)) return [];
  if (calculation.operation === 'division' && (calculation.right > 12 || calculation.answer > 12)) {
    return [{ multiplier: relevantMultiplier, product: calculation.right * relevantMultiplier, isRelevant: true }];
  }
  const multipliers = Array.from({ length: 10 }, (_, index) => index + 1);
  if (relevantMultiplier > 10) multipliers.push(relevantMultiplier);
  return multipliers.map((multiplier) => ({
    multiplier,
    product: calculation.right * multiplier,
    isRelevant: multiplier === relevantMultiplier,
  }));
}
