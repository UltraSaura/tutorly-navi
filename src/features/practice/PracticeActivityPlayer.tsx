import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { LearningAttemptResult } from '@/types/learning-attempt';
import type { SkillActivityDefinition } from '@/types/skill-activity';
import { getPracticeActivityRenderer } from './activityRegistry';

interface PracticeActivityPlayerProps {
  activities: SkillActivityDefinition[];
  sessionTitle?: string;
  onAttempt?: (attempt: LearningAttemptResult) => void;
  onSessionComplete?: () => void;
  onExit?: () => void;
}

export function PracticeActivityPlayer({
  activities,
  sessionTitle = 'Practice',
  onAttempt,
  onSessionComplete,
  onExit,
}: PracticeActivityPlayerProps) {
  const [index, setIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const activity = activities[index];

  const progress = useMemo(() => {
    if (activities.length === 0) return 0;
    return Math.round((completedIds.size / activities.length) * 100);
  }, [activities.length, completedIds]);

  if (!activity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{sessionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">No practice activities are available for this session yet.</p>
          {onExit ? <Button variant="outline" onClick={onExit}>Back to practice</Button> : null}
        </CardContent>
      </Card>
    );
  }

  const Renderer = getPracticeActivityRenderer(activity.engine);
  const isLast = index === activities.length - 1;
  const isCurrentComplete = completedIds.has(activity.id);

  function completeCurrent() {
    setCompletedIds((current) => {
      const next = new Set(current);
      next.add(activity.id);
      return next;
    });
  }

  function next() {
    if (!isCurrentComplete) return;
    if (isLast) {
      onSessionComplete?.();
      return;
    }
    setIndex((current) => Math.min(current + 1, activities.length - 1));
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4" aria-label={sessionTitle}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{sessionTitle}</p>
          <p className="text-xs text-muted-foreground">Activity {index + 1} of {activities.length}</p>
        </div>
        {onExit ? <Button variant="ghost" size="sm" onClick={onExit}><ArrowLeft className="mr-1 h-4 w-4" />Exit</Button> : null}
      </div>

      <Progress value={progress} aria-label="Practice session progress" />

      <Card>
        <CardHeader>
          <CardTitle>{activity.title ?? activity.conceptId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activity.description ? <p className="text-sm text-muted-foreground">{activity.description}</p> : null}

          {Renderer ? (
            <Renderer
              activity={activity}
              onAttempt={(attempt) => onAttempt?.(attempt)}
              onComplete={completeCurrent}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              This activity type is not available yet.
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-xs text-muted-foreground">
              {isCurrentComplete ? <span className="inline-flex items-center"><CheckCircle2 className="mr-1 h-4 w-4" />Completed</span> : 'Complete the activity to continue'}
            </span>
            <Button onClick={next} disabled={!isCurrentComplete}>
              {isLast ? 'Finish session' : 'Next'}
              {!isLast ? <ArrowRight className="ml-1 h-4 w-4" /> : null}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default PracticeActivityPlayer;
