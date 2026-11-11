import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { advanceTutorStep, continueAfterDemonstration, createInteractiveTutorSession, demonstrateCorrectionMethod, demonstrateTutorStep, isTransferStage, requestTutorHint, resumeWithSupport, retryTutorQuestion, submitTutorResponse } from '@/features/explanations/interactiveTutorSession';

// Development-only parent: animation, narration and navigation belong to the original component.
export function InteractiveStudentSession({ grade }: { grade: string }) {
  const [session, setSession] = useState(createInteractiveTutorSession);
  const [answer, setAnswer] = useState('');
  const [tab, setTab] = useState<'teacher' | 'animation'>('teacher');
  useEffect(() => {
    if (window.location.hash === '#student-session') document.getElementById('student-session')?.scrollIntoView();
  }, []);
  useEffect(() => { setAnswer(''); }, [session.step, session.state, session.prerequisite]);
  const demonstration = session.state === 'demonstrate';
  const submit = () => { setSession(current => submitTutorResponse(current, answer)); setAnswer(''); };
  return <section id="student-session" data-testid="interactive-student-session" className="min-w-0 rounded-xl border border-teal-200 bg-white p-3 dark:bg-slate-950">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">À toi de jouer · {grade}</h3>
      <Button variant="ghost" size="sm" onClick={() => setSession(createInteractiveTutorSession())}>Nouvel exercice</Button>
    </header>
    <Tabs value={tab} onValueChange={value => setTab(value as 'teacher' | 'animation')} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="teacher" className="min-h-11 whitespace-normal">Mon professeur</TabsTrigger>
        <TabsTrigger value="animation" className="min-h-11 whitespace-normal">Animation</TabsTrigger>
      </TabsList>
      <TabsContent value="teacher" data-testid="teacher-tab" className="mt-3">
        <p className="mb-3 font-semibold">{isTransferStage(session) && !demonstration ? 'Application : 326 − 157' : '325 − 148'}</p>
        {session.state === 'correction-explanation' && session.correction ? <div data-testid="pedagogical-correction" className="space-y-3">
          <h4 className="font-semibold">Pourquoi ?</h4><p>{session.correction.explanation}</p>
          <Button className="h-auto w-full whitespace-normal" onClick={() => setSession(demonstrateCorrectionMethod)}>Voir la méthode sur l’opération</Button>
        </div> : demonstration ? <div data-testid="twocards-learning-surface" className="space-y-3">
          <h4 className="font-semibold">Comment ?</h4>
          <p>On ajoute 10 unités en haut et 1 dizaine en bas : on ajoute la même quantité aux deux nombres, donc leur différence ne change pas.</p>
          <Button className="h-auto min-h-11 w-full whitespace-normal" onClick={() => setSession(continueAfterDemonstration)}>À moi d’essayer un autre calcul</Button>
        </div> : <>
          {session.feedback && !session.canAdvance && <p role="status" aria-live="polite" className="mb-3">{session.feedback}</p>}
          {session.state === 'complete' ? <><h4 className="font-bold">Séance terminée</h4><p>Tu as appliqué la compensation à un nouveau calcul. La différence reste la même quand on ajoute la même quantité aux deux nombres.</p></> : session.state === 'needs-support' ? <><p>{session.question}</p><Button className="h-auto whitespace-normal" onClick={() => setSession(resumeWithSupport)}>Reprendre avec mon accompagnant</Button></> : session.canAdvance ? <div><p role="status">{session.feedback}</p><Button className="mt-3 min-h-11 w-full" onClick={() => setSession(advanceTutorStep)}>Suivant</Button></div> : <form onSubmit={event => { event.preventDefault(); submit(); }}>
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
