/** Public, simulated five-step CM2 lesson preview. Real LessonV2Player is tested separately. */
import { useState } from 'react';
import { cm2FractionLesson } from './cm2FractionLesson';
import { InteractiveActivityHost } from './InteractiveActivityHost';
import type { ActivityProgress } from './activityContract';

export function Cm2LessonPreview({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState<Record<string, ActivityProgress>>({});
  const block = cm2FractionLesson.sequence[step];
  const isActivity = block.type === 'interactive_activity';
  const canContinue = !isActivity || progress[block.id]?.completed === true;
  const complete = step === cm2FractionLesson.sequence.length - 1;
  const reset = () => { setStep(0); setProgress({}); };
  return <section className="space-y-4" data-testid="cm2-lesson-preview">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-bold text-teal-800">Parcours CM2 · Fractions</p>
        <p className="text-sm text-slate-600">Étape {step + 1} sur {cm2FractionLesson.sequence.length}</p>
      </div>
      <button type="button" onClick={onExit} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold">Voir les activités séparées</button>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-label={'Progression ' + (step + 1) + ' sur ' + cm2FractionLesson.sequence.length}>
      <div className="h-full bg-teal-600" style={{ width: ((step + 1) / cm2FractionLesson.sequence.length) * 100 + '%' }} />
    </div>
    <div className="space-y-4 rounded-2xl border border-teal-200 bg-white p-4 sm:p-6">
      {block.type === 'concept' && <>
        <h2 className="text-xl font-bold text-slate-900">{block.title}</h2>
        <p className="text-base leading-7 text-slate-800">{block.content}</p>
        {block.representation && <p className="rounded-xl bg-slate-50 p-3 font-semibold">{block.representation}</p>}
        {block.key_points?.map((point, i) => <p key={i} className="rounded-xl bg-teal-50 p-3 text-slate-900"><b>{point.label}</b> — {point.text}</p>)}
        {block.takeaway && <p className="font-semibold text-teal-900">{block.takeaway}</p>}
      </>}
      {block.type === 'guided_example' && <>
        <h2 className="text-xl font-bold">Comment transformer une moitié en quarts ?</h2>
        <p className="leading-7">{block.context}</p>
        {block.steps.map((item, i) => <div key={i} className="rounded-xl bg-slate-50 p-3">
          <p className="font-bold">{i + 1}. {item.instruction}</p>
          <p className="mt-1 font-semibold text-teal-900">{item.representation}</p>
          <p className="mt-1 text-sm text-slate-700">{item.reason}</p>
        </div>)}
      </>}
      {block.type === 'interactive_activity' && <InteractiveActivityHost
        spec={block.activity}
        progress={progress[block.id]}
        onProgressChange={(next) => setProgress(current => ({ ...current, [block.id]: next }))}
        onComplete={() => {}}
      />}
    </div>
    {complete ? <div className="space-y-2 rounded-xl bg-teal-50 p-4">
      <p className="font-bold text-teal-900">Leçon terminée !</p>
      <p className="text-sm text-teal-900">Tu as construit 3/4, transformé une moitié en quarts, puis additionné les fractions.</p>
      <button type="button" onClick={reset} className="min-h-11 rounded-xl bg-teal-600 px-5 font-bold text-white">Recommencer le parcours</button>
    </div> : <button type="button" disabled={!canContinue} onClick={() => setStep(value => value + 1)}
      className="min-h-12 w-full rounded-xl bg-teal-600 px-5 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
    >{canContinue ? 'Continuer' : 'Termine cette activité pour continuer'}</button>}
    <p className="text-xs text-slate-500">Simulation sans compte ni sauvegarde. Le lecteur de leçons réel est vérifié séparément.</p>
  </section>;
}
