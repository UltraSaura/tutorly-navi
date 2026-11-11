export type InteractiveTutorState = 'awaiting-response' | 'feedback' | 'hint' | 'demonstrate' | 'correction-explanation' | 'correction-check' | 'transfer' | 'complete' | 'needs-support';
export type InteractiveMisconception = 'reversed-subtraction' | 'incorrect-arithmetic-fact' | 'skipped-units' | 'insufficient-evidence';
import { createPedagogicalCorrection, understandsCorrection, type PedagogicalCorrection } from './pedagogicalCorrection';

// Stage is independent of presentation state: hints and demonstrations cannot lose the question.
export interface InteractiveTutorSession {
  state: InteractiveTutorState;
  step: number;
  hintLevel: number;
  attempts: Array<{ step: number; prerequisite: boolean; answer: string; isCorrect: boolean; misconception?: InteractiveMisconception }>;
  question: string;
  feedback: string;
  lastMisconception?: InteractiveMisconception;
  assistanceLevel: 0 | 1 | 2 | 3 | 4;
  hintLevelsByStep: Record<string, number>;
  demonstrationUsed: boolean;
  demonstratedSteps: number[];
  criticalStepIndependent: boolean;
  transferAttempts: number;
  prerequisite: boolean;
  correction?: PedagogicalCorrection;
  correctionCheckAttempts: number;
  correctionDemo: boolean;
  canAdvance: boolean;
  completedSteps: number[];
}

const stages = [
  { question: 'On a 5 unités, mais on doit en enlever 8. Comment peut-on faire ?', answer: '', feedback: 'Oui, on ajoute 10 unités en haut et 1 dizaine en bas : la différence ne change pas.', hints: ['On peut ajouter la même quantité aux deux nombres sans changer leur différence.', 'Ajoute 10 unités en haut et 1 dizaine en bas.'], demo: '5 + 10' },
  { question: 'Une dizaine représente combien d’unités ?', answer: '10', feedback: 'Oui ! Une dizaine vaut 10 unités.', hints: ['Pense à un paquet de dix objets.', 'Compte les dix objets : ils forment une dizaine.'], demo: '5 + 5' },
  { question: 'Si on ajoute 10 unités aux 5 unités du haut, combien en avons-nous ?', answer: '15', feedback: 'Oui : 5 + 10 font 15 unités.', hints: ['On garde les 5 unités et on ajoute 10 unités.', 'Ajoute 10 aux 5 unités : 5 + 10.'], demo: '5 + 10' },
  { question: 'Très bien. Maintenant, combien font 15 − 8 ?', answer: '7', feedback: 'Oui ! On écrit 7 dans la colonne des unités.', hints: ['Enlève 8 aux 15 unités.', 'Enlève d’abord 5 pour arriver à 10, puis encore 3.'], demo: '15 - 8' },
  { question: 'En bas, la retenue ajoute 1 dizaine aux 4 dizaines. Combien cela fait-il ?', answer: '5', feedback: 'Oui, on doit maintenant enlever 5 dizaines.', hints: ['La compensation ajoute une dizaine en bas.', 'Calcule 4 + 1.'], demo: '325 - 148' },
  { question: 'On ajoute 10 dizaines aux 2 dizaines du haut. Combien cela fait-il ?', answer: '12', feedback: 'Oui, 12 dizaines. On ajoute aussi 1 centaine en bas pour compenser.', hints: ['On ajoute la même quantité aux deux nombres.', 'Calcule 2 + 10.'], demo: '325 - 148' },
  { question: 'Combien font 12 − 5 ?', answer: '7', feedback: 'Oui, 7 dizaines.', hints: ['Enlève 5 aux 12 dizaines.', 'Calcule 12 − 5.'], demo: '325 - 148' },
  { question: 'En bas, 1 centaine plus la retenue font 2 centaines. Combien font 3 − 2 ?', answer: '1', feedback: 'Oui, 1 centaine.', hints: ['Les 3 centaines du haut restent inchangées.', 'Calcule 3 − 2.'], demo: '325 - 148' },
  { question: 'Lis les chiffres obtenus : 1 centaine, 7 dizaines et 7 unités. Quel est le résultat ?', answer: '177', feedback: 'Exact, 325 − 148 = 177. Essaie maintenant un calcul proche.', hints: ['Lis les centaines, puis les dizaines et les unités.', 'Assemble 100 + 70 + 7.'], demo: '170 + 7' },
  { question: 'Unités : 6 − 7 ne suffit pas. On ajoute 10 unités en haut et 1 dizaine en bas pour conserver la différence. Combien font 16 − 7 ?', answer: '9', feedback: 'Oui ! Il reste 9 unités.', hints: ['La compensation transforme 6 en 16 unités.', 'Calcule 16 − 7.'], demo: '16 - 7' },
  { question: 'La dizaine ajoutée en bas fait 5 + 1 = 6. On ajoute 10 dizaines en haut et 1 centaine en bas. Combien font 12 − 6 ?', answer: '6', feedback: 'Oui ! Il reste 6 dizaines.', hints: ['En bas, 5 dizaines et la retenue font 6 dizaines.', 'En haut, 2 dizaines deviennent 12. Calcule 12 − 6.'], demo: '12 - 6' },
  { question: 'La centaine ajoutée en bas fait 1 + 1 = 2. Combien font 3 − 2 ?', answer: '1', feedback: 'Oui ! Il reste 1 centaine.', hints: ['La dizaine ajoutée en haut est compensée par une centaine en bas.', 'Calcule 3 − 2.'], demo: '3 - 2' },
  { question: 'Assemble les chiffres des unités, dizaines et centaines. Quel est le résultat de 326 − 157 ?', answer: '169', feedback: 'Bravo ! 326 − 157 = 169. Tu as appliqué la compensation jusqu’au bout.', hints: ['Lis les chiffres obtenus de gauche à droite.', 'Tu as 1 centaine, 6 dizaines et 9 unités.'], demo: '100 + 60 + 9' },
] as const;

