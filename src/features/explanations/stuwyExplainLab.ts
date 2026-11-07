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
    checks: [
      { name: 'Résultat vérifié', passed: resultMatchesParser, detail: `${finalStep.result} = ${parsed.result}` },
      { name: 'Opération persistante', passed: hasPersistentOperation, detail: 'Chaque étape conserve la structure de l’opération.' },
      { name: 'Méthode sélectionnée', passed: Boolean(request.method), detail: request.method },
    ],
    pedagogicalNotes: buildPedagogicalNotes(request, steps),
    grid,
  };
}

function buildPedagogicalNotes(request: LabRequest, steps: MathStep[]): string[] {
  const notes = [`Niveau ${request.grade} · objectif : ${request.objective}`, `${steps.length} étapes déterministes avant toute formulation IA.`];
  if (request.depth === 'remediation') notes.push('Prévoir une vérification de prérequis après chaque étape.');
  if (request.depth === 'guided') notes.push('Nommer la valeur de position de chaque colonne et verbaliser le geste.');
  return notes;
}
