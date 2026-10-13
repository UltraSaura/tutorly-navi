import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageMeta } from '@/components/seo/PageMeta';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { GRADUATED_NUMBER_LINE_ACTIVITIES } from '@/features/practice/numberLine/numberLineActivities';
import { GraduatedNumberLineActivity } from '@/features/practice/numberLine/GraduatedNumberLineActivity';
export default function GraduatedNumberLinePage() { const ui = useInterfaceTranslation(); const navigate = useNavigate(); const [index, setIndex] = useState(0); const [validated, setValidated] = useState(false); const activity = GRADUATED_NUMBER_LINE_ACTIVITIES[index]; const goNext = () => { setIndex((current) => current + 1); setValidated(false); }; return <div className="min-h-screen bg-background px-4 pb-64 pt-6 sm:pb-40"><PageMeta title="Demi-droite graduée" description="Place, lis et range des nombres sur une droite graduée." /><div className="mx-auto max-w-2xl space-y-4 pb-8"><Button variant="ghost" onClick={() => navigate('/practice')}><ArrowLeft className="mr-2 h-4 w-4" />{ui('Back to Practice')}</Button><Card><CardHeader><CardTitle>{activity.title}</CardTitle><p className="text-sm text-muted-foreground">{index + 1} / {GRADUATED_NUMBER_LINE_ACTIVITIES.length}</p></CardHeader><CardContent className="pb-8"><GraduatedNumberLineActivity key={activity.id} config={activity} onResult={(result) => setValidated(result.status === 'correct')} onReset={() => setValidated(false)} />{validated && index < GRADUATED_NUMBER_LINE_ACTIVITIES.length - 1 && <Button className="mt-5 w-full" onClick={goNext}>{ui('Next activity')}</Button>}</CardContent></Card></div></div>; }
