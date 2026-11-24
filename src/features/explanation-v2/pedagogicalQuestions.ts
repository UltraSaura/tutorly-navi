import type { InteractiveActivitySpec } from './activityContract';
import { expectedFractionSteps } from './math';

type FractionSpec = Extract<InteractiveActivitySpec, { kind: 'fraction-bar' }>;
type CoordinateSpec = Extract<InteractiveActivitySpec, { kind: 'coordinate-plane' }>;

export type GuidedQuestion = {
  step: string;
  context: string;
  question: string;
  answerHelp: string;
};

const elementary = new Set(['CE1', 'CE2', 'CM1', 'CM2', '6e']);
const partNames: Record<number, string> = {
  2: 'moitiés', 3: 'tiers', 4: 'quarts', 5: 'cinquièmes',
  6: 'sixièmes', 8: 'huitièmes', 10: 'dixièmes', 12: 'douzièmes',
};
export function namedParts(denominator: number): string {
  return partNames[denominator] ?? 'parts sur ' + denominator;
}
function isYoung(level: string | undefined, defaultYoung: boolean): boolean {
  return level ? elementary.has(level) : defaultYoung;
}

/** Questions are computed from the validated math data, never inferred from an AI prompt. */
export function fractionGuidedQuestion(spec: FractionSpec, phase: number): GuidedQuestion {
  const steps = expectedFractionSteps(spec.left, spec.right, spec.targetDenominator);
  const unit = namedParts(spec.targetDenominator);
  const young = isYoung(spec.schoolLevel, true);
  if (phase === 0) {
    return {
      step: 'Étape 1 sur 2 · Mettre les parts à la même taille',
      context: young
        ? 'Regarde les deux barres : elles ont la même taille. En haut, ' + spec.left.n + '/' + spec.left.d + ' est colorié. En bas, ' + spec.right.n + '/' + spec.right.d + ' est colorié. Pour les additionner, on doit compter des morceaux de même taille.'
        : 'Pour additionner ' + spec.left.n + '/' + spec.left.d + ' et ' + spec.right.n + '/' + spec.right.d + ', exprime les deux fractions avec le même dénominateur : ' + spec.targetDenominator + '.',
      question: 'Si tu partages la barre du bas en ' + spec.targetDenominator + ' parts égales, combien de ' + unit + ' seront coloriés ?',
      answerHelp: 'Écris seulement le nombre de ' + unit + ', sans écrire de fraction.',
    };
  }
  return {
    step: 'Étape 2 sur 2 · Compter toutes les parts',
    context: young
      ? 'Maintenant, les deux barres sont partagées en ' + unit + '. La barre du haut montre ' + steps.leftParts + ' ' + unit + ' coloriés et celle du bas en montre ' + steps.rightParts + '.'
      : 'Les deux fractions ont le même dénominateur (' + spec.targetDenominator + '). Additionne leurs numérateurs : ' + steps.leftParts + ' et ' + steps.rightParts + '.',
    question: 'Combien de ' + unit + ' coloriés y a-t-il en tout dans les deux barres ?',
    answerHelp: 'Écris seulement le nombre total de ' + unit + ', sans écrire de fraction.',
  };
}

export function coordinateGuidedQuestion(spec: CoordinateSpec): GuidedQuestion {
  const { x, y } = spec.target;
  const young = isYoung(spec.schoolLevel, false);
  const horizontal = x === 0 ? 'reste sur la ligne verticale du centre' : 'avance de ' + Math.abs(x) + ' case' + (Math.abs(x) > 1 ? 's' : '') + ' vers la ' + (x > 0 ? 'droite' : 'gauche');
  const vertical = y === 0 ? 'reste sur la ligne horizontale du centre' : 'déplace-toi de ' + Math.abs(y) + ' case' + (Math.abs(y) > 1 ? 's' : '') + ' vers le ' + (y > 0 ? 'haut' : 'bas');
  return {
    step: 'Placer un point dans un repère',
    context: young
      ? 'Pars du centre du graphique (0 ; 0). D’abord, ' + horizontal + '. Ensuite, ' + vertical + '.'
      : 'Le point A doit avoir pour abscisse x = ' + x + ' (axe horizontal) et pour ordonnée y = ' + y + ' (axe vertical). Depuis l’origine (0 ; 0), ' + horizontal + ', puis ' + vertical + '.',
    question: 'Peux-tu placer le point A aux coordonnées (' + x + ' ; ' + y + ') ?',
    answerHelp: 'Déplace le point sur le graphique, puis appuie sur « Valider la position ». Tu peux aussi utiliser les flèches.',
  };
}
