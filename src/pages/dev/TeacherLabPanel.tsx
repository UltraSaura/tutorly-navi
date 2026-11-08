import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CleanWrittenOperation } from '@/components/math/CleanWrittenOperation';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { buildLabSolution } from '@/features/explanations/stuwyExplainLab';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { InteractiveStudentSession } from './InteractiveStudentSession';
import {
  buildTeacherDecision,
  transitionTeacherDecision,
  type TeacherEngineInput,
  type TeacherEvent,
  type TutoringMode,
} from '@/features/explanations/teacherEngine';

type Scenario = 'understands' | 'calculation-error' | 'does-not-understand' | 'misaligned' | 'repeated-failure' | 'different-explanation' | 'independent-success';

const scenarioLabels: Record<Scenario, string> = {
  understands: 'Comprend immédiatement',
  'calculation-error': 'Erreur de calcul',
  'does-not-understand': 'Ne comprend pas le regroupement',
  misaligned: 'Chiffres mal alignés',
  'repeated-failure': 'Échec répété',
  'different-explanation': 'Demande une autre explication',
  'independent-success': 'Réussit un exercice similaire',
};

function operationFor(solution: ReturnType<typeof buildLabSolution>): TeacherEngineInput['verifiedSolution']['operation'] {
  return solution.grid.operation;
}

