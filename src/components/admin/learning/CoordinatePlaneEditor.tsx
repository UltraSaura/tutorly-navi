import { CoordinatePlaneActivity } from '@/components/practice/CoordinatePlaneActivity';
import { createCoordinateExercise, type CoordinatePlaneExercise } from '@/features/practice/coordinatePlane';
import { COORDINATE_CURRICULUM } from '@/features/practice/exerciseCurriculum';

export function CoordinatePlaneEditor({ exercise, onChange }: { exercise: CoordinatePlaneExercise; onChange: (next: CoordinatePlaneExercise) => void }) {
  if (!exercise.target || !Number.isFinite(exercise.target.x) || !Number.isFinite(exercise.target.y) || !Number.isFinite(exercise.maxX) || !Number.isFinite(exercise.maxY)) return <div role="alert" className="space-y-3 rounded-xl bg-amber-50 p-4"><p>La configuration importée est invalide. Elle doit être corrigée avant l’enregistrement.</p><button type="button" className="min-h-11 rounded-xl border px-4" onClick={() => onChange(createCoordinateExercise())}>Réinitialiser cette configuration</button></div>;
  const input = 'h-11 w-full rounded-lg border bg-white px-3';
  return <div className="space-y-4" data-testid="coordinate-editor">
    <p className="rounded-xl bg-violet-50 p-3 text-sm">{COORDINATE_CURRICULUM.category}<br /><strong>{COORDINATE_CURRICULUM.label}</strong> · Coordonnées entières positives ou nulles. Le niveau suit le thème de la banque ; il ne dépend pas des nombres choisis.</p>
    <label className="block text-sm font-semibold">Consigne<select className={`${input} mt-1`} value={exercise.mode} onChange={event => onChange({ ...exercise, mode: event.target.value as 'read' | 'plot' })}><option value="read">Lire les coordonnées</option><option value="plot">Placer un point</option></select></label>
    <div className="grid grid-cols-2 gap-3">{(['x', 'y'] as const).map(axis => <label key={axis} className="text-sm font-semibold">Limite de l’axe {axis}<input className={`${input} mt-1`} type="number" min="1" max="8" value={axis === 'x' ? exercise.maxX : exercise.maxY} onChange={event => onChange({ ...exercise, [axis === 'x' ? 'maxX' : 'maxY']: Number(event.target.value) })} /></label>)}</div>
    <div className="grid grid-cols-2 gap-3">{(['x', 'y'] as const).map(axis => <label key={axis} className="text-sm font-semibold">Coordonnée cible {axis}<input className={`${input} mt-1`} type="number" min="0" max={axis === 'x' ? exercise.maxX : exercise.maxY} value={exercise.target[axis]} onChange={event => onChange({ ...exercise, target: { ...exercise.target, [axis]: Number(event.target.value) } })} /></label>)}</div>
    <details className="rounded-xl border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Aperçu de l’exercice</summary><CoordinatePlaneActivity exercise={{ ...exercise, prompt: exercise.mode === 'read' ? 'Lis les coordonnées du point A.' : `Place le point A (${exercise.target.x} ; ${exercise.target.y}).` }} /></details>
  </div>;
}
