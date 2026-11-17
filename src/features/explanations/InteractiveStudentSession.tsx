import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubtractionVisualGuide } from '@/features/explanations/SubtractionVisualGuide';
import { advanceTutorStep, continueAfterDemonstration, createInteractiveTutorSession, demonstrateCorrectionMethod, demonstrateTutorStep, isTransferStage, requestTutorHint, resumeWithSupport, retryTutorQuestion, submitTutorResponse } from '@/features/explanations/interactiveTutorSession';
import { restoreStudentSession, saveStudentSession, type StudentSessionTab } from '@/features/explanations/studentSessionPersistence';

export function InteractiveStudentSession({ grade, storageKey, practiceHref, lessonHref, videoHref }: {
  grade: string;
  storageKey?: string;
  practiceHref?: string;
  lessonHref?: string;
  videoHref?: string;
}) {
  const [initial] = useState(() => typeof window === 'undefined' ? null : restoreStudentSession(window.sessionStorage, storageKey));
  const [session, setSession] = useState(initial?.session ?? createInteractiveTutorSession);
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [tab, setTab] = useState<StudentSessionTab>(initial?.tab ?? 'teacher');
  const answerEffectReady = useRef(false);
  useEffect(() => {
    if (window.location.hash === '#student-session') document.getElementById('student-session')?.scrollIntoView();
  }, []);
  useEffect(() => {
    if (!answerEffectReady.current) { answerEffectReady.current = true; return; }
    setAnswer('');
  }, [session.step, session.prerequisite]);
  useEffect(() => {
    if (typeof window !== 'undefined') saveStudentSession(window.sessionStorage, storageKey, session, answer, tab);
  }, [storageKey, session, answer, tab]);
  const demonstration = session.state === 'demonstrate';
  const submit = () => { setSession(current => submitTutorResponse(current, answer)); setAnswer(''); };
  return <section id="student-session" data-testid="interactive-student-session" className="min-w-0 rounded-xl border border-teal-200 bg-white p-3 dark:bg-slate-950">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">À toi de jouer · {grade}</h3>
      <Button variant="ghost" size="sm" onClick={() => { setAnswer(''); setSession(createInteractiveTutorSession()); if (storageKey) window.sessionStorage.removeItem(storageKey); }}>Nouvel exercice</Button>
    </header>
    <Tabs value={tab} onValueChange={value => setTab(value as 'teacher' | 'animation')} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="teacher" className="min-h-11 whitespace-normal">Mon professeur</TabsTrigger>
        <TabsTrigger value="animation" className="min-h-11 whitespace-normal">Animation</TabsTrigger>
      </TabsList>
      <TabsContent value="teacher" data-testid="teacher-tab" className="mt-3">
        <p className="mb-3 font-semibold">{isTransferStage(session) && !demonstration ? 'Application : 326 − 157' : '325 − 148'}</p>
        <div className="mb-3" aria-label="Progression de l’exercice">
          <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-300"><span>Étapes réussies</span><span data-testid="exercise-progress-count">{session.completedSteps.length} / 13</span></div>
          <div role="progressbar" aria-label="Progression de l’exercice" aria-valuemin={0} aria-valuemax={13} aria-valuenow={session.completedSteps.length} className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-teal-500 transition-[width]" style={{ width: `${Math.min(100, (session.completedSteps.length / 13) * 100)}%` }} /></div>
        </div>
        <SubtractionVisualGuide session={session} />
        {session.state === 'correction-explanation' && session.correction ? <div data-testid="pedagogical-correction" className="space-y-3">
          <h4 className="font-semibold">Pourquoi ?</h4><p>{session.correction.explanation}</p>
          <Button className="h-auto w-full whitespace-normal" onClick={() => setSession(demonstrateCorrectionMethod)}>Voir la méthode sur l’opération</Button>
        </div> : demonstration ? <div data-testid="twocards-learning-surface" className="space-y-3">
          <h4 className="font-semibold">Comment ?</h4>
          <p>On ajoute 10 unités en haut et 1 dizaine en bas : on ajoute la même quantité aux deux nombres, donc leur différence ne change pas.</p>
          <Button className="h-auto min-h-11 w-full whitespace-normal" onClick={() => setSession(continueAfterDemonstration)}>À moi d’essayer un autre calcul</Button>
        </div> : <>
          {session.feedback && !session.canAdvance && <p role="status" aria-live="polite" className="mb-3">{session.feedback}</p>}
          {session.state === 'complete' ? <div data-testid="completion-screen" className="space-y-3 rounded-lg bg-teal-50 p-3 dark:bg-teal-950/30"><h4 className="font-bold">Exercice terminé !</h4><p>326 − 157 = <strong>169</strong>. Bravo : tu as suivi les colonnes et gardé la différence en compensant les deux nombres.</p><dl className="grid grid-cols-2 gap-2 text-sm"><div><dt className="text-slate-600 dark:text-slate-300">Étapes réussies</dt><dd className="font-semibold">{session.completedSteps.length} / 13</dd></div><div><dt className="text-slate-600 dark:text-slate-300">Essais</dt><dd className="font-semibold">{session.attempts.length}</dd></div><div><dt className="text-slate-600 dark:text-slate-300">Indices demandés</dt><dd className="font-semibold">{Object.values(session.hintLevelsByStep).reduce((sum, count) => sum + count, 0)}</dd></div><div><dt className="text-slate-600 dark:text-slate-300">Points gagnés</dt><dd className="font-semibold">0 XP</dd></div></dl><p className="text-xs text-slate-600 dark:text-slate-300">Cette activité de pratique n’ajoute pas de XP : Tutorly attribue les XP selon les règles existantes des leçons et vidéos.</p><div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => { setAnswer(''); setSession(createInteractiveTutorSession()); if (storageKey) window.sessionStorage.removeItem(storageKey); }}>Refaire le parcours</Button>{practiceHref ? <a className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground" href={practiceHref}>Faire un autre exercice</a> : <a className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground" href="/practice">Continuer à s’entraîner</a>}{lessonHref && <a className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-center text-sm font-medium" href={lessonHref}>Ouvrir la leçon associée</a>}{videoHref && <a className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-center text-sm font-medium" href={videoHref}>Regarder la vidéo associée</a>}</div></div> : session.state === 'needs-support' ? <><p>{session.question}</p><Button className="h-auto whitespace-normal" onClick={() => setSession(resumeWithSupport)}>Reprendre avec mon accompagnant</Button></> : session.canAdvance ? <div><p role="status">{session.feedback}</p><Button className="mt-3 min-h-11 w-full" onClick={() => setSession(advanceTutorStep)}>Suivant</Button></div> : <form onSubmit={event => { event.preventDefault(); submit(); }}>
            <h4 data-testid="active-question" className="font-semibold" aria-live="polite">{session.question}</h4>
            {session.step === 0 && <div className="mt-3 grid gap-2" role="group" aria-label="Réponses proposées">
              {['J’ajoute 10 unités en haut et 1 dizaine en bas', 'Je calcule 8 moins 5', 'Je commence par les dizaines'].map(choice => <Button key={choice} type="button" variant="outline" className="h-auto min-h-11 whitespace-normal text-left" onClick={() => setAnswer(choice)}>{choice}</Button>)}
            </div>}
            <label className="mt-3 block">{session.step === 0 ? 'Ton idée' : 'Ta réponse'}<input aria-label="Ta réponse" value={answer} onChange={event => setAnswer(event.target.value)} inputMode={session.step === 0 ? 'text' : 'numeric'} autoComplete="off" className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button type="submit" disabled={!answer.trim()}>Valider ma réponse</Button>
              <Button type="button" variant="outline" onClick={() => setSession(requestTutorHint)}>Un indice</Button>
              {session.state === 'feedback' && <Button type="button" variant="outline" onClick={() => setSession(retryTutorQuestion)}>Réessayer</Button>}
              {session.hintLevel >= 2 && <Button type="button" variant="outline" onClick={() => setSession(demonstrateTutorStep)}>Revoir la méthode</Button>}
            </div>
          </form>}
        </>}
      </TabsContent>
      <TabsContent value="animation" data-testid="animation-tab" className="mt-3">
        <CompactMathStepper expression="325 - 148" className="text-sm" />
        <Button variant="outline" className="mt-3 min-h-11 w-full whitespace-normal" onClick={() => setTab('teacher')}>Retourner à Mon professeur</Button>
      </TabsContent>
    </Tabs>
  </section>;
}
