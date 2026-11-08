import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompactMathStepper } from '@/components/math/CompactMathStepper';
import { CompactConceptIllustration } from '@/components/math/CompactConceptIllustration';
import { isUnder11YearsOld } from '@/utils/gradeLevelMapping';
import { beginCorrectionCheck, continueAfterDemonstration, createInteractiveTutorSession, demonstrateTutorStep, demonstrationExpression, isTransferStage, requestTutorHint, resumeWithSupport, retryTutorQuestion, submitTutorResponse } from '@/features/explanations/interactiveTutorSession';

// This is a development-only interactive scenario, not a production lesson generator.
export function InteractiveStudentSession({ grade }: { grade: string }) {
  const [session, setSession] = useState(createInteractiveTutorSession);
  const [answer, setAnswer] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    // The Lab is lazy-loaded, so native fragment navigation happens before this section exists.
    if (window.location.hash === '#student-session') {
      document.getElementById('student-session')?.scrollIntoView({ block: 'start' });
    }
  }, []);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setAnswer('');
    input.current?.focus({ preventScroll: true });
  }, [session.step, session.prerequisite, session.state]);
  const transfer = isTransferStage(session);
  const under11 = isUnder11YearsOld(grade);
  const active = !['complete', 'demonstrate', 'correction-explanation', 'needs-support'].includes(session.state);
  const submit = () => { setSession(current => submitTutorResponse(current, answer)); setAnswer(''); };
  const numeric = session.step > 0 || session.prerequisite;
  return <section id="student-session" data-testid="interactive-student-session" className="min-w-0 rounded-xl border-2 border-teal-200 bg-teal-50 p-3 dark:bg-teal-950/20">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">À toi de jouer · {grade}</h3>
      <Button variant="ghost" size="sm" onClick={() => { setSession(createInteractiveTutorSession()); setAnswer(''); }}>Nouvel exercice</Button>
    </header>
    <div className="mt-2 grid min-w-0 gap-3 md:grid-cols-[12rem_minmax(0,1fr)]">
      <div aria-label="Calcul en cours" className="rounded-lg bg-white p-2 text-center dark:bg-slate-950">
        <p className="font-semibold">{transfer ? '326 − 157' : '325 − 148'}</p>
        {/* Static, explicit place values; the existing TwoCards renderer supplies demonstrations. */}
        <div className="mx-auto mt-2 grid w-36 grid-cols-4 font-mono text-xl" aria-label="Opération posée">
          <span />{[2, 1, 0].map(exponent => <span key={exponent} className="text-[10px] text-slate-500">{['U', 'D', 'C'][exponent]}</span>)}
          <span />{(transfer ? ['3', '2', '6'] : ['3', '2', '5']).map((digit, index) => {
            const replacement = transfer ? undefined : index === 0 && session.step >= 6 ? '2' : index === 1 && session.step >= 3 ? (session.step >= 6 ? '11' : '1') : index === 2 && session.step >= 3 ? '15' : undefined;
            return <span key={index} className="flex min-h-12 flex-col justify-end"><span className="h-4 text-xs font-bold text-teal-800 dark:text-teal-200">{replacement}</span><span className={replacement ? 'line-through text-slate-500' : ''}>{digit}</span></span>;
          })}
          <span>−</span>{(transfer ? ['1', '5', '7'] : ['1', '4', '8']).map((digit, index) => <span key={index}>{digit}</span>)}
          <span className="col-span-4 border-b-2 border-slate-700" />
          <span />{[2, 1, 0].map(exponent => <span key={exponent} className="h-8 font-bold" data-testid={`session-result-${exponent}`}>{transfer ? session.state === 'complete' ? ['9', '6', '1'][exponent] : '' : session.step >= [4, 7, 8][exponent] ? ['7', '7', '1'][exponent] : ''}</span>)}
        </div>
      </div>
      <div className="min-w-0 rounded-lg bg-white p-3 dark:bg-slate-950">
        {session.feedback && session.state !== 'correction-explanation' && <p role="status" aria-live="polite" className="mb-3 text-sm text-teal-900 dark:text-teal-100">{session.feedback}</p>}
        {session.state === 'complete' ? <><h4 className="font-bold">Séance terminée</h4><p className="mt-2 text-sm">Tu as terminé l’exemple et le calcul de transfert. Cela ne prouve pas encore une maîtrise durable.</p></> : session.state === 'needs-support' ? <><p className="font-semibold">Continuons avec un accompagnant</p><p className="mt-2">{session.question}</p><Button className="mt-3 h-auto whitespace-normal" onClick={() => setSession(resumeWithSupport)}>Reprendre avec mon accompagnant</Button></> : session.state === 'correction-explanation' && session.correction ? <div data-testid="pedagogical-correction" className="space-y-3"><p className="font-semibold">Regardons avec des objets</p><p>{session.correction.explanation}</p><CompactConceptIllustration /><p className="text-sm font-medium">{session.correction.principle}</p><Button className="h-auto w-full whitespace-normal" onClick={() => setSession(beginCorrectionCheck)}>Vérifier si tu as compris</Button></div> : session.state === 'demonstrate' ? <><p className="mb-2 text-sm">Démonstration TwoCards : {under11 ? '325 − 148' : demonstrationExpression(session)}. Cette animation reprend la méthode de l’opération.</p><Button className="sticky top-2 z-10 mb-3 h-auto min-h-11 w-full whitespace-normal" onClick={() => setSession(continueAfterDemonstration)}>À moi de répondre</Button><CompactMathStepper key={under11 ? '325 - 148' : demonstrationExpression(session)} expression={under11 ? '325 - 148' : demonstrationExpression(session)} /></> : active && <>
          <h4 data-testid="active-question" className="font-semibold" aria-live="polite">{session.question}</h4>
          {session.state === 'correction-check' && <div className="mt-2 grid gap-2" role="group" aria-label="Réponses de compréhension">{['Oui, ce sont deux situations différentes.', 'Non, c’est la même situation.'].map(choice => <Button key={choice} type="button" variant="outline" className="h-auto min-h-11 whitespace-normal text-left" onClick={() => setAnswer(choice)}>{choice}</Button>)}</div>}
          {!numeric && session.state === 'awaiting-response' && <details className="mt-2"><summary className="cursor-pointer text-sm">Choisir une réponse</summary><div className="mt-2 grid gap-2" role="group" aria-label="Réponses proposées">{['J’échange une dizaine contre 10 unités', 'Je calcule 8 moins 5', 'Je commence par les dizaines'].map(choice => <Button key={choice} variant="outline" className="h-auto min-h-11 whitespace-normal text-left" onClick={() => setAnswer(choice)}>{choice}</Button>)}</div></details>}
          <form className="mt-3" onSubmit={event => { event.preventDefault(); submit(); }}>
            <label className="block text-sm">{numeric ? 'Écris le nombre' : 'Écris ton idée'}<input ref={input} value={answer} onChange={event => setAnswer(event.target.value)} inputMode={numeric ? 'numeric' : 'text'} autoComplete="off" className="mt-1 h-11 w-full min-w-0 rounded-md border bg-background px-3" aria-label="Ta réponse" /></label>
            <div className="mt-3 grid grid-cols-1 gap-2 bg-white py-2 dark:bg-slate-950 sm:grid-cols-2">
              <Button type="submit" disabled={!answer.trim()}>Valider ma réponse</Button>
              <Button type="button" variant="outline" onClick={() => setSession(requestTutorHint)}>Un indice</Button>
              {session.state === 'feedback' && <Button type="button" variant="outline" onClick={() => { setSession(retryTutorQuestion); input.current?.focus(); }}>Réessayer</Button>}
              {session.hintLevel >= 2 && <Button type="button" variant="outline" onClick={() => setSession(demonstrateTutorStep)}>Voir une explication</Button>}
            </div>
          </form>
        </>}
      </div>
    </div>
  </section>;
}
