import { ArrowRight, BookOpen, MessageCircle, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useNextBestActions } from '@/hooks/useNextBestActions';
import type { RecommendedAction } from '@/types/recommendation';

const sourceIcon = {
  learn: BookOpen,
  tutor: MessageCircle,
  practice: Target,
};

function RecommendationCard({ action, primary = false }: { action: RecommendedAction; primary?: boolean }) {
  const Icon = sourceIcon[action.source];
  return (
    <Card className={primary ? 'border-primary/30 shadow-sm' : ''}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            {action.subjectName ? <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{action.subjectName}</p> : null}
            <h2 className={primary ? 'mt-1 text-xl font-bold' : 'mt-1 font-semibold'}>{action.title}</h2>
            {action.description ? <p className="mt-1 text-sm text-muted-foreground">{action.description}</p> : null}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          {action.estimatedMinutes ? <span className="text-xs text-muted-foreground">≈ {action.estimatedMinutes} min</span> : <span />}
          <Button asChild size={primary ? 'default' : 'sm'}>
            <Link to={action.route}>Start <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const ui = useInterfaceTranslation();
  const { actions, subjects, isLoading, error } = useNextBestActions();

  if (isLoading) {
    return <div className="mx-auto max-w-5xl space-y-5 px-4 py-4" aria-busy="true"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div></div>;
  }

  const primary = actions[0];
  const secondary = actions.slice(1);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-4 md:py-8">
      <section>
        <div className="mb-5 flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /><span className="text-sm font-semibold">{ui('For you')}</span></div>
        <h1 className="text-3xl font-bold tracking-tight">{ui('What should I do now?')}</h1>
        <p className="mt-2 text-muted-foreground">{ui('Tutorly uses your recent learning to suggest a useful next step.')}</p>
      </section>

      {primary ? (
        <section aria-labelledby="next-action-heading">
          <h2 id="next-action-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{primary.reason === 'continue' ? ui('Continue') : ui('Recommended now')}</h2>
          <RecommendationCard action={primary} primary />
        </section>
      ) : (
        <Card><CardContent className="p-6"><h2 className="text-lg font-semibold">{ui('Choose where to start')}</h2><p className="mt-1 text-sm text-muted-foreground">{ui('Explore your subjects or ask Tutor for help with homework.')}</p><div className="mt-4 flex gap-3"><Button asChild><Link to="/learning">{ui('Explore subjects')}</Link></Button><Button asChild variant="outline"><Link to="/chat">{ui('Open Tutor')}</Link></Button></div></CardContent></Card>
      )}

      {secondary.length > 0 ? (
        <section aria-labelledby="for-you-heading">
          <h2 id="for-you-heading" className="mb-3 text-xl font-bold">{ui('For you')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{secondary.map((action) => <RecommendationCard key={action.id} action={action} />)}</div>
        </section>
      ) : null}

      <section aria-labelledby="subjects-heading">
        <div className="mb-3 flex items-center justify-between"><h2 id="subjects-heading" className="text-xl font-bold">{ui('Explore subjects')}</h2><Button asChild variant="ghost" size="sm"><Link to="/learning">{ui('See all')} <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
        {error ? <p className="mb-3 text-sm text-muted-foreground">{ui('Personal recommendations are temporarily limited. You can still choose a subject below.')}</p> : null}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {subjects.slice(0, 8).map((subject) => <Button key={subject.id} asChild variant="outline" className="h-auto min-h-16 justify-start whitespace-normal p-4 text-left"><Link to={`/learning/${encodeURIComponent(subject.slug)}`}><BookOpen className="mr-2 h-4 w-4 shrink-0" />{subject.subjectLabel}</Link></Button>)}
          {subjects.length === 0 ? <Button asChild variant="outline"><Link to="/learning">{ui('Learning')}</Link></Button> : null}
        </div>
      </section>
    </div>
  );
}
