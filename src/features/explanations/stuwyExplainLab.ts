import { generateSteps } from '@/utils/mathStepper/stepGenerator';
import { parseExpression } from '@/utils/mathStepper/parser';
import type { MathStep } from '@/utils/mathStepper/types';
import { buildPlaceValueSolution, type PlaceValueSolution } from '@/utils/mathStepper/placeValueGrid';

export type LabDepth = 'guided' | 'concise' | 'remediation';

export interface LabRequest {
  expression: string;
  grade: string;
  objective: string;
  method: string;
  depth: LabDepth;
}

export interface LabSolution {
  request: LabRequest;
  steps: MathStep[];
  result: number;
  displayResult: string;
  checks: { name: string; passed: boolean; detail: string }[];
  pedagogicalNotes: string[];
  grid: PlaceValueSolution;
}

export function buildLabSolution(request: LabRequest): LabSolution {
  const parsed = parseExpression(request.expression);
  if (!parsed.isValid || parsed.result === undefined) throw new Error(parsed.error ?? 'Expression invalide');
  const steps = generateSteps(request.expression);
  const grid = buildPlaceValueSolution(request.expression);
  if (steps.length === 0) throw new Error('Aucune étape générée pour cette expression');
  const finalStep = steps.at(-1)!;
  const resultMatchesParser = Math.abs(finalStep.result - parsed.result) < 0.001;
  const hasPersistentOperation = steps.every((step) => step.visualData.layout.rows.length >= 2);
  return {
    request,
    steps,
    result: parsed.result,
    displayResult: grid.operation === 'division' ? grid.result : String(parsed.result).replace('.', ','),
    checks: [
      { name: 'Résultat vérifié', passed: resultMatchesParser, detail: `${finalStep.result} = ${parsed.result}` },
      { name: 'Opération persistante', passed: hasPersistentOperation, detail: 'Chaque étape conserve la structure de l’opération.' },
      { name: 'Méthode sélectionnée', passed: Boolean(request.method), detail: request.method },
    ],
    pedagogicalNotes: buildPedagogicalNotes(request, steps, grid),
    grid,
  };
}

function buildPedagogicalNotes(request: LabRequest, steps: MathStep[], grid: PlaceValueSolution): string[] {
  const operation = { addition: 'addition', subtraction: 'soustraction', multiplication: 'multiplication', division: 'division posée' }[grid.operation];
  const notes = [`Niveau ${request.grade} · objectif : ${request.objective}`, `Opération : ${operation}. Méthode : ${request.method}.`, `${steps.length} étapes déterministes avant toute formulation IA.`, 'Explication : chaque transformation est formulée en français et reliée à une valeur de position.', 'Animation visuelle : les colonnes sources et destinations sont surlignées sans déplacer les chiffres.'];
  if (request.depth === 'remediation') notes.push('Remédiation : vérifier les prérequis et le vocabulaire des unités, dizaines et centaines après chaque étape.');
  if (request.depth === 'guided') notes.push('Guidée : observer la colonne active et expliquer le geste avant de consulter la réponse finale.');
  return notes;
}
