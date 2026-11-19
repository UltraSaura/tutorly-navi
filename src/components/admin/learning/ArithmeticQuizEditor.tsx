import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  arithmeticProblemAnswer, arithmeticQuizPrompt, createArithmeticQuizDraft, makeArithmeticQuizChoices, validateArithmeticQuizExercise,
  type ArithmeticQuizExercise, type ArithmeticQuizProblem,
} from '@/features/practice/arithmeticQuiz';
import { MENTAL_OPERATIONS, type MentalOperation } from '@/features/practice/mentalCalculationRace';

const labels: Record<MentalOperation, string> = { addition: 'Addition', subtraction: 'Soustraction', multiplication: 'Multiplication', division: 'Division' };
const selectClass = 'min-h-11 w-full rounded-md border bg-background px-3';
const numericInput = (value: string) => value.trim() === '' ? NaN : Number(value);

/** All generated drafts are materialized at authoring time and persisted as explicit cards. */
export function ArithmeticQuizEditor({ exercise, onChange, allowedOperations = [...MENTAL_OPERATIONS], maxDigits = 7, allowNegative = true }: { exercise: ArithmeticQuizExercise; onChange: (exercise: ArithmeticQuizExercise) => void; allowedOperations?: MentalOperation[]; maxDigits?: number; allowNegative?: boolean }) {
  const [draftCount, setDraftCount] = useState(exercise.problems.length);
  const [draftError, setDraftError] = useState<string | null>(null);
  const errors = validateArithmeticQuizExercise(exercise);
  const availableOperations = MENTAL_OPERATIONS.filter(operation => allowedOperations.includes(operation));
  const digitLimit = Number.isInteger(maxDigits) ? Math.max(1, Math.min(7, maxDigits)) : 7;
  const updateProblem = (index: number, update: Partial<ArithmeticQuizProblem>, recomputeChoices = false) => {
    const problem = { ...exercise.problems[index], ...update };
    const answer = arithmeticProblemAnswer(problem);
    if (recomputeChoices && Number.isSafeInteger(answer)) problem.choices = makeArithmeticQuizChoices(answer);
    const operations = exercise.operations.includes(problem.operation) ? exercise.operations : [...exercise.operations, problem.operation];
    onChange({ ...exercise, operations, problems: exercise.problems.map((value, i) => i === index ? problem : value) });
  };
  return <fieldset className="space-y-4 rounded-xl border p-4">
    <legend className="px-2 font-bold">Série de calculs enregistrée</legend>
    <p className="text-sm text-muted-foreground">Les cartes et leurs quatre choix sont enregistrés avec la question. Aucun nouveau calcul n’est généré pendant la session de l’élève. Le temps affiché est le temps écoulé, sans limite automatique.</p>
    <div><Label>Opérations autorisées dans cette série</Label><div className="grid grid-cols-2 gap-2">{availableOperations.map(operation => <label key={operation} className="flex min-h-11 items-center gap-2 rounded-lg border px-3"><input type="checkbox" checked={exercise.operations.includes(operation)} onChange={event => onChange({ ...exercise, operations: event.target.checked ? [...exercise.operations, operation] : exercise.operations.filter(value => value !== operation) })} />{labels[operation]}</label>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="arithmetic-left-digits">Chiffres maximum — premier nombre</Label><Input id="arithmetic-left-digits" type="number" min={1} max={digitLimit} value={Number.isFinite(exercise.leftDigits) ? exercise.leftDigits : ''} onChange={event => onChange({ ...exercise, leftDigits: numericInput(event.target.value) })} /></div><div><Label htmlFor="arithmetic-right-digits">Chiffres maximum — second nombre</Label><Input id="arithmetic-right-digits" type="number" min={1} max={digitLimit} value={Number.isFinite(exercise.rightDigits) ? exercise.rightDigits : ''} onChange={event => onChange({ ...exercise, rightDigits: numericInput(event.target.value) })} /></div></div>
    <div className="space-y-3 rounded-xl bg-muted/40 p-3"><div><Label htmlFor="arithmetic-draft-count">Nombre de cartes du brouillon</Label><Input id="arithmetic-draft-count" type="number" min={1} max={20} value={Number.isFinite(draftCount) ? draftCount : ''} onChange={event => setDraftCount(numericInput(event.target.value))} /></div><Button type="button" variant="outline" onClick={() => {
      try {
        const draft = createArithmeticQuizDraft(exercise.kind, exercise.operations.filter(operation => availableOperations.includes(operation)), exercise.leftDigits, exercise.rightDigits, draftCount, Math.random, allowNegative);
        onChange({ ...exercise, operations: draft.operations, problems: draft.problems, prompt: arithmeticQuizPrompt(exercise) }); setDraftError(null);
      } catch (error) { setDraftError(error instanceof RangeError ? 'Pour une division entière, choisissez au moins autant de chiffres pour le premier nombre que pour le second.' : error instanceof Error ? error.message : 'Le brouillon n’a pas pu être créé.'); }
    }}>Générer et enregistrer un brouillon de cartes</Button><p className="text-xs text-muted-foreground">Ce bouton remplace les cartes ci-dessous dans le brouillon local. Vérifiez-les avant de sauvegarder la question.</p>{draftError && <p role="alert" className="text-sm text-red-700">{draftError}</p>}</div>
    <div className="space-y-4">{exercise.problems.map((problem, index) => <article key={problem.id} className="space-y-3 rounded-xl border bg-white p-3"><div className="flex items-center justify-between gap-2"><h4 className="font-bold">Calcul {index + 1}</h4><Button type="button" size="sm" variant="ghost" disabled={exercise.problems.length <= 1} onClick={() => onChange({ ...exercise, problems: exercise.problems.filter((_, i) => i !== index) })}>Supprimer</Button></div><div><Label htmlFor={`arithmetic-operation-${index}`}>Opération</Label><select id={`arithmetic-operation-${index}`} className={selectClass} value={problem.operation} onChange={event => updateProblem(index, { operation: event.target.value as MentalOperation }, true)}>{!availableOperations.includes(problem.operation) && <option value={problem.operation} disabled>{labels[problem.operation]} — hors du niveau sélectionné</option>}{availableOperations.map(operation => <option key={operation} value={operation}>{labels[operation]}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor={`arithmetic-left-${index}`}>Premier nombre</Label><Input id={`arithmetic-left-${index}`} type="number" min={0} max={9_999_999} value={Number.isFinite(problem.left) ? problem.left : ''} onChange={event => updateProblem(index, { left: numericInput(event.target.value) }, true)} /></div><div><Label htmlFor={`arithmetic-right-${index}`}>Second nombre</Label><Input id={`arithmetic-right-${index}`} type="number" min={0} max={9_999_999} value={Number.isFinite(problem.right) ? problem.right : ''} onChange={event => updateProblem(index, { right: numericInput(event.target.value) }, true)} /></div></div><p className="text-xs text-muted-foreground">Modifier un nombre ou l’opération recalcule les choix. Vous pouvez ensuite personnaliser ces distracteurs.</p><div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }, (_, choiceIndex) => <div key={choiceIndex}><Label htmlFor={`arithmetic-choice-${index}-${choiceIndex}`}>Choix {choiceIndex + 1}</Label><Input id={`arithmetic-choice-${index}-${choiceIndex}`} type="number" value={Number.isFinite(problem.choices[choiceIndex]) ? problem.choices[choiceIndex] : ''} onChange={event => updateProblem(index, { choices: Array.from({ length: 4 }, (_, i) => i === choiceIndex ? numericInput(event.target.value) : problem.choices[i]) })} /></div>)}</div><p className="text-sm font-semibold">Résultat vérifié : {Number.isSafeInteger(arithmeticProblemAnswer(problem)) ? arithmeticProblemAnswer(problem) : 'calcul invalide'}</p><div><Label htmlFor={`arithmetic-lesson-${index}`}>Lien de la leçon associée — facultatif</Label><Input id={`arithmetic-lesson-${index}`} placeholder="/learning/mathematiques/une-lecon" value={problem.lessonHref ?? ''} onChange={event => updateProblem(index, { lessonHref: event.target.value.trim() || undefined })} /></div></article>)}</div>
    <Button type="button" variant="outline" disabled={exercise.problems.length >= 20 || availableOperations.length === 0} onClick={() => {
      const operation = exercise.operations.find(value => availableOperations.includes(value)) ?? availableOperations[0] ?? 'addition';
      const left = operation === 'division' ? 6 : 3, right = 2;
      const next: ArithmeticQuizProblem = { id: `${exercise.id}-card-${Date.now().toString(36)}`, operation, left, right, choices: [] };
      next.choices = makeArithmeticQuizChoices(arithmeticProblemAnswer(next));
      onChange({ ...exercise, operations: exercise.operations.length ? exercise.operations : [operation], problems: [...exercise.problems, next] });
    }}>Ajouter une carte</Button>
    {errors.length > 0 && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">À corriger avant sauvegarde :</p><ul className="list-disc space-y-1 pl-5">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
  </fieldset>;
}