export const regroupingPrompts = stages;
export const isTransferStage = (session: InteractiveTutorSession) => session.step >= 9;
export const demonstrationExpression = (_session: InteractiveTutorSession) => '325 - 148';
const normalize = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const activeState = (session: InteractiveTutorSession): InteractiveTutorState => isTransferStage(session) ? 'transfer' : 'awaiting-response';
const terminal = (session: InteractiveTutorSession) => session.state === 'complete' || session.state === 'needs-support';

export function createInteractiveTutorSession(): InteractiveTutorSession {
  return { state: 'awaiting-response', step: 0, hintLevel: 0, attempts: [], question: stages[0].question, feedback: '', assistanceLevel: 0, hintLevelsByStep: {}, demonstrationUsed: false, demonstratedSteps: [], criticalStepIndependent: false, transferAttempts: 0, prerequisite: false, correctionCheckAttempts: 0, correctionDemo: false, canAdvance: false, completedSteps: [] };
}

function prerequisite(session: InteractiveTutorSession): InteractiveTutorSession {
  return { ...session, state: 'awaiting-response', prerequisite: true, hintLevel: 0, assistanceLevel: 4, question: 'Un petit calcul pour préparer la suite : combien font 5 + 5 ?', feedback: 'Comptons deux groupes de cinq avant de reprendre la question.' };
}

