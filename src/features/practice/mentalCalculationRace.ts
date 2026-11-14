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

export function createMentalCalculation(operation: MentalOperation, maximum = 10, random: () => number = Math.random): MentalCalculation {
  const limit = Math.max(2, Math.min(100, Math.floor(maximum)));
  let left = 0;
  let right = 0;
  let answer = 0;

  if (operation === 'addition') {
    left = int(random, 0, limit - 1);
    right = int(random, 1, limit - left);
    answer = left + right;
  } else if (operation === 'subtraction') {
    left = int(random, 2, limit);
    right = int(random, 1, left - 1);
    answer = left - right;
  } else if (operation === 'multiplication') {
    const largestFactor = Math.max(2, Math.min(12, Math.floor(Math.sqrt(limit)) + 1));
    left = int(random, 2, largestFactor);
    right = int(random, 2, Math.max(2, Math.min(12, Math.floor(limit / left))));
    answer = left * right;
  } else {
    right = int(random, 2, Math.min(12, Math.max(2, Math.floor(Math.sqrt(limit)) + 1)));
    const largestQuotient = Math.max(2, Math.floor(limit / right));
    const quotient = int(random, 2, largestQuotient);
    left = right * quotient;
    answer = quotient;
  }

  return { id: `${operation}-${left}-${right}-${Math.floor(random() * 1_000_000)}`, operation, left, right, answer };
}

export function createMentalCalculationRace(operations: MentalOperation[], maximum = 10, random: () => number = Math.random, count = 10) {
  const available = MENTAL_OPERATIONS.filter((operation) => operations.includes(operation));
  if (!available.length) return [];
  const calculations = Array.from({ length: Math.max(1, count) }, (_, index) => {
    const operation = available[index % available.length];
    const calculation = createMentalCalculation(operation, maximum, random);
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
  return /^\d+$/.test(normalized) && Number(normalized) === calculation.answer;
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
      return `Use the ${calculation.right} times table. Think of ${calculation.left} equal groups of ${calculation.right}.`;
    case 'division':
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
      return `${calculation.left} groups of ${calculation.right} make ${calculation.answer}: ${Array.from({ length: calculation.left }, () => calculation.right).join(' + ')}.`;
    case 'division':
      return `${calculation.left} shared into groups of ${calculation.right} makes ${calculation.answer} groups, because ${calculation.right} × ${calculation.answer} = ${calculation.left}.`;
  }
}

export function getRelatedMultiplicationFacts(calculation: MentalCalculation) {
  if (calculation.operation !== 'multiplication' && calculation.operation !== 'division') return [];
  const relevantMultiplier = calculation.operation === 'multiplication' ? calculation.left : calculation.answer;
  const multipliers = Array.from({ length: 10 }, (_, index) => index + 1);
  if (relevantMultiplier > 10) multipliers.push(relevantMultiplier);
  return multipliers.map((multiplier) => ({
    multiplier,
    product: calculation.right * multiplier,
    isRelevant: multiplier === relevantMultiplier,
  }));
}
