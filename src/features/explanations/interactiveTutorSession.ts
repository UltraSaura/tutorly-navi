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
}

const stages = [
  { question: 'On a 5 unités, mais on doit en enlever 8. Comment peut-on faire ?', answer: '', feedback: 'Oui, on échange une dizaine contre 10 unités.', hints: ['Les dizaines peuvent nous aider à obtenir plus d’unités.', 'Échange une dizaine contre 10 unités.'], demo: '5 + 10' },
  { question: 'Une dizaine représente combien d’unités ?', answer: '10', feedback: 'Oui ! Une dizaine vaut 10 unités.', hints: ['Pense à un paquet de dix objets.', 'Compte les dix objets : ils forment une dizaine.'], demo: '5 + 5' },
  { question: 'Si on échange une dizaine, combien d’unités avons-nous maintenant ?', answer: '15', feedback: 'Oui : 5 + 10 font 15 unités.', hints: ['On garde les 5 unités et on ajoute celles de la dizaine.', 'Ajoute 10 aux 5 unités : 5 + 10.'], demo: '5 + 10' },
  { question: 'Très bien. Maintenant, combien font 15 − 8 ?', answer: '7', feedback: 'Oui ! On écrit 7 dans la colonne des unités.', hints: ['Enlève 8 aux 15 unités.', 'Enlève d’abord 5 pour arriver à 10, puis encore 3.'], demo: '15 - 8' },
  { question: 'On avait 2 dizaines et on en a échangé une. Combien en reste-t-il ?', answer: '1', feedback: 'Il reste 1 dizaine. Cela ne suffit pas pour en enlever 4.', hints: ['La dizaine échangée n’est plus dans cette colonne.', 'Calcule 2 − 1.'], demo: '2 - 1' },
  { question: 'On échange une centaine contre 10 dizaines. Avec la dizaine restante, combien de dizaines avons-nous ?', answer: '11', feedback: 'Oui : 1 + 10 font 11 dizaines. Il reste 2 centaines.', hints: ['Une centaine vaut 10 dizaines.', 'Ajoute ces 10 dizaines à la dizaine restante.'], demo: '1 + 10' },
  { question: 'Combien font 11 − 4 ?', answer: '7', feedback: 'Oui ! On écrit 7 dans la colonne des dizaines.', hints: ['Enlève 4 aux 11 dizaines.', 'Enlève 1 pour arriver à 10, puis encore 3.'], demo: '11 - 4' },
  { question: 'Il reste 2 centaines après l’échange. Combien font 2 − 1 ?', answer: '1', feedback: 'Oui ! On écrit 1 dans la colonne des centaines.', hints: ['Une des 3 centaines a été échangée.', 'Il reste 2 centaines, et on en enlève une.'], demo: '2 - 1' },
  { question: 'Lis les chiffres obtenus : 1 centaine, 7 dizaines et 7 unités. Quel est le résultat ?', answer: '177', feedback: 'Exact, 325 − 148 = 177. Essaie maintenant un calcul proche.', hints: ['Lis les centaines, puis les dizaines et les unités.', 'Assemble 100 + 70 + 7.'], demo: '170 + 7' },
  { question: 'À toi maintenant : 326 − 157 = ?', answer: '169', feedback: 'Bravo, tu as terminé les deux calculs.', hints: ['Commence par les unités. Échange une dizaine, puis une centaine si nécessaire.', 'Après les échanges : 16 − 7 unités, 11 − 5 dizaines et 2 − 1 centaines.'], demo: '16 - 7' },
] as const;

export const regroupingPrompts = stages;
export const isTransferStage = (session: InteractiveTutorSession) => session.step === 9;
export const demonstrationExpression = (session: InteractiveTutorSession) => session.prerequisite ? '5 + 5' : stages[session.step].demo;
const normalize = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const activeState = (session: InteractiveTutorSession): InteractiveTutorState => isTransferStage(session) ? 'transfer' : 'awaiting-response';
const terminal = (session: InteractiveTutorSession) => session.state === 'complete' || session.state === 'needs-support';

export function createInteractiveTutorSession(): InteractiveTutorSession {
  return { state: 'awaiting-response', step: 0, hintLevel: 0, attempts: [], question: stages[0].question, feedback: '', assistanceLevel: 0, hintLevelsByStep: {}, demonstrationUsed: false, demonstratedSteps: [], criticalStepIndependent: false, transferAttempts: 0, prerequisite: false, correctionCheckAttempts: 0, correctionDemo: false };
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
  const approach = /^(j['’]echange|echange[r]?|j['’]emprunte|emprunter) (une|1) dizaine (contre|pour|en) (10|dix) unites\.?$/.test(normalized);
  const correct = session.prerequisite ? numeric === '10' : session.step === 0 ? approach : numeric === stages[session.step].answer;
  const misconception: InteractiveMisconception | undefined = correct ? undefined : session.step === 0 && /8\s*(moins|-)\s*5/.test(normalized) ? 'reversed-subtraction' : session.step === 0 && normalized.includes('commence par les dizaines') ? 'skipped-units' : session.step === 0 ? 'insufficient-evidence' : 'incorrect-arithmetic-fact';
  const attempts = [...session.attempts, { step: session.step, prerequisite: session.prerequisite, answer, isCorrect: correct, misconception }];
  const updated = { ...session, attempts, lastMisconception: misconception, transferAttempts: session.transferAttempts + (isTransferStage(session) && !session.prerequisite ? 1 : 0) };
  if (correct) {
    if (session.prerequisite) return { ...updated, prerequisite: false, state: activeState(session), question: stages[session.step].question, feedback: 'Oui, 5 + 5 font 10. Reprenons la question avec cette idée.' };
    if (isTransferStage(session)) return { ...updated, state: 'complete', feedback: stages[9].feedback };
    const step = session.step === 0 ? 2 : session.step + 1;
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
  return { ...updated, state: 'feedback', feedback: session.prerequisite ? 'Compte cinq objets, puis cinq autres. Tu peux réessayer ou demander un indice.' : 'Pas encore. Tu peux réessayer ou demander un indice pour cette question.' };
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
  return { ...session, state: 'demonstrate', correctionDemo: true, assistanceLevel: Math.max(3, session.assistanceLevel) as 3 | 4, demonstrationUsed: true, feedback: 'Regardons la méthode sur toute l’opération, puis tu feras le calcul des unités.' };
}

export function demonstrateTutorStep(session: InteractiveTutorSession): InteractiveTutorSession {
  if (terminal(session)) return session;
  return { ...session, state: 'demonstrate', assistanceLevel: Math.max(3, session.assistanceLevel) as 3 | 4, demonstrationUsed: true, demonstratedSteps: [...new Set([...session.demonstratedSteps, session.step])], feedback: 'Regarde ce petit calcul avec les flèches, puis reviens répondre à la question.' };
}

export function continueAfterDemonstration(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state !== 'demonstrate') return session;
  if (session.correctionDemo) return { ...session, state: 'awaiting-response', correctionDemo: false, step: 3, question: stages[3].question, feedback: 'À toi maintenant : calcule les unités de cette opération.' };
  return { ...session, state: activeState(session), feedback: 'À toi : réponds maintenant à la question de cette étape.' };
}

export function resumeWithSupport(session: InteractiveTutorSession): InteractiveTutorSession {
  return session.state === 'needs-support' ? { ...session, state: activeState(session), feedback: 'Avec ton accompagnant, réponds à la question. Ton calcul a été conservé.' } : session;
}
