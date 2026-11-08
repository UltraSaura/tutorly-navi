import type { ExplanationExperience } from './explanationMode';

export type TutoringMode = 'guided' | 'teaching' | 'review';
export type AssistanceLevel = 'concrete' | 'standard' | 'concise';
export type TeacherEvent =
  | { type: 'request_hint' }
  | { type: 'request_different_explanation' }
  | { type: 'student_attempt'; answer: string; isCorrect: boolean; misconception?: string }
  | { type: 'similar_exercise_completed'; isCorrect: boolean };

export interface MasteryEvidence {
  score: number | null;
  recentCorrect: number;
  recentIncorrect: number;
  repeatedMisconception?: string;
}

export interface TeacherAttempt {
  answer: string;
  isCorrect: boolean;
  misconception?: string;
}

/** The solver owns correctness; this contract only consumes its verified output. */
export interface VerifiedTeacherSolution {
  expression: string;
  result: string;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'other';
  stepCount: number;
  isVerified: true;
}

export interface TeacherEngineInput {
  problem: string;
  grade: string;
  curriculumObjective: string;
  mastery: MasteryEvidence;
  attempts: TeacherAttempt[];
  preferredPresentation?: 'visual' | 'text' | 'concrete';
  tutoringMode: TutoringMode;
  verifiedSolution: VerifiedTeacherSolution;
  explanationExperience?: ExplanationExperience;
}