export function TeacherLabPanel() {
  const [problem, setProblem] = useState('325 - 148');
  const [grade, setGrade] = useState('CM1');
  const [mode, setMode] = useState<TutoringMode>('guided');
  const [mastery, setMastery] = useState('standard');
  const [scenario, setScenario] = useState<Scenario>('understands');
  const [attempts, setAttempts] = useState<TeacherEngineInput['attempts']>([]);
  const [step, setStep] = useState(0);
  const [lastEvent, setLastEvent] = useState('Aucune interaction simulée.');

  const solution = useMemo(() => {
    try { return buildLabSolution({ expression: problem, grade, objective: 'Soustraire avec regroupement', method: 'Calcul posé français', depth: 'guided' }); }
    catch { return null; }
  }, [problem, grade]);

  const input = useMemo<TeacherEngineInput | null>(() => {
    if (!solution) return null;
    return {
      problem,
      grade,
      curriculumObjective: 'Soustraire avec regroupement',
      mastery: mastery === 'concrete'
        ? { score: 0.2, recentCorrect: 0, recentIncorrect: 2, repeatedMisconception: scenario === 'repeated-failure' ? 'regroupement non compris' : undefined }
        : mastery === 'strong'
          ? { score: 0.9, recentCorrect: 4, recentIncorrect: 0 }
          : { score: 0.55, recentCorrect: 1, recentIncorrect: 1 },
      attempts,
      preferredPresentation: 'visual',
      tutoringMode: mode,
      verifiedSolution: { expression: problem, result: solution.displayResult, operation: operationFor(solution), stepCount: solution.steps.length, isVerified: true },
      explanationExperience: 'explain-v2',
    };
  }, [attempts, grade, mastery, mode, problem, scenario, solution]);

  const decision = input ? buildTeacherDecision(input, step) : null;
  const activeFrame = solution?.grid.frames[Math.min(step, Math.max(solution.grid.frames.length - 1, 0))];
  const comparisonSolution = useMemo(() => buildLabSolution({ expression: '325 - 148', grade: 'CM2', objective: 'Soustraire avec regroupement', method: 'Calcul posé français', depth: 'guided' }), []);
  const comparisonInput = useMemo<TeacherEngineInput>(() => ({
    problem: '325 - 148',
    grade: 'CM2',
    curriculumObjective: 'Soustraire avec regroupement',
    mastery: { score: 0.55, recentCorrect: 1, recentIncorrect: 1 },
    attempts: [],
    preferredPresentation: 'visual',
    tutoringMode: 'guided',
    verifiedSolution: { expression: '325 - 148', result: comparisonSolution.displayResult, operation: comparisonSolution.grid.operation, stepCount: comparisonSolution.steps.length, isVerified: true },
    explanationExperience: 'explain-v2',
  }), [comparisonSolution]);
  const comparisonDecision = buildTeacherDecision(comparisonInput, 1);

  const applyEvent = (event: TeacherEvent, label: string) => {
    if (!input) return;
    const next = transitionTeacherDecision(input, event, step);
    setAttempts(nextAttemptList(input, event));
    setStep(next.explanationStep);
    setLastEvent(label);
  };

  const simulateScenario = () => {
    if (!input) return;
    const event: TeacherEvent = scenario === 'independent-success'
      ? { type: 'similar_exercise_completed', isCorrect: true }
      : scenario === 'different-explanation'
        ? { type: 'request_different_explanation' }
        : scenario === 'understands'
          ? { type: 'student_attempt', answer: solution?.displayResult ?? '25', isCorrect: true }
          : { type: 'student_attempt', answer: scenario === 'misaligned' ? '75' : '35', isCorrect: false, misconception: scenario === 'does-not-understand' ? 'regroupement non compris' : scenario === 'misaligned' ? 'chiffres mal alignés' : undefined };
    applyEvent(event, `Scénario simulé : ${scenarioLabels[scenario]}`);
  };

  return <Card>
    <CardHeader><CardTitle>Teacher Lab · décision pédagogique</CardTitle><p className="text-sm text-slate-600 dark:text-slate-300">Espace de revue développeur : la solution vérifiée, la décision du professeur et le message adressé à l’élève sont séparés.</p></CardHeader>
    <CardContent className="space-y-5">
      <InteractiveStudentSession grade={grade} />
      <details data-testid="developer-tools" className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
        <summary className="cursor-pointer font-semibold">Outils développeur et comparaison des moteurs</summary>
        <div className="mt-4 space-y-5">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1"><span className="text-sm font-medium">Problème</span><Input value={problem} onChange={(event) => { setProblem(event.target.value); setAttempts([]); setStep(0); }} aria-label="Problème du Teacher Lab" /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Classe</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={grade} onChange={(event) => setGrade(event.target.value)}><option>CE2</option><option>CM1</option><option>CM2</option><option>6e</option></select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Mode</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value as TutoringMode)}><option value="guided">Guidée</option><option value="teaching">Enseignement</option><option value="review">Revue</option></select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Maîtrise</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={mastery} onChange={(event) => setMastery(event.target.value)}><option value="concrete">Fragile</option><option value="standard">En cours</option><option value="strong">Solide</option></select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Situation</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>{Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={simulateScenario}>Simuler la situation</Button><Button type="button" variant="outline" onClick={() => applyEvent({ type: 'request_hint' }, 'Indice demandé')}>Donner un indice</Button><Button type="button" variant="outline" onClick={() => applyEvent({ type: 'student_attempt', answer: '25', isCorrect: true }, 'Tentative correcte')}>Tentative correcte</Button><Button type="button" variant="outline" onClick={() => { setAttempts([]); setStep(0); setLastEvent('Réinitialisé.'); }}>Réinitialiser</Button></div>
      <p className="text-sm text-slate-500" aria-live="polite">{lastEvent}</p>
      {decision && activeFrame && <section className="rounded-lg border bg-white p-4 dark:bg-slate-950"><h3 className="mb-3 font-semibold">Démonstration sélectionnée</h3><CleanWrittenOperation frame={activeFrame} columns={solution?.grid.columns ?? []} expression={problem} result={solution?.displayResult} assistance={decision.assistance} /></section>}
      {decision && <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100"><h3 className="font-semibold">Décision du professeur</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="font-medium">Objectif</dt><dd>{decision.teachingObjective}</dd></div><div><dt className="font-medium">Niveau d’aide</dt><dd>{decision.assistance}</dd></div><div><dt className="font-medium">Stratégie</dt><dd>{decision.strategy}</dd></div><div><dt className="font-medium">Remédiation</dt><dd>{decision.remediationRecommendation}</dd></div><div><dt className="font-medium">Critère de progression</dt><dd>{decision.progressionCriteria}</dd></div></dl></section>
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"><h3 className="font-semibold">Message à l’élève</h3><p className="mt-3 text-sm">{decision.studentFacingExplanation}</p><p className="mt-3 font-medium">{decision.studentFacingQuestion}</p><div className="mt-3"><p className="text-sm font-medium">Indices disponibles</p><ol className="mt-1 list-decimal pl-5 text-sm">{decision.progressiveHints.map((hint) => <li key={hint}>{hint}</li>)}</ol></div><p className="mt-3 text-sm">Réponse attendue : {decision.expectedStudentResponse}</p><p className="mt-3 text-sm font-semibold">{decision.finalAnswerVisible ? `Réponse vérifiée : ${solution?.displayResult}` : 'La réponse finale reste masquée jusqu’à une tentative.'}</p></section>
      </div>}
      {!solution && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">Cette démonstration utilise le solveur local vérifié : entre une soustraction posée valide, par exemple 52 - 27, 325 - 148 ou 403 - 178.</p>}
      <section data-testid="twocards-comparison" className="space-y-4 border-t pt-5">
        <div>
          <h3 className="text-lg font-semibold">Comparaison des expériences · 325 − 148</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">A et B réutilisent l’animation mathématique existante de TwoCards (`CompactMathStepper`). C est la présentation papier Explain V2. Aucune de ces variantes ne modifie les leçons de production.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-lg border bg-white p-4 dark:bg-slate-950" aria-label="TwoCards original">
            <h4 className="mb-3 font-semibold">A · TwoCards original</h4>
            <p className="mb-3 text-xs text-slate-500">Animation et navigation existantes, sans changement.</p>
            <CompactMathStepper expression="325 - 148" className="text-sm" />
          </section>
          <section className="rounded-lg border bg-white p-4 dark:bg-slate-950" aria-label="TwoCards avec Teacher Engine">
            <h4 className="mb-3 font-semibold">B · TwoCards + Teacher Engine</h4>
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-medium">Aide proposée : {comparisonDecision.assistance}</p>
              <p className="mt-1">{comparisonDecision.studentFacingExplanation}</p>
              <p className="mt-2 font-medium">{comparisonDecision.studentFacingQuestion}</p>
            </div>
            <CompactMathStepper expression="325 - 148" className="text-sm" />
          </section>
          <section className="rounded-lg border bg-white p-4 dark:bg-slate-950" aria-label="Explain V2 advanced">
            <h4 className="mb-3 font-semibold">C · Explain V2 avancé</h4>
            <p className="mb-3 text-xs text-slate-500">Notation posée conventionnelle, avec annotations directes.</p>
            <CleanWrittenOperation frame={comparisonSolution.grid.frames[1]} columns={comparisonSolution.grid.columns} expression="325 - 148" result={comparisonSolution.displayResult} assistance="standard" />
          </section>
        </div>
      </section>
        </div>
      </details>
    </CardContent>
  </Card>;
}


function nextAttemptList(input: TeacherEngineInput, event: TeacherEvent): TeacherEngineInput['attempts'] {
  if (event.type !== 'student_attempt') return input.attempts;
  return [...input.attempts, { answer: event.answer, isCorrect: event.isCorrect, misconception: event.misconception }];
}
