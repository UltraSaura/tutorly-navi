import type { GuidedFamilyExercise } from '@/features/practice/guidedFamilies';
import { COUNTABLE_OBJECTS } from '@/types/counting-exercise';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const colours = ['red', 'blue', 'yellow', 'green'] as const;
const fills = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e' };

/** Admin controls author the same payload consumed by quiz and lesson renderers. */
export function GuidedFamilyEditor({ exercise, onChange }: { exercise: GuidedFamilyExercise; onChange: (exercise: GuidedFamilyExercise) => void }) {
  const numberField = (name: string, value: number, update: (value: number) => void, min = 0, max = 100) => <div><Label htmlFor={`guided-${name}`}>{name}</Label><Input id={`guided-${name}`} type="number" min={min} max={max} value={value} onChange={event => update(Number(event.target.value))} /></div>;
  return <fieldset className="space-y-3 rounded-xl border p-4">
    <legend className="px-2 font-semibold">Paramètres de l’activité</legend>
    {'object' in exercise && <div><Label htmlFor="guided-object">Objets</Label><select id="guided-object" className="min-h-11 w-full rounded-md border bg-background px-3" value={exercise.object} onChange={event => onChange({ ...exercise, object: event.target.value as typeof exercise.object })}>{COUNTABLE_OBJECTS.map(object => <option key={object} value={object}>{object}</option>)}</select></div>}
    {exercise.kind === 'guided-word-problem' && <>
      <div><Label htmlFor="guided-operation">Opération</Label><select id="guided-operation" className="min-h-11 w-full rounded-md border bg-background px-3" value={exercise.operation} onChange={event => onChange({ ...exercise, operation: event.target.value as 'addition' | 'subtraction' })}><option value="addition">Addition — des objets arrivent</option><option value="subtraction">Soustraction — des objets partent</option></select></div>
      <div className="grid grid-cols-2 gap-3">{numberField('Quantité au départ', exercise.initial, initial => onChange({ ...exercise, initial }))}{numberField('Quantité ajoutée ou retirée', exercise.change, change => onChange({ ...exercise, change }))}</div>
    </>}
    {exercise.kind === 'equal-groups' && <div className="grid grid-cols-2 gap-3">{numberField('Nombre de groupes', exercise.groups, groups => onChange({ ...exercise, groups }), 1, 10)}{numberField('Objets par groupe', exercise.perGroup, perGroup => onChange({ ...exercise, perGroup }), 1, 10)}</div>}
    {exercise.kind === 'colour-grid' && <>
      <div className="grid grid-cols-2 gap-3">{numberField('Lignes', exercise.rows, rows => { const safe = Math.max(1, Math.min(8, Math.trunc(rows))); onChange({ ...exercise, rows: safe, cells: Array.from({ length: safe * exercise.columns }, (_, i) => exercise.cells[i] ?? colours[i % colours.length]) }); }, 1, 8)}{numberField('Colonnes', exercise.columns, columns => { const safe = Math.max(1, Math.min(8, Math.trunc(columns))); onChange({ ...exercise, columns: safe, cells: Array.from({ length: exercise.rows * safe }, (_, i) => exercise.cells[i] ?? colours[i % colours.length]) }); }, 1, 8)}</div>
      <div><Label htmlFor="guided-target-colour">Couleur à compter</Label><select id="guided-target-colour" className="min-h-11 w-full rounded-md border bg-background px-3" value={exercise.targetColor} onChange={event => onChange({ ...exercise, targetColor: event.target.value as typeof exercise.targetColor })}>{colours.map(colour => <option key={colour} value={colour}>{colour}</option>)}</select></div>
      <p className="text-sm text-muted-foreground">Cliquez sur une case pour changer sa couleur. L’élève comptera uniquement la couleur demandée.</p>
      <div className="grid gap-1 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${exercise.columns}, minmax(44px, 1fr))` }}>{exercise.cells.map((colour, index) => <button key={index} type="button" aria-label={`Case ${index + 1} : ${colour}. Changer la couleur`} className="min-h-11 rounded-md border-2 border-slate-600 text-xs font-bold text-slate-950" style={{ backgroundColor: fills[colour] }} onClick={() => onChange({ ...exercise, cells: exercise.cells.map((value, i) => i === index ? colours[(colours.indexOf(value) + 1) % colours.length] : value) })}>{colour.slice(0, 1).toUpperCase()}</button>)}</div>
    </>}
    <p className="text-sm text-muted-foreground">Le modèle visuel accepte jusqu’à 100 objets ; la grille jusqu’à 8 × 8 cases. Les nombres sont configurables, pas des types d’exercice distincts.</p>
  </fieldset>;
}