export function submitTutorResponse(session: InteractiveTutorSession, answer: string): InteractiveTutorSession {
  if (!answer.trim() || terminal(session) || session.state === 'demonstrate') return session;
  const normalized = normalize(answer).replace(/[−–]/g, '-');
  if (session.state === 'correction-check' && session.correction) {
    const understood = understandsCorrection(session.correction, answer);
    if (understood) return { ...session, state: 'awaiting-response', step: 1, question: stages[1].question, feedback: 'Oui, ce sont deux situations différentes. Maintenant, voyons combien vaut une dizaine.', correctionCheckAttempts: session.correctionCheckAttempts + 1 };
    return { ...session, state: 'correction-explanation', feedback: session.correction.simplerExplanation, correctionCheckAttempts: session.correctionCheckAttempts + 1 };
  }
  const numeric = normalized.replace(/\s*(unites?|dizaines?|centaines?)\.?$/, '').trim();
  const approach = /^(j['’]ajoute|ajouter) 10 unites en haut et (1|une) dizaine en bas\.?$/.test(normalized);
  const correct = session.prerequisite ? numeric === '10' : session.step === 0 ? approach : numeric === stages[session.step].answer;
  const misconception: InteractiveMisconception | undefined = correct ? undefined : session.step === 0 && /8\s*(moins|-)\s*5/.test(normalized) ? 'reversed-subtraction' : session.step === 0 && normalized.includes('commence par les dizaines') ? 'skipped-units' : session.step === 0 ? 'insufficient-evidence' : 'incorrect-arithmetic-fact';
  const attempts = [...session.attempts, { step: session.step, prerequisite: session.prerequisite, answer, isCorrect: correct, misconception }];
  const updated = { ...session, attempts, lastMisconception: misconception, canAdvance: false, transferAttempts: session.transferAttempts + (isTransferStage(session) && !session.prerequisite ? 1 : 0) };
  if (correct) {
    if (session.prerequisite) return { ...updated, prerequisite: false, state: activeState(session), question: stages[session.step].question, feedback: 'Oui, 5 + 5 font 10. Reprenons la question avec cette idée.' };
    if (isTransferStage(session)) return { ...updated, state: 'feedback', canAdvance: true, completedSteps: [...new Set([...session.completedSteps, session.step])], feedback: stages[session.step].feedback };
    if (session.step === 0) return demonstrateTutorStep({ ...updated, feedback: stages[0].feedback, criticalStepIndependent: session.attempts.length === 0 && session.hintLevel === 0 });
    const step = session.step + 1;
    return { ...updated, step, state: step === 9 ? 'transfer' : 'awaiting-response', hintLevel: 0, question: stages[step].question, feedback: stages[session.step].feedback, criticalStepIndependent: session.criticalStepIndependent || (session.step === 0 && session.attempts.length === 0 && session.hintLevel === 0 && !session.demonstrationUsed) };
  }
  if (session.step === 0 && !session.prerequisite) {
    const correction = createPedagogicalCorrection(misconception ?? 'insufficient-evidence', answer);
    return { ...updated, state: 'correction-explanation', correction, correctionCheckAttempts: 0, feedback: correction.explanation };
  }
  const failures = attempts.filter(a => a.step === session.step && a.prerequisite === session.prerequisite && !a.isCorrect).length;
  if (session.prerequisite && failures >= 2) return { ...updated, state: 'needs-support', feedback: 'Fais deux groupes de cinq objets avec un adulte. Comptez-les ensemble avant de reprendre.' };
  if (!session.prerequisite && failures >= 3 && session.demonstratedSteps.includes(session.step)) {
    // One supported retry after the simpler exercise, then an explicit human-help exit.
    if (session.attempts.some(a => a.step === session.step && a.prerequisite && a.isCorrect)) return { ...updated, state: 'needs-support', feedback: 'Cette étape mérite un accompagnement. Reprends-la avec un adulte, sans recommencer le calcul.' };
    return prerequisite(updated);
  }
  if (!session.prerequisite && failures >= 2) return demonstrateTutorStep(updated);
  const wrongFeedback = session.step === 10 ? 'Vérifie les dizaines : en bas, 5 dizaines et la dizaine ajoutée font 6.' : session.step === 11 ? 'Vérifie les centaines : la compensation ajoute 1 centaine en bas.' : session.step === 12 ? 'Relis les chiffres obtenus dans l’ordre des centaines, dizaines et unités.' : 'Pas encore. Vérifie la compensation, puis essaie encore.';
  return { ...updated, state: 'feedback', feedback: session.prerequisite ? 'Compte cinq objets, puis cinq autres. Tu peux réessayer ou demander un indice.' : wrongFeedback };
}

export function advanceTutorStep(session: InteractiveTutorSession): InteractiveTutorSession {
  if (!session.canAdvance || !isTransferStage(session)) return session;
  if (session.step === 12) return { ...session, state: 'complete', canAdvance: false, feedback: 'Bravo ! Tu as terminé les quatre étapes de 326 − 157.' };
  const step = session.step + 1;
  return { ...session, step, state: 'transfer', canAdvance: false, hintLevel: 0, question: stages[step].question, feedback: '' };
}

export function requestTutorHint(session: InteractiveTutorSession): InteractiveTutorSession {
  if (terminal(session) || session.state === 'demonstrate') return session;
  const hintLevel = session.hintLevel + 1;
  const updated = { ...session, hintLevel, hintLevelsByStep: { ...session.hintLevelsByStep, [`${session.step}${session.prerequisite ? '-prerequisite' : ''}`]: hintLevel } };
  if (hintLevel >= 4) return session.prerequisite ? { ...updated, state: 'needs-support', feedback: 'Compte deux groupes de cinq objets avec un adulte.' } : prerequisite(updated);
  if (hintLevel === 3) return demonstrateTutorStep(updated);
  return { ...updated, state: 'hint', assistanceLevel: Math.max(session.assistanceLevel, hintLevel) as 1 | 2 | 3 | 4, feedback: session.prerequisite ? (hintLevel === 1 ? 'Prépare deux groupes de cinq objets.' : 'Compte tous les objets des deux groupes, un par un.') : stages[session.step].hints[hintLevel - 1] };
}

export function retryTutorQuestion(session: InteractiveTutorSession): InteractiveTutorSession {
  if (terminal(session) || session.state === 'demonstrate') return session;
  return { ...session, state: activeState(session), feedback: 'À toi : réponds à la question ci-dessous.' };
}

export function beginCorrectionCheck(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state !== 'correction-explanation' || !session.correction) return session;
  return { ...session, state: 'correction-check', question: session.correction.understandingQuestion, feedback: 'À toi : explique avec tes mots ou choisis une réponse.' };
}

export function demonstrateCorrectionMethod(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state !== 'correction-explanation' || !session.correction) return session;
  return { ...session, state: 'demonstrate', correctionDemo: true, assistanceLevel: Math.max(3, session.assistanceLevel) as 3 | 4, demonstrationUsed: true, feedback: 'Regardons la compensation sur 325 − 148. Tu essaieras ensuite un autre calcul.' };
}

