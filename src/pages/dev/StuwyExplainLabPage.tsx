import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StructuredOperationGrid } from '@/components/math/StructuredOperationGrid';
import { buildLabSolution, type LabDepth } from '@/features/explanations/stuwyExplainLab';
import { TeacherLabPanel } from './TeacherLabPanel';

const defaults = { expression: '325 - 148', grade: 'CM2', objective: 'Poser et effectuer une soustraction', method: 'Calcul posé français', depth: 'guided' as LabDepth };
const demoPresets: Record<string, typeof defaults> = {
  addition: { ...defaults, expression: '58 + 67', grade: 'CE2', objective: 'Additionner avec retenue' },
  borrowing: { ...defaults, expression: '52 - 27', grade: 'CM1', objective: 'Échanger une dizaine contre dix unités' },
  borrowingAcrossZero: { ...defaults, expression: '403 - 178', grade: 'CM1', objective: 'Regrouper à travers un zéro' },
  multiplication: { ...defaults, expression: '247 × 36', grade: 'CM1', objective: 'Calculer avec des produits partiels' },
  divisionRemainder: { ...defaults, expression: '907 ÷ 4', grade: 'CM1', objective: 'Effectuer une division euclidienne' },
  decimals: { ...defaults, expression: '125,6 + 8,75', grade: 'CM1', objective: 'Aligner les chiffres décimaux' },
};

export default function StuwyExplainLabPage() {
  const [form, setForm] = useState(defaults);
  const [submitted, setSubmitted] = useState(defaults);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [review, setReview] = useState('');
  const solution = useMemo(() => { try { return { value: buildLabSolution(submitted), error: null }; } catch (error) { return { value: null, error: error instanceof Error ? error.message : 'Erreur inconnue' }; } }, [submitted]);
  const steps = solution.value?.steps ?? [];
  const activeStep = steps[currentStep];
  const gridFrames = solution.value?.grid.frames ?? [];
  const activeGridFrame = gridFrames[Math.min(currentStep, Math.max(gridFrames.length - 1, 0))];
  const guidedAnswerHidden = submitted.depth === 'guided' && currentStep < steps.length - 1;
  const checkDetail = (check: { name: string; detail: string }) => guidedAnswerHidden && check.name === 'Résultat vérifié' ? 'La vérification finale sera affichée après la dernière étape.' : check.detail;
  useEffect(() => {
    const preset = demoPresets[new URLSearchParams(window.location.search).get('demo') ?? ''];
    if (preset) { setForm(preset); setSubmitted(preset); setCurrentStep(0); }
  }, []);
  useEffect(() => {
    if (!playing || currentStep >= steps.length - 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (currentStep < steps.length - 1) setCurrentStep((step) => step + 1);
      else setPlaying(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [playing, currentStep, steps.length]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(form); setCurrentStep(0); setPlaying(false); };
  const previous = () => { setPlaying(false); setCurrentStep((step) => Math.max(0, step - 1)); };
  const advance = () => { if (currentStep < steps.length - 1) setCurrentStep((step) => step + 1); else setPlaying(false); };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8 dark:bg-slate-950 dark:text-slate-100"><div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Development only · Stuwy Explain V2</p><h1 className="mt-2 text-3xl font-bold">Explanation Lab</h1><p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Vérifiez d’abord les étapes mathématiques déterministes, puis évaluez la formulation pédagogique. Aucun appel IA ni donnée élève n’est utilisé ici.</p></header>
    <Card><CardHeader><CardTitle>Paramètres de l’expérience</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <label className="space-y-1 lg:col-span-2"><span className="text-sm font-medium">Exercice</span><Input value={form.expression} onChange={(e) => setForm({ ...form, expression: e.target.value })} aria-label="Exercice" /></label>
      <label className="space-y-1"><span className="text-sm font-medium">Classe</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}><option>CE2</option><option>CM1</option><option>CM2</option><option>6e</option><option>5e</option></select></label>
      <label className="space-y-1"><span className="text-sm font-medium">Méthode</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>Calcul posé français</option><option>Calcul mental guidé</option><option>Décomposition par rangs</option></select></label>
      <label className="space-y-1"><span className="text-sm font-medium">Profondeur</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value as LabDepth })}><option value="guided">Guidée</option><option value="concise">Essentielle</option><option value="remediation">Remédiation</option></select></label>
      <label className="space-y-1 md:col-span-2 lg:col-span-4"><span className="text-sm font-medium">Objectif curriculaire</span><Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} aria-label="Objectif curriculaire" /></label><Button type="submit" className="self-end">Générer localement</Button>
    </form></CardContent></Card>
    {solution.error ? <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-800"><AlertCircle className="h-5 w-5" />{solution.error}</div> : solution.value && <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Prévisualisation pas à pas</CardTitle><span className="text-sm text-slate-500">Étape {currentStep + 1} / {steps.length}</span></CardHeader><CardContent className="space-y-4">
      {activeGridFrame && <StructuredOperationGrid frame={activeGridFrame} columns={solution.value.grid.columns} />}<div className="flex flex-wrap gap-2"><Button variant="outline" aria-label="Rejouer l’explication" onClick={() => setCurrentStep(0)}><RotateCcw className="mr-2 h-4 w-4" />Rejouer</Button><Button variant="outline" aria-label="Étape précédente" onClick={previous} disabled={currentStep === 0}><ChevronLeft className="mr-2 h-4 w-4" />Précédent</Button><Button aria-label={playing ? 'Mettre en pause' : 'Lire l’explication'} onClick={() => { setPlaying(!playing); if (!playing) advance(); }}>{playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{playing ? 'Pause' : 'Lecture'}</Button><Button variant="outline" aria-label="Étape suivante" onClick={advance} disabled={currentStep >= steps.length - 1}>Suivant</Button></div><p aria-live="polite" className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100">{activeGridFrame?.explanation ?? activeStep?.explanation}</p><p className="text-xs text-slate-500">Chaque chiffre est placé par exposant de dix. Le geste complet reste visible pendant la progression.</p>
    </CardContent></Card><div className="space-y-6"><Card><CardHeader><CardTitle>Validation mathématique</CardTitle></CardHeader><CardContent className="space-y-3">{solution.value.checks.map((check) => <div key={check.name} className="flex gap-2 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-medium">{check.name}</p><p className="text-slate-500">{checkDetail(check)}</p></div></div>)}<div className="border-t pt-3 text-lg font-bold">Résultat : {guidedAnswerHidden ? 'À découvrir à la dernière étape' : solution.value.displayResult}</div></CardContent></Card><Card><CardHeader><CardTitle>Évaluation pédagogique</CardTitle></CardHeader><CardContent className="space-y-3"><ul className="list-disc space-y-2 pl-5 text-sm">{solution.value.pedagogicalNotes.map((note) => <li key={note}>{note}</li>)}</ul><label className="block space-y-1 text-sm font-medium">Retour du relecteur<textarea className="min-h-24 w-full rounded-md border bg-background p-2 text-sm font-normal" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Lisibilité, niveau, méthode…" /></label><p className="text-xs text-slate-500">{review ? 'Retour conservé dans cette session locale.' : 'Aucune donnée n’est enregistrée hors de cette session.'}</p></CardContent></Card></div></div>}
    <div data-testid="teacher-lab"><TeacherLabPanel /></div>
  </div></main>;
}
