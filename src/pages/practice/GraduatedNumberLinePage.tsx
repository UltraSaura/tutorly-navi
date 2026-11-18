import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageMeta } from '@/components/seo/PageMeta';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { GRADUATED_NUMBER_LINE_ACTIVITIES } from '@/features/practice/numberLine/numberLineActivities';
import { GraduatedNumberLineActivity } from '@/features/practice/numberLine/GraduatedNumberLineActivity';
import { createNumberLineTransfer } from '@/features/practice/numberLine/numberLineSupport';
import type { GraduatedNumberLineConfiguration, GraduatedNumberLineResult } from '@/features/practice/numberLine/numberLineTypes';

export default function GraduatedNumberLinePage() {
  const ui = useInterfaceTranslation();
  const { language } = useLanguage();
  const fr = language.startsWith('fr');
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GraduatedNumberLineResult | null>(null);
  const [transfer, setTransfer] = useState<GraduatedNumberLineConfiguration | null>(null);
  const [transferResult, setTransferResult] = useState<GraduatedNumberLineResult | null>(null);
  const activity = GRADUATED_NUMBER_LINE_ACTIVITIES[index];
  const validated = result?.status === 'correct';
  const restart = (nextIndex: number) => {
    setIndex(nextIndex);
    setResult(null);
    setTransfer(null);
    setTransferResult(null);
  };
  return <div className="min-h-screen bg-background px-4 pb-64 pt-6 sm:pb-40">
    <PageMeta title="Demi-droite graduée" description="Place, lis et range des nombres sur une droite graduée." />
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <Button variant="ghost" onClick={() => navigate('/practice')}><ArrowLeft className="mr-2 h-4 w-4" />{ui('Back to Practice')}</Button>
      <Card>
        <CardHeader><CardTitle>{activity.title}</CardTitle><p className="text-sm text-muted-foreground">{index + 1} / {GRADUATED_NUMBER_LINE_ACTIVITIES.length}</p></CardHeader>
        <CardContent className="space-y-4 pb-8">
          {!transfer ? <GraduatedNumberLineActivity key={activity.id} config={activity} onResult={setResult} onReset={() => setResult(null)} />
            : <section className="space-y-4" aria-label={fr ? 'Nouvel exemple' : 'Fresh example'} data-testid="number-line-transfer">
              <p className="text-sm text-muted-foreground">{fr ? 'L’activité précédente est terminée avec une aide. Ce nouvel exemple permet d’essayer sans aide ; tu peux toujours en demander.' : 'The previous activity was completed with help. Try this fresh example without help; help is still available if you need it.'}</p>
              <h2 className="text-lg font-semibold">{fr ? 'À toi : un nouvel exemple' : 'Your turn: a fresh example'}</h2>
              <GraduatedNumberLineActivity key={transfer.id} config={transfer} onResult={setTransferResult} onReset={() => setTransferResult(null)} />
            </section>}
          {validated && result.supportUsed && !transfer && <Button type="button" className="min-h-11 w-full" variant="outline" onClick={() => { setTransfer(createNumberLineTransfer(activity)); setTransferResult(null); }}>{fr ? 'Essayer un nouvel exemple sans aide' : 'Try a fresh example without help'}</Button>}
          {validated && index === GRADUATED_NUMBER_LINE_ACTIVITIES.length - 1 && (!transfer || transferResult?.status === 'correct') && <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4" role="status"><p className="font-semibold">{ui('All activities completed')}</p><Button onClick={() => restart(0)}>{ui('Start again')}</Button></div>}
          {validated && index < GRADUATED_NUMBER_LINE_ACTIVITIES.length - 1 && <Button className="min-h-11 w-full" onClick={() => restart(index + 1)}>{ui('Next activity')}</Button>}
        </CardContent>
      </Card>
    </div>
  </div>;
}
