import type { InteractiveTutorSession } from './interactiveTutorSession';

export type SubtractionVisual = {
  operation: string;
  upper: [string, string, string];
  lower: [string, string, string];
  result: [string, string, string];
  activeColumn: 'hundreds' | 'tens' | 'units' | 'result';
  compensation: string | null;
};

export function buildSubtractionVisual(session: Pick<InteractiveTutorSession, 'step' | 'completedSteps'>): SubtractionVisual {
  const transfer = session.step >= 9;
  const upper: [string, string, string] = transfer ? ['3', '2', '6'] : ['3', '2', '5'];
  const lower: [string, string, string] = transfer ? ['1', '5', '7'] : ['1', '4', '8'];
  const result: [string, string, string] = ['', '', ''];
  const firstStep = transfer ? 9 : 0;
  const resolved = new Set(session.completedSteps);
  const step = session.step;

  if (transfer) {
    if (step >= 9) upper[2] = '16';
    if (step >= 10) { upper[1] = '12'; lower[1] = '6'; }
    if (step >= 11) lower[0] = '2';
    if (resolved.has(9)) result[2] = '9';
    if (resolved.has(10)) result[1] = '6';
    if (resolved.has(11)) result[0] = '1';
  } else {
    if (step >= 2) upper[2] = '15';
    if (step >= 4) lower[1] = '5';
    if (step >= 5) upper[1] = '12';
    if (step >= 7) lower[0] = '2';
    if (resolved.has(3)) result[2] = '7';
    if (resolved.has(6)) result[1] = '7';
    if (resolved.has(7)) result[0] = '1';
  }

  const localStep = step - firstStep;
  const activeColumn = transfer
    ? localStep === 0 ? 'units' : localStep === 1 ? 'tens' : localStep === 2 ? 'hundreds' : 'result'
    : step <= 3 ? 'units' : step <= 6 ? 'tens' : step === 7 ? 'hundreds' : 'result';
  const compensation = transfer
    ? step === 9 ? 'La compensation des unités : +10 en haut et +1 dizaine en bas.'
      : step === 10 ? 'La compensation des dizaines : +10 dizaines en haut et +1 centaine en bas.'
        : null
    : step === 1 ? 'Pour garder la différence, on ajoute +10 unités en haut et +1 dizaine en bas.'
      : step === 4 ? 'La dizaine ajoutée en bas s’ajoute aux 4 dizaines : 4 + 1.'
        : step === 5 ? 'On ajoute 10 dizaines en haut et 1 centaine en bas pour compenser.'
          : step === 7 ? 'La centaine ajoutée en bas s’ajoute à la centaine déjà là.'
            : null;

  return { operation: transfer ? '326 − 157' : '325 − 148', upper, lower, result, activeColumn, compensation };
}
