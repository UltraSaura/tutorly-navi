import { useEffect, useMemo, useRef, useState } from 'react';
import { Apple, BookOpen, Pencil, Star, Plus, Minus, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { equalGroupsFeedback } from '@/features/practice/equalGroupsFeedback';
import { PracticeFeedback } from './PracticeFeedback';
import {
  guidedFamilyAnswer, guidedFamilyPrompt, isGuidedFamilyAnswerCorrect, isGuidedFamilyExercise, makeGuidedFamilyChoices,
  type GuidedFamilyExercise, type GuidedFamilyResult, type GuidedFamilyState, type GridColour,
} from '@/features/practice/guidedFamilies';
import type { CountableObject } from '@/types/counting-exercise';

const objects = { apple: Apple, book: BookOpen, pencil: Pencil, star: Star };
const names: Record<CountableObject, [string, string]> = { apple: ['pommes', 'apples'], book: ['livres', 'books'], pencil: ['crayons', 'pencils'], star: ['étoiles', 'stars'] };
const colours: Record<GridColour, { fr: string; en: string; letter: string; fill: string; border: string }> = {
  red: { fr: 'rouge', en: 'red', letter: 'R', fill: '#FECACA', border: '#B91C1C' },
  blue: { fr: 'bleu', en: 'blue', letter: 'B', fill: '#BAE6FD', border: '#0369A1' },
  yellow: { fr: 'jaune', en: 'yellow', letter: 'J', fill: '#FEF08A', border: '#854D0E' },
  green: { fr: 'vert', en: 'green', letter: 'V', fill: '#BBF7D0', border: '#166534' },
};
const control = 'min-h-11 rounded-xl border-2 px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${control} border-[#5145B5] bg-[#5145B5] text-white`;
const neutral = `${control} border-slate-300 bg-white text-slate-800`;
const objectTones = ['#C2410C', '#0369A1', '#7E22CE', '#15803D'];

function Objects({ object, amount, fadedFrom, fr }: { object: CountableObject; amount: number; fadedFrom?: number; fr: boolean }) {
  const Icon = objects[object];
  const singular = ({ apple: ['pomme', 'apple'], book: ['livre', 'book'], pencil: ['crayon', 'pencil'], star: ['étoile', 'star'] } as const)[object][fr ? 0 : 1];
  return <div className="flex flex-wrap justify-center gap-3">{Array.from({ length: amount }, (_, index) => <span key={index} role="img" aria-label={fadedFrom !== undefined && index >= fadedFrom ? `${singular} ${fr ? 'retiré' : 'removed'}` : singular} className={cn('inline-flex h-7 w-7 items-center justify-center', fadedFrom !== undefined && index >= fadedFrom && 'opacity-20 grayscale line-through')}><Icon aria-hidden="true" className="h-6 w-6" fill={`${objectTones[index % 4]}22`} color={objectTones[index % 4]} strokeWidth={2.3} /></span>)}</div>;
}

export type GuidedFamilyActivityProps = {
  exercise: GuidedFamilyExercise;
  initialState?: GuidedFamilyState;
  language?: string;
  disabled?: boolean;
  onChange?: (state: GuidedFamilyState) => void;
  onComplete?: (result: GuidedFamilyResult) => void;
};

/** The key resets local state whenever the actual authored exercise changes. */
export function GuidedFamilyActivity(props: GuidedFamilyActivityProps) {
  if (!isGuidedFamilyExercise(props.exercise)) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">{props.language === 'en' ? 'This exercise is not configured correctly. Please choose another exercise.' : 'Cet exercice est mal configuré. Choisis un autre exercice.'}</p>;
  return <GuidedFamilySession key={JSON.stringify(props.exercise)} {...props} />;
}

function GuidedFamilySession({ exercise, initialState, language = 'fr', disabled = false, onChange, onComplete }: GuidedFamilyActivityProps) {
  const fr = language.startsWith('fr');
  const choices = useMemo(() => makeGuidedFamilyChoices(exercise), [exercise]);
  const word = exercise.kind === 'guided-word-problem' ? exercise : null;
  const equal = exercise.kind === 'equal-groups' ? exercise : null;
  const grid = exercise.kind === 'colour-grid' ? exercise : null;
  const [selectedOperation, setOperation] = useState<'addition' | 'subtraction' | undefined>(() => word && initialState?.selectedOperation === word.operation ? word.operation : undefined);
  const [actions, setActions] = useState(() => word && initialState?.selectedOperation === word.operation && Number.isInteger(initialState?.modelActions) ? Math.max(0, Math.min(word.change, initialState?.modelActions ?? 0)) : 0);
  const [builtGroups, setBuiltGroups] = useState(() => equal && Number.isInteger(initialState?.builtGroups) ? Math.max(0, Math.min(equal.groups, initialState?.builtGroups ?? 0)) : 0);
  const [selectedAnswer, setAnswer] = useState<number | null>(() => choices.includes(initialState?.selectedAnswer as number) ? initialState?.selectedAnswer ?? null : null);
  const [attempts, setAttempts] = useState(() => Number.isInteger(initialState?.attempts) ? Math.max(0, Math.min(1000, initialState?.attempts ?? 0)) : 0);
  const [supported, setSupported] = useState(initialState?.supported === true || (initialState?.attempts ?? 0) > 1);
  const [complete, setComplete] = useState(initialState?.complete === true && Number.isInteger(initialState.attempts) && initialState.attempts >= 1 && isGuidedFamilyAnswerCorrect(exercise, initialState));
  const [hint, setHint] = useState(false);
  const [error, setError] = useState<'operation' | 'answer' | null>(null);
  const [marked, setMarked] = useState<number[]>([]);
  const finished = useRef(complete);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const modelComplete = word ? actions === word.change && selectedOperation === word.operation : equal ? builtGroups === equal.groups : true;
  useEffect(() => {
    onChangeRef.current?.({ selectedAnswer, selectedOperation, builtGroups: exercise.kind === 'equal-groups' ? builtGroups : undefined, modelActions: exercise.kind === 'guided-word-problem' ? actions : undefined, modelComplete, attempts, supported, complete });
  }, [selectedAnswer, selectedOperation, builtGroups, actions, modelComplete, attempts, supported, complete, exercise.kind]);
  const stage = word && !selectedOperation ? 'operation' : !modelComplete ? 'model' : 'answer';
  const inactive = disabled || complete;
  const objectName = word ? names[word.object][fr ? 0 : 1] : equal ? names[equal.object][fr ? 0 : 1] : '';

  const chooseOperation = (operation: 'addition' | 'subtraction') => {
    if (inactive || !word) return;
    if (operation !== word.operation) { setSupported(true); setError('operation'); setAttempts(value => value + 1); return; }
    setOperation(operation); setError(null); setHint(false);
  };
  const check = () => {
    if (inactive || stage !== 'answer' || selectedAnswer === null || finished.current) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const state: GuidedFamilyState = { selectedAnswer, selectedOperation, builtGroups: equal ? builtGroups : undefined, modelActions: word ? actions : undefined, modelComplete, attempts: nextAttempts, supported, complete: true };
    if (!isGuidedFamilyAnswerCorrect(exercise, state)) { setSupported(true); setError('answer'); return; }
    finished.current = true;
    setComplete(true); setError(null); setHint(false);
    onComplete?.({ ...state, selectedAnswer, correct: true });
  };
  // Method hints are generated from the activity, never arbitrary authored answer text.
  const hintText = word
    ? stage === 'operation'
      ? (fr ? 'Demande-toi ce qui se passe dans l’histoire : la collection grandit-elle, ou enlève-t-on des objets ? Additionner réunit ; soustraire enlève.' : 'Ask what happens in the story: does the collection grow, or are objects taken away? Addition joins; subtraction takes away.')
      : (fr ? 'Garde ton choix d’opération. Suis le changement dans l’image, un objet à la fois, puis compte chaque objet encore présent une seule fois.' : 'Keep your operation choice. Follow the change in the picture one object at a time, then count each object still present once.')
    : equal
      ? (fr ? 'Chaque groupe doit contenir la même quantité. Tu peux compter les objets de chaque groupe, puis additionner ces quantités. La multiplication écrit cette addition plus rapidement.' : 'Every group must contain the same amount. Count each group, then add those amounts. Multiplication is a shorter way to write that repeated addition.')
      : (fr ? 'Repère la couleur et la lettre demandées. Parcours la grille ligne par ligne et compte uniquement les cases qui correspondent. Tu peux les marquer pour ne pas les compter deux fois.' : 'Look for the requested colour and letter. Scan one row at a time and count only matching tiles. You can mark tiles to avoid counting the same one twice.');

  const colourLetter = (colour: GridColour) => !fr && colour === 'yellow' ? 'Y' : !fr && colour === 'green' ? 'G' : colours[colour].letter;

  return <section className="space-y-4" data-testid={`guided-family-${exercise.kind}`} aria-label={fr ? 'Activité guidée' : 'Guided activity'}>
    {word && <p className="rounded-xl bg-blue-50 p-4 text-base font-medium leading-relaxed text-slate-900">{guidedFamilyPrompt(word, language)}</p>}
    <h3 className="text-lg font-bold text-slate-900">{complete ? (fr ? 'Exercice terminé' : 'Exercise complete')
      : stage === 'operation' ? (fr ? 'Quelle opération correspond à cette histoire ?' : 'Which operation matches this story?')
      : word && stage === 'model' ? (fr ? `Représente le changement : ${word.operation === 'addition' ? 'ajoute' : 'enlève'} ${word.change} ${objectName}.` : `Show the change: ${word.operation === 'addition' ? 'add' : 'take away'} ${word.change} ${objectName}.`)
      : equal && stage === 'model' ? (fr ? `Construis ${equal.groups} groupes de ${equal.perGroup} ${objectName}.` : `Build ${equal.groups} groups of ${equal.perGroup} ${objectName}.`)
      : grid ? (fr ? `Combien de cases portent la couleur ${colours[grid.targetColor].fr} (${colourLetter(grid.targetColor)}) ?` : `How many tiles have the colour ${colours[grid.targetColor].en} (${colourLetter(grid.targetColor)})?`)
      : (fr ? 'Choisis la quantité totale.' : 'Choose the total quantity.')}</h3>

    {stage === 'operation' && !complete && <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" className={neutral} disabled={disabled || error !== null} onClick={() => chooseOperation('addition')}>+ {fr ? 'Additionner' : 'Add'}</button>
      <button type="button" className={neutral} disabled={disabled || error !== null} onClick={() => chooseOperation('subtraction')}>− {fr ? 'Soustraire' : 'Subtract'}</button>
      <button type="button" className={`${neutral} sm:col-span-2`} disabled={disabled} onClick={() => { setSupported(true); setHint(true); }}>{fr ? 'Je ne suis pas sûr' : 'I’m not sure'}</button>
    </div>}

    {word && stage !== 'operation' && <div className="space-y-3 rounded-2xl border bg-[#F7F8FC] p-4" aria-label={fr ? 'Modèle de la collection' : 'Collection model'}>
      <Objects fr={fr} object={word.object} amount={word.operation === 'addition' ? word.initial + actions : word.initial} fadedFrom={word.operation === 'subtraction' ? word.initial - actions : undefined} />
      {stage === 'model' && <button type="button" className={`${primary} flex w-full items-center justify-center gap-2`} disabled={inactive} onClick={() => setActions(value => Math.min(word.change, value + 1))}>{word.operation === 'addition' ? <Plus aria-hidden="true" className="h-5 w-5" /> : <Minus aria-hidden="true" className="h-5 w-5" />}{word.operation === 'addition' ? (fr ? 'Ajouter un objet' : 'Add one object') : (fr ? 'Enlever un objet' : 'Take away one object')}</button>}
      {stage === 'answer' && <p className="text-center font-mono text-lg font-bold">{word.initial} {word.operation === 'addition' ? '+' : '−'} {word.change} = {complete ? guidedFamilyAnswer(exercise) : '?'}</p>}
    </div>}

    {equal && <div className="space-y-3 rounded-2xl border bg-[#F7F8FC] p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: builtGroups }, (_, index) => <div key={index} className="rounded-xl border-2 border-violet-300 bg-white p-3" aria-label={fr ? 'Groupe de même taille' : 'Equal-sized group'}><Objects fr={fr} object={equal.object} amount={equal.perGroup} /></div>)}</div>
      {builtGroups === 0 && <p className="py-6 text-center text-slate-600">{fr ? 'Ajoute un groupe pour commencer.' : 'Add a group to begin.'}</p>}
      {stage === 'model' && <button type="button" className={`${primary} flex w-full items-center justify-center gap-2`} disabled={inactive} onClick={() => setBuiltGroups(value => Math.min(equal.groups, value + 1))}><Plus aria-hidden="true" className="h-5 w-5" />{fr ? 'Ajouter un groupe' : 'Add one group'}</button>}
      {stage === 'answer' && <div className="space-y-2 text-center font-mono text-lg font-bold"><p>{Array.from({ length: equal.groups }, () => equal.perGroup).join(' + ')} = {complete ? guidedFamilyAnswer(exercise) : '?'}</p><p>{equal.groups} × {equal.perGroup} = {complete ? guidedFamilyAnswer(exercise) : '?'}</p></div>}
    </div>}

    {grid && <div className="space-y-3 overflow-x-auto rounded-2xl border bg-[#F7F8FC] p-3">
      <div className="mx-auto grid w-full max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${grid.columns}, minmax(44px,1fr))`, minWidth: `${grid.columns * 48 - 4}px` }}>{grid.cells.map((colour, index) => <button type="button" key={index} disabled={inactive} onClick={() => setMarked(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index])} aria-pressed={marked.includes(index)} aria-label={`${fr ? 'Case' : 'Tile'} ${Math.floor(index / grid.columns) + 1}, ${index % grid.columns + 1}: ${fr ? colours[colour].fr : colours[colour].en}`} className={cn('aspect-square min-h-11 rounded-lg border-2 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400', marked.includes(index) && 'ring-2 ring-violet-700 ring-offset-1')} style={{ backgroundColor: colours[colour].fill, borderColor: colours[colour].border, color: colours[colour].border }}><span aria-hidden="true">{colourLetter(colour)}{marked.includes(index) ? ' ✓' : ''}</span></button>)}</div>
      <p className="text-sm text-slate-600">{fr ? 'Tu peux marquer les cases pendant que tu comptes. Les lettres permettent aussi de distinguer les couleurs.' : 'You can mark tiles while counting. Letters also help distinguish the colours.'}</p>
    </div>}

    {stage === 'answer' && !complete && <div className="space-y-3"><div className="grid grid-cols-2 gap-2" role="group" aria-label={fr ? 'Réponses proposées' : 'Answer choices'}>{choices.map(choice => <button type="button" key={choice} disabled={inactive || error !== null} aria-pressed={selectedAnswer === choice} onClick={() => setAnswer(choice)} className={cn(neutral, selectedAnswer === choice && 'border-[#5145B5] bg-violet-50 text-violet-900')}>{choice}</button>)}</div><button type="button" className={`${primary} w-full`} disabled={inactive || selectedAnswer === null || error !== null} onClick={check}>{fr ? 'Vérifier' : 'Check answer'}</button></div>}

    {error && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="status"><PracticeFeedback status="incorrect" language={language} /><p className="text-sm leading-relaxed text-amber-950">{error === 'operation'
      ? word?.operation === 'addition' ? (fr ? 'La collection grandit dans cette histoire. Cherche l’opération qui réunit les objets.' : 'The collection grows in this story. Look for the operation that joins objects.') : (fr ? 'Des objets quittent la collection. Cherche l’opération qui enlève des objets.' : 'Objects leave the collection. Look for the operation that takes objects away.')
      : word ? (fr ? 'Ton choix d’opération et ton modèle sont conservés. Compte maintenant les objets encore présents, une seule fois chacun.' : 'Your operation and model are kept. Count each object still present once.') : equal ? equalGroupsFeedback(equal, selectedAnswer!, language) : (fr ? 'Compte uniquement les cases de la couleur et de la lettre demandées. Parcours une ligne après l’autre.' : 'Count only the requested colour and letter. Work through one row at a time.')}</p><button type="button" className={`${neutral} mt-3`} onClick={() => { setError(null); setAnswer(null); }} disabled={disabled}>{fr ? 'Réessayer' : 'Try again'}</button></div>}

    {!complete && <div><button type="button" className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300" disabled={disabled} aria-expanded={hint} onClick={() => { setHint(value => !value); setSupported(true); }}><Lightbulb aria-hidden="true" className="h-4 w-4" />{hint ? (fr ? 'Masquer l’indice' : 'Hide hint') : (fr ? 'Afficher un indice' : 'Show hint')}</button>{hint && <p className="mt-2 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">{hintText}</p>}</div>}
    {complete && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4" data-testid="guided-family-complete"><PracticeFeedback status="correct" language={language} /><p className="font-semibold text-emerald-950">{grid ? (fr ? 'Bien joué : tu as compté les cases de la couleur demandée.' : 'Good work: you counted the requested colour.') : (fr ? 'Bien joué : tu as construit le modèle et trouvé la bonne quantité.' : 'Good work: you built the model and found the correct quantity.')}</p><p className="mt-2 font-mono text-lg font-bold text-emerald-950">{word ? `${word.initial} ${word.operation === 'addition' ? '+' : '−'} ${word.change}` : equal ? `${equal.groups} × ${equal.perGroup}` : (fr ? `Cases ${colours[grid!.targetColor].fr}` : `${colours[grid!.targetColor].en} tiles`)} = {guidedFamilyAnswer(exercise)}</p></div>}
  </section>;
}