export interface TeacherDecision {
  teachingObjective: string;
  assistance: AssistanceLevel;
  strategy: string;
  studentFacingQuestion: string;
  studentFacingExplanation: string;
  visualDemonstration: 'structured-operation-grid' | 'two-cards' | 'none';
  expectedStudentResponse: string;
  progressiveHints: string[];
  misconceptionIndicators: string[];
  remediationRecommendation: string;
  progressionCriteria: string;
  finalAnswerVisible: boolean;
  explanationStep: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function chooseAssistanceLevel(input: Pick<TeacherEngineInput, 'mastery' | 'attempts'>): AssistanceLevel {
  const score = input.mastery.score ?? 0.5;
  const incorrect = input.mastery.recentIncorrect + input.attempts.filter((attempt) => !attempt.isCorrect).length;
  const repeated = Boolean(input.mastery.repeatedMisconception);

  if (repeated || incorrect >= 2 || score < 0.4) return 'concrete';
  if (score >= 0.8 && incorrect === 0) return 'concise';
  return 'standard';
}

function isRegroupingSubtraction(input: TeacherEngineInput): boolean {
  return input.verifiedSolution.operation === 'subtraction' && /[-−]/.test(input.problem);
}

function subtractionContent(level: AssistanceLevel, step: number): Pick<TeacherDecision, 'teachingObjective' | 'studentFacingQuestion' | 'studentFacingExplanation' | 'progressiveHints' | 'expectedStudentResponse' | 'progressionCriteria'> {
  const concrete = level === 'concrete';
  const hints = concrete
    ? [
        'Regarde la colonne des unités : compare les deux chiffres.',
        'Si le chiffre du haut est trop petit, échange une dizaine contre dix unités.',
        'Après l’échange, écris la nouvelle dizaine et les nouvelles unités.',
      ]
    : [
        'Quelle colonne doit être transformée avant de soustraire ?',
        'Quelle valeur est échangée entre les dizaines et les unités ?',
        'Vérifie chaque colonne avant d’écrire le résultat.',
      ];
  return {
    teachingObjective: 'Comprendre le regroupement comme un échange de valeurs de position.',
    studentFacingQuestion: step === 0
      ? 'Dans la colonne des unités, peux-tu soustraire le chiffre du bas au chiffre du haut ?'
      : 'Quelle valeur peux-tu échanger pour continuer le calcul ?',
    studentFacingExplanation: concrete
      ? 'Une dizaine vaut dix unités. Nous pouvons donc échanger une dizaine contre dix unités, puis calculer dans chaque colonne.'
      : 'On ne déplace pas les chiffres au hasard : on conserve la même quantité en échangeant une dizaine contre dix unités.',
    progressiveHints: hints,
    expectedStudentResponse: 'Identifier la colonne bloquée et décrire l’échange de valeur avant de calculer.',
    progressionCriteria: 'Passer à l’étape suivante lorsque l’élève explique l’échange et donne une réponse de colonne cohérente.',
  };
}

function genericContent(input: TeacherEngineInput, level: AssistanceLevel, step: number): Pick<TeacherDecision, 'teachingObjective' | 'studentFacingQuestion' | 'studentFacingExplanation' | 'progressiveHints' | 'expectedStudentResponse' | 'progressionCriteria'> {
  return {
    teachingObjective: input.curriculumObjective,
    studentFacingQuestion: step === 0 ? 'Quelle est la première étape de cette opération ?' : 'Peux-tu vérifier cette étape avant de continuer ?',
    studentFacingExplanation: level === 'concrete'
      ? 'Commençons par une seule colonne et nommons la valeur de chaque chiffre.'
      : 'Traite une étape à la fois, puis vérifie que la transformation conserve la même quantité.',
    progressiveHints: ['Repère la colonne ou le rang actif.', 'Explique la transformation avec les unités de position.', 'Vérifie ton résultat avec l’opération inverse.'],
    expectedStudentResponse: 'Décrire la prochaine étape avec le vocabulaire mathématique attendu.',
    progressionCriteria: 'Continuer après une réponse expliquée ou une tentative indépendante correcte.',
  };
}

export function buildTeacherDecision(input: TeacherEngineInput, step = 0): TeacherDecision {
  if (!input.verifiedSolution.isVerified) throw new Error('Une solution vérifiée est obligatoire pour le Teacher Engine.');
  if (input.verifiedSolution.stepCount < 1) throw new Error('La solution vérifiée doit contenir au moins une étape.');

  const assistance = chooseAssistanceLevel(input);
  const content = isRegroupingSubtraction(input)
    ? subtractionContent(assistance, step)
    : genericContent(input, assistance, step);
  const latest = input.attempts.at(-1);
  const repeatedFailure = input.mastery.repeatedMisconception || (input.attempts.filter((attempt) => !attempt.isCorrect).length >= 2 ? 'Difficulté persistante sur cette compétence.' : undefined);
  const isGuided = input.tutoringMode === 'guided';
  const isReview = input.tutoringMode === 'review';
  const finalAnswerVisible = !isGuided || Boolean(latest?.isCorrect) || step >= input.verifiedSolution.stepCount - 1;
  const visualDemonstration: TeacherDecision['visualDemonstration'] = input.explanationExperience === 'two-cards'
    ? 'two-cards'
    : input.verifiedSolution.operation === 'other' ? 'none' : 'structured-operation-grid';

  return {
    ...content,
    assistance,
    strategy: isReview
      ? 'Analyser uniquement les éléments réellement fournis par l’élève, puis proposer une correction ciblée.'
      : input.tutoringMode === 'teaching'
        ? 'Présenter une idée mathématique, vérifier la compréhension, puis poursuivre.'
        : 'Poser une question, attendre une tentative, puis renforcer l’aide progressivement.',
    visualDemonstration,
    misconceptionIndicators: [
      'Chiffres non alignés par rang de position',
      'Échange décrit comme un déplacement sans conservation de la valeur',
      ...(repeatedFailure ? [repeatedFailure] : []),
    ],
    remediationRecommendation: repeatedFailure
      ? 'Revenir à une représentation concrète des unités et dizaines, puis proposer une opération similaire plus courte.'
      : 'Si la réponse échoue, reprendre la colonne active avec un indice supplémentaire.',
    finalAnswerVisible,
    explanationStep: clamp(step, 0, Math.max(0, input.verifiedSolution.stepCount - 1)),
  };
}

export function transitionTeacherDecision(input: TeacherEngineInput, event: TeacherEvent, step = 0): TeacherDecision {
  const nextAttempts = event.type === 'student_attempt'
    ? [...input.attempts, { answer: event.answer, isCorrect: event.isCorrect, misconception: event.misconception }]
    : input.attempts;
  const nextMastery = event.type === 'student_attempt' && event.misconception
    ? { ...input.mastery, repeatedMisconception: event.misconception }
    : input.mastery;
  const nextInput = { ...input, attempts: nextAttempts, mastery: nextMastery };

  if (event.type === 'request_hint') return buildTeacherDecision(nextInput, step);
  if (event.type === 'request_different_explanation') return buildTeacherDecision({ ...nextInput, mastery: { ...nextMastery, score: Math.min(nextMastery.score ?? 0.5, 0.35) } }, step);
  if (event.type === 'similar_exercise_completed') return buildTeacherDecision(nextInput, event.isCorrect ? step + 1 : step);
  return buildTeacherDecision(nextInput, event.isCorrect ? step + 1 : step);
}
