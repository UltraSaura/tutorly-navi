export type InteractiveTutorState =
  | 'introduce'
  | 'awaiting-response'
  | 'feedback'
  | 'hint'
  | 'demonstrate'
  | 'transfer'
  | 'complete';

export type InteractiveMisconception = 'reversed-subtraction' | 'skipped-units' | 'incorrect-result' | 'insufficient-evidence';

export interface InteractiveTutorSession {
  state: InteractiveTutorState;
  step: number;
  hintLevel: number;
  attempts: Array<{ answer: string; isCorrect: boolean; misconception?: InteractiveMisconception }>;
  question: string;
  feedback: string;
  lastMisconception?: InteractiveMisconception;
  transferQuestion?: string;
}

const stepQuestions = [
  'Que fait-on quand 8 unités doivent être enlevées à 5 unités ?',
  'Après l’échange, combien avons-nous d’unités ?',
  'Combien font 15 moins 8 ?',
];

const hints = [
  'Regarde d’abord la colonne des unités.',
  'Une dizaine vaut 10 unités : échange une dizaine contre 10 unités.',
  'Après l’échange, les 5 unités deviennent 15 unités.',
];

export function createInteractiveTutorSession(): InteractiveTutorSession {
  return {
    state: 'awaiting-response',
    step: 0,
    hintLevel: 0,
    attempts: [],
    question: stepQuestions[0],
    feedback: 'Je t’écoute : explique ce que tu ferais dans la colonne des unités.',
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function classifyRegroupingResponse(answer: string): { correct: boolean; misconception?: InteractiveMisconception; feedback: string } {
  const normalized = normalize(answer);
  if ((normalized.includes('echange') || normalized.includes('emprunt')) && (normalized.includes('dix') || normalized.includes('10'))) {
    return { correct: true, feedback: 'Oui. Une dizaine devient 10 unités. Tu peux poursuivre avec la nouvelle quantité.' };
  }
  if (normalized.includes('8') && normalized.includes('5') && (normalized.includes('moins') || normalized.includes('-'))) {
    return { correct: false, misconception: 'reversed-subtraction', feedback: 'On ne retourne pas la soustraction : le 8 reste le nombre à enlever. Cherche plutôt un échange entre les dizaines et les unités.' };
  }
  if (normalized.includes('dizaine') && !normalized.includes('unite')) {
    return { correct: false, misconception: 'skipped-units', feedback: 'On commence par les unités, car c’est la colonne où 5 est trop petit pour enlever 8.' };
  }
  if (normalized.includes('3') || normalized.includes('trois')) {
    return { correct: false, misconception: 'incorrect-result', feedback: '5 unités ne suffisent pas pour enlever 8 unités. Il faut d’abord transformer une dizaine.' };
  }
  return { correct: false, misconception: 'insufficient-evidence', feedback: 'Je n’ai pas encore compris ta méthode. Dis ce que tu fais avec une dizaine et 10 unités.' };
}

function classifyStepResponse(step: number, answer: string) {
  const normalized = normalize(answer);
  const expected = step === 1 ? ['15', 'quinze'] : ['7', 'sept'];
  if (expected.some((value) => normalized === value || normalized.includes(value))) {
    return { correct: true, feedback: step === 1 ? 'Exact : 5 + 10 font 15 unités.' : 'Exact : 15 moins 8 font 7.' };
  }
  return {
    correct: false,
    misconception: 'incorrect-result' as const,
    feedback: step === 1 ? 'Après l’échange, ajoute 10 aux 5 unités.' : 'Repars de 15 et enlève 8 unités, une colonne à la fois.',
  };
}

export function submitTutorResponse(session: InteractiveTutorSession, answer: string): InteractiveTutorSession {
  if (!answer.trim() || session.state === 'complete' || session.state === 'demonstrate') return session;
  if (session.state === 'transfer') {
    const correct = normalize(answer).replace(/\s/g, '') === '169';
    return {
      ...session,
      state: correct ? 'complete' : 'transfer',
      feedback: correct ? 'Bravo : tu as réussi une nouvelle soustraction avec moins d’aide.' : 'Vérifie les unités puis les dizaines. Essaie encore sans regarder la démonstration.',
      attempts: [...session.attempts, { answer, isCorrect: correct, misconception: correct ? undefined : 'incorrect-result' }],
    };
  }

  const result = session.step === 0 ? classifyRegroupingResponse(answer) : classifyStepResponse(session.step, answer);
  const nextAttempts = [...session.attempts, { answer, isCorrect: result.correct, misconception: result.misconception }];
  if (result.correct) {
    const nextStep = session.step + 1;
    if (nextStep >= stepQuestions.length) {
      return { ...session, state: 'transfer', step: nextStep, attempts: nextAttempts, question: 'À toi maintenant : 326 − 157 = ?', feedback: 'Tu as terminé l’exemple. Essaie maintenant une soustraction proche, sans aide.', transferQuestion: '326 − 157 = ?' };
    }
    return { ...session, state: 'awaiting-response', step: nextStep, hintLevel: 0, attempts: nextAttempts, question: stepQuestions[nextStep], feedback: result.feedback, lastMisconception: undefined };
  }

  const repeated = result.misconception && session.attempts.filter((attempt) => attempt.misconception === result.misconception && !attempt.isCorrect).length >= 1;
  return { ...session, state: 'feedback', attempts: nextAttempts, feedback: repeated ? `${result.feedback} Je vais te montrer cette étape, puis tu réessaieras.` : result.feedback, lastMisconception: result.misconception };
}

export function requestTutorHint(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state === 'complete' || session.state === 'demonstrate') return session;
  const level = Math.min(session.hintLevel + 1, hints.length);
  return { ...session, state: 'hint', hintLevel: level, feedback: hints[level - 1] };
}

export function retryTutorQuestion(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state === 'complete') return session;
  return { ...session, state: session.state === 'transfer' ? 'transfer' : 'awaiting-response', feedback: 'Essaie encore. Explique une seule étape à la fois.' };
}

export function demonstrateTutorStep(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state === 'complete' || session.state === 'transfer') return session;
  return { ...session, state: 'demonstrate', feedback: 'Observe la colonne active, puis explique-la avec tes mots.' };
}

export function continueAfterDemonstration(session: InteractiveTutorSession): InteractiveTutorSession {
  if (session.state !== 'demonstrate') return session;
  return { ...session, state: 'awaiting-response', feedback: 'À toi : réponds maintenant à la question de cette étape.' };
}