export function demonstrateTutorStep(session: InteractiveTutorSession): InteractiveTutorSession {
  if (terminal(session)) return session;
  return { ...session, state: 'demonstrate', assistanceLevel: Math.max(3, session.assistanceLevel) as 3 | 4, demonstrationUsed: true, demonstratedSteps: [...new Set([...session.demonstratedSteps, session.step])], feedback: 'Revois la compensation sur 325 − 148, puis applique-la à 326 − 157.' };
}

export function continueAfterDemonstration(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state !== 'demonstrate') return session;
  if (session.prerequisite) return { ...session, state: 'awaiting-response', feedback: 'Reprenons le petit calcul de préparation.' };
  if (isTransferStage(session)) return { ...session, state: 'transfer', feedback: 'À toi : reprends cette étape.' };
  return { ...session, state: 'transfer', correctionDemo: false, step: 9, question: stages[9].question, feedback: 'À toi ! Applique la même méthode à ce nouveau calcul.', demonstratedSteps: [...new Set([...session.demonstratedSteps, 9])] };
}

export function resumeWithSupport(session: InteractiveTutorSession): InteractiveTutorSession {
  return session.state === 'needs-support' ? { ...session, state: activeState(session), feedback: 'Avec ton accompagnant, réponds à la question. Ton calcul a été conservé.' } : session;
}
