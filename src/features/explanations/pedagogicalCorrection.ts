import type { InteractiveMisconception } from './interactiveTutorSession';

export type CorrectionNextAction = 'check-understanding' | 'remediate-regrouping';

export interface PedagogicalCorrection {
  observedResponse: string;
  misconception: InteractiveMisconception;
  principle: string;
  explanation: string;
  concreteExample: string;
  exampleExpressions: readonly [string, string];
  understandingQuestion: string;
  expectedUnderstanding: readonly string[];
  nextAction: CorrectionNextAction;
  simplerExplanation: string;
}

export function createPedagogicalCorrection(
  misconception: InteractiveMisconception,
  observedResponse: string,
  mastery: 'low' | 'standard' | 'high' = 'standard',
): PedagogicalCorrection {
  if (misconception === 'reversed-subtraction') {
    return {
      observedResponse,
      misconception,
      principle: 'Dans une soustraction, on part du premier nombre et on enlève le second.',
      explanation: mastery === 'high'
        ? 'Tu as inversé les deux nombres. Cela change la soustraction : 8 − 5 et 5 − 8 ne décrivent pas la même situation.'
        : 'Tu as proposé de faire 8 − 5. Mais dans notre exercice, on part de 325 et on enlève 148. Dans la colonne des unités, on part donc de 5 et on enlève 8. Si on inverse les nombres, on change le calcul.',
      concreteExample: '8 − 5 signifie : partir de 8 et enlever 5. Notre colonne signifie : partir de 5 et enlever 8. On ajoute 10 unités en haut et 1 dizaine en bas pour conserver la différence.',
      exampleExpressions: ['8 - 5', '5 - 8'],
      understandingQuestion: 'Si on part de 8 et qu’on enlève 5, est-ce la même situation que partir de 5 et enlever 8 ?',
      expectedUnderstanding: ['non', 'pas la meme', 'différent', 'différente', 'pas la même'],
      nextAction: 'check-understanding',
      simplerExplanation: 'Regarde le nombre de départ : 8 − 5 commence avec 8, tandis que 5 − 8 commence avec 5. Le nombre de départ n’est pas le même.',
    };
  }

  return {
    observedResponse,
    misconception,
    principle: 'Chaque colonne se calcule avec les nombres qui y sont écrits.',
    explanation: 'Ton idée ne correspond pas encore aux nombres de cette colonne. Regardons les nombres présents avant de continuer.',
    concreteExample: 'On lit d’abord le nombre de départ, puis le nombre que l’on enlève.',
    exampleExpressions: ['5 - 2', '5 - 3'],
    understandingQuestion: 'Doit-on utiliser les nombres réellement écrits dans la colonne ?',
    expectedUnderstanding: ['oui', 'exact', 'd’accord', "d'accord"],
    nextAction: 'check-understanding',
    simplerExplanation: 'Lis les deux nombres de la colonne, puis dis si ce sont bien ceux que tu vas utiliser.',
  };
}

export function understandsCorrection(correction: PedagogicalCorrection, answer: string): boolean {
  const normalized = answer.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return correction.expectedUnderstanding.some(expected => normalized.includes(expected.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}
