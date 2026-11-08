import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CleanWrittenOperation } from '@/components/math/CleanWrittenOperation';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { buildLabSolution } from '@/features/explanations/stuwyExplainLab';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import {
  continueAfterDemonstration,
  createInteractiveTutorSession,
  demonstrateTutorStep,
  requestTutorHint,
  retryTutorQuestion,
  submitTutorResponse,
  type InteractiveTutorSession,
} from '@/features/explanations/interactiveTutorSession';
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

function InteractiveStudentSession({ grade }: { grade: string }) {
  const [session, setSession] = useState<InteractiveTutorSession>(() => createInteractiveTutorSession());
  const [answer, setAnswer] = useState('');
  const solution = useMemo(() => buildLabSolution({ expression: '325 - 148', grade, objective: 'Soustraire avec regroupement', method: 'Calcul posé français', depth: 'guided' }), [grade]);
  const under11 = isUnder11YearsOld(grade);
  const activeFrame = solution.grid.frames[Math.min(session.step, Math.max(solution.grid.frames.length - 1, 0))];
  const submit = () => {
    setSession((current) => submitTutorResponse(current, answer));
    setAnswer('');
  };
  const choose = (value: string) => setAnswer(value);
  const reset = () => { setSession(createInteractiveTutorSession()); setAnswer(''); };

  return <section data-testid="interactive-student-session" className="rounded-xl border-2 border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Élève · session interactive</p><h3 className="mt-1 text-xl font-bold">325 − 148</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Le professeur attend ta réponse et adapte la suite à ce que tu écris.</p></div>
      <Button type="button" variant="outline" onClick={reset}>Nouvel exercice</Button>
    </div>
    {session.state === 'complete' ? <div className="mt-4 rounded-lg bg-emerald-100 p-4 text-emerald-950"><p className="font-semibold">Séance terminée</p><p className="mt-1 text-sm">Tu as réussi l’exemple puis un exercice de transfert avec moins d’aide.</p><dl className="mt-3 grid gap-1 text-sm"><div><dt className="font-medium">Tentatives</dt><dd>{session.attempts.length}</dd></div><div><dt className="font-medium">Aide utilisée</dt><dd>Niveau {session.assistanceLevel} · {session.demonstrationUsed ? 'démonstration consultée' : 'sans démonstration'}</dd></div><div><dt className="font-medium">Étape clé indépendante</dt><dd>{session.criticalStepIndependent ? 'Oui' : 'Pas encore démontrée'}</dd></div></dl><p className="mt-3 text-xs">Cette réussite est un indice encourageant, pas une preuve de maîtrise durable.</p></div> : session.state === 'demonstrate' ? <div className="mt-4 space-y-3 rounded-lg bg-white p-3 dark:bg-slate-950"><p className="text-sm font-medium">Observe seulement l’étape en cours, puis explique-la avec tes mots.</p>{under11 ? <CompactMathStepper expression="325 - 148" className="text-sm" /> : <CleanWrittenOperation frame={activeFrame} columns={solution.grid.columns} expression="325 - 148" result={solution.displayResult} assistance="standard" />}<Button type="button" onClick={() => setSession((current) => continueAfterDemonstration(current))}>J’ai compris, continuer</Button></div> : <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]"><div className="rounded-lg bg-white p-4 dark:bg-slate-950"><p className="text-lg font-semibold" aria-live="polite">{session.question}</p><details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Choisir une réponse</summary><div className="mt-2 grid gap-2" role="group" aria-label="Réponses proposées"><Button type="button" variant="outline" className="justify-start text-left" onClick={() => choose('J’échange une dizaine contre 10 unités')}>Échanger une dizaine contre 10 unités</Button><Button type="button" variant="outline" className="justify-start text-left" onClick={() => choose('Je calcule 8 moins 5')}>Calculer 8 − 5</Button><Button type="button" variant="outline" className="justify-start text-left" onClick={() => choose('Je commence par les dizaines')}>Commencer par les dizaines</Button></div></details><label className="mt-3 block text-sm font-medium">Écris ton idée<input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} className="mt-1 h-10 w-full rounded-md border bg-background px-3" aria-label="Ta réponse" /></label><div className="mt-3 flex flex-wrap gap-2"><Button type="button" onClick={submit} disabled={!answer.trim()}>Valider ma réponse</Button><Button type="button" variant="outline" onClick={() => setSession((current) => requestTutorHint(current))}>Un indice</Button>{(session.state === 'feedback' || session.state === 'hint') && <Button type="button" variant="outline" onClick={() => setSession((current) => retryTutorQuestion(current))}>Réessayer</Button>}{(session.state === 'feedback' || session.state === 'hint') && <Button type="button" variant="outline" onClick={() => setSession((current) => demonstrateTutorStep(current))}>Voir une explication</Button>}</div></div><div className="rounded-lg border border-teal-200 bg-teal-100/70 p-4 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-100"><p className="font-semibold">Retour du professeur</p><p className="mt-2" role="status" aria-live="polite">{session.feedback}</p>{session.state === 'transfer' && <p className="mt-3 font-medium">{session.transferQuestion}</p>}</div></div>}
  </section>;
}

function nextAttemptList(input: TeacherEngineInput, event: TeacherEvent): TeacherEngineInput['attempts'] {
  if (event.type !== 'student_attempt') return input.attempts;
  return [...input.attempts, { answer: event.answer, isCorrect: event.isCorrect, misconception: event.misconception }];
}
