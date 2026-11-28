import { rationalText, solutionOf, type EquationTransformation } from './equationSolver';

export type DemonstrationStage = 0 | 1 | 2;
export type StepInstruction = { label: string; text: string };

/**
 * The short, ALWAYS visible explanation of what the animation is doing.
 * Longer justifications remain in the optional "Pourquoi cette étape ?" panel.
 * The source is the checked solver transformation, never generated free-form.
 */
export function equationStepInstruction(step: EquationTransformation, stage: DemonstrationStage): StepInstruction {
  const { a, b, c, d } = step.beforeState;
  const label = stage === 0 ? 'Ce qu’on va faire' : stage === 1 ? 'Ce qu’on fait' : 'Ce qu’on obtient';
  const solution = rationalText(solutionOf(step.beforeState));
  let text: string;
  switch (step.id) {
    case 'subtract-variable': {
      const variable = Math.abs(d) === 1 ? 'x' : Math.abs(d) + 'x';
      const action = d > 0 ? 'soustraire' : 'ajouter';
      const present = d > 0 ? 'soustrait' : 'ajoute';
      text = stage === 0
        ? 'Pour regrouper les x à gauche, on va ' + action + ' ' + variable + ' aux deux membres.'
        : stage === 1
          ? 'On ' + present + ' ' + variable + ' à gauche ET à droite pour conserver l’égalité.'
          : 'Les termes en x à droite s’annulent. On a regroupé les x à gauche.';
      break;
    }
    case 'subtract-constant': {
      const magnitude = Math.abs(b);
      const action = b > 0 ? 'soustraire' : 'ajouter';
      const present = b > 0 ? 'soustrait' : 'ajoute';
      text = stage === 0
        ? 'Pour isoler le terme en x, on va ' + action + ' ' + magnitude + ' aux deux membres.'
        : stage === 1
          ? 'On ' + present + ' ' + magnitude + ' à gauche ET à droite pour conserver l’égalité.'
          : 'Les nombres opposés s’annulent à gauche. À droite, ' + c +
            (b > 0 ? ' − ' : ' + ') + magnitude + ' = ' + (c - b) + '.';
      break;
    }
    case 'divide': {
      const divisor = a < 0 ? '(' + a + ')' : String(a);
      text = stage === 0
        ? 'Pour trouver x tout seul, on va diviser les deux membres par ' + divisor + '.'
        : stage === 1
          ? 'On divise le membre gauche ET le membre droit par ' + divisor + '.'
          : 'Après la division par ' + divisor + ', il reste x = ' + solution + '.';
      break;
    }
    case 'verify':
      text = stage === 0
        ? 'Pour vérifier la réponse, on va remplacer x par ' + solution + ' dans l’équation de départ.'
        : stage === 1
          ? 'On remplace chaque x par ' + solution + ', puis on calcule chaque membre.'
          : 'Les deux membres ont la même valeur : ' + step.after.replace(/\s*✓\s*$/, '') + '. La réponse est vérifiée.';
      break;
  }
  return { label, text };
}
