import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  validateVisualQuizExercise, visualQuizPrompt,
  type VisualQuizExercise, type GraduatedNumberLineQuiz,
} from '@/features/practice/visualQuiz';

/** Configure reusable bank JSON; no learner path receives a generated sample. */
export function VisualQuizEditor({ exercise, onChange }: { exercise: VisualQuizExercise; onChange: (exercise: VisualQuizExercise) => void }) {
  const errors = validateVisualQuizExercise(exercise);
  const numberInput = (id: string, label: string, value: number, update: (value: number) => void, min: number, max: number) => <div key={id}><Label htmlFor={id}>{label}</Label><Input id={id} type="number" value={Number.isFinite(value) ? value : ''} min={min} max={max} step="1" onChange={event => update(event.target.valueAsNumber)} /></div>;
  const setNumberLine = (configuration: GraduatedNumberLineQuiz['configuration']) => {
    if (exercise.kind !== 'graduated-number-line') return;
    const next = { ...exercise, configuration };
    onChange({ ...next, prompt: visualQuizPrompt(next) });
  };
  return <fieldset className="space-y-4 rounded-xl border p-4">
    <legend className="px-2 font-semibold">Paramètres de la question visuelle</legend>
    {exercise.kind === 'analogue-clock' ? <>
      <div><Label htmlFor="visual-clock-mode">Compétence</Label><select id="visual-clock-mode" className="min-h-11 w-full rounded-md border bg-background px-3" value={exercise.mode} onChange={event => { const next = { ...exercise, mode: event.target.value as typeof exercise.mode }; onChange({ ...next, prompt: visualQuizPrompt(next) }); }}><option value="read">Lire une heure entière</option><option value="one-hour-later">Trouver l’heure une heure plus tard</option></select></div>
      {numberInput('visual-clock-hour', 'Heure affichée sur le cadran', exercise.startHour, startHour => onChange({ ...exercise, startHour }), 1, 12)}
      <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }, (_, index) => numberInput(`visual-clock-choice-${index}`, `Réponse proposée ${index + 1}`, exercise.answerChoices[index] ?? NaN, hour => { const choices = Array.from({ length: 4 }, (_, i) => i === index ? hour : exercise.answerChoices[i] ?? NaN); onChange({ ...exercise, answerChoices: choices }); }, 1, 12))}</div>
      <p className="text-sm text-muted-foreground">Les quatre réponses doivent être différentes et inclure la bonne heure. La grande aiguille reste sur douze pour ce premier format.</p>
    </> : (() => {
      const config = exercise.configuration;
      const item = config.items[0];
      if (!item) return <p role="alert">Ajoutez un point à la configuration avant de modifier cette activité.</p>;
      return <>
        <div><Label htmlFor="visual-number-line-mode">Compétence</Label><select id="visual-number-line-mode" className="min-h-11 w-full rounded-md border bg-background px-3" value={config.mode} onChange={event => { const mode = event.target.value as 'read_point_value' | 'place_value'; setNumberLine({ ...config, mode, instruction: mode === 'read_point_value' ? 'Observe les graduations et lis le point A.' : 'Place la valeur demandée sur la bonne graduation.', items: [{ ...item, label: 'A' }] }); }}><option value="read_point_value">Lire la valeur du point A</option><option value="place_value">Placer une valeur</option></select></div>
        <div className="grid grid-cols-2 gap-3">
          {numberInput('visual-line-start', 'Début de la droite', config.line.start, start => setNumberLine({ ...config, line: { ...config.line, start } }), -1000, 999)}
          {numberInput('visual-line-end', 'Fin de la droite', config.line.end, end => setNumberLine({ ...config, line: { ...config.line, end } }), -999, 1000)}
        </div>
        {numberInput('visual-line-subdivisions', 'Nombre d’intervalles égaux', config.line.subdivisions, subdivisions => setNumberLine({ ...config, line: { ...config.line, subdivisions } }), 1, 20)}
        <div><Label htmlFor="visual-line-target">Valeur du point A (nombre, décimal ou fraction)</Label><Input id="visual-line-target" value={String(item.value)} placeholder="Ex. 1/2 ou 0,5" onChange={event => setNumberLine({ ...config, items: [{ ...item, value: event.target.value }] })} /></div>
        <p className="text-sm text-muted-foreground">Un seul point, placé sur une graduation exacte. En lecture, le point porte un nom neutre ; sa valeur n’est jamais utilisée comme étiquette.</p>
      </>;
    })()}
    {errors.length > 0 && <ul role="alert" className="list-disc space-y-1 rounded-lg bg-amber-50 p-4 pl-8 text-sm text-amber-950">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
  </fieldset>;
}
