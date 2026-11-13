export type PenCountChallenge = {
  startingTens: number;
  startingOnes: number;
  addedTens: number;
  answerChoices: number[];
};

export type PenCountPhase = 'adding' | 'choosing' | 'complete';

const randomInteger = (minimum: number, maximum: number, random: () => number) =>
  minimum + Math.floor(random() * (maximum - minimum + 1));

function shuffle(values: number[], random: () => number): number[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function penCountStartingValue(challenge: Pick<PenCountChallenge, 'startingTens' | 'startingOnes'>): number {
  return challenge.startingTens * 10 + challenge.startingOnes;
}

export function penCountTotal(challenge: Pick<PenCountChallenge, 'startingTens' | 'startingOnes' | 'addedTens'>): number {
  return penCountStartingValue(challenge) + challenge.addedTens * 10;
}

function makeAnswerChoices(total: number, random: () => number): number[] {
  const distractors = [total - 10, total + 10, total + 1, total - 1]
    .filter((choice) => choice >= 0 && choice <= 100 && choice !== total);
  const uniqueDistractors = [...new Set(distractors)];
  while (uniqueDistractors.length < 3) {
    const fallback = Math.max(0, total - 10 * (uniqueDistractors.length + 1));
    if (!uniqueDistractors.includes(fallback) && fallback !== total) uniqueDistractors.push(fallback);
  }
  return shuffle([total, ...uniqueDistractors.slice(0, 3)], random);
}

export function createPenCountChallenge(random: () => number = Math.random): PenCountChallenge {
  const startingTens = randomInteger(1, 5, random);
  const startingOnes = randomInteger(0, 9, random);
  const startingValue = startingTens * 10 + startingOnes;
  const maximumAddedTens = Math.min(5, Math.floor((100 - startingValue) / 10));
  const addedTens = randomInteger(1, maximumAddedTens, random);
  const total = startingValue + addedTens * 10;
  return {
    startingTens,
    startingOnes,
    addedTens,
    answerChoices: makeAnswerChoices(total, random),
  };
}

export function createDifferentPenCountChallenge(previous: PenCountChallenge, random: () => number = Math.random): PenCountChallenge {
  const next = createPenCountChallenge(random);
  if (penCountTotal(next) !== penCountTotal(previous)) return next;

  const startingOnes = (previous.startingOnes + 1) % 10;
  const startingValue = previous.startingTens * 10 + startingOnes;
  const maximumAddedTens = Math.min(5, Math.floor((100 - startingValue) / 10));
  const addedTens = Math.min(previous.addedTens, maximumAddedTens);
  const total = startingValue + addedTens * 10;
  return {
    startingTens: previous.startingTens,
    startingOnes,
    addedTens,
    answerChoices: makeAnswerChoices(total, random),
  };
}

export function isValidPenCountChallenge(value: unknown): value is PenCountChallenge {
  if (!value || typeof value !== 'object') return false;
  const challenge = value as Partial<PenCountChallenge>;
  if (!Number.isInteger(challenge.startingTens) || (challenge.startingTens ?? 0) < 1 || (challenge.startingTens ?? 0) > 5) return false;
  if (!Number.isInteger(challenge.startingOnes) || (challenge.startingOnes ?? -1) < 0 || (challenge.startingOnes ?? 10) > 9) return false;
  if (!Number.isInteger(challenge.addedTens) || (challenge.addedTens ?? 0) < 1 || (challenge.addedTens ?? 6) > 5) return false;
  if (penCountTotal(challenge as PenCountChallenge) > 100) return false;
  return Array.isArray(challenge.answerChoices)
    && challenge.answerChoices.length === 4
    && challenge.answerChoices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice <= 100)
    && new Set(challenge.answerChoices).size === 4
    && challenge.answerChoices.includes(penCountTotal(challenge as PenCountChallenge));
}

export function nextPenCountValue(current: number, target: number): number {
  return Math.min(target, current + 10);
}

/** Shared bounded counter increment used by the separate Numbers after ten activity. */
export function nextAddUpValue(current: number, increment: 1 | 10, target: number): number {
  return Math.min(target, current + increment);
}
