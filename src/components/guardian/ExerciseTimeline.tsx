import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type ExerciseHistoryWithAttempts } from '@/types/exercise-history';
import { format } from 'date-fns';

interface ExerciseTimelineProps {
  attempts: ExerciseHistoryWithAttempts[];
}

export function ExerciseTimeline({ attempts }: ExerciseTimelineProps) {
  return (
    <Card className="p-4 bg-muted/30">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Attempt History
      </h4>
      <div className="space-y-2">
        {attempts.map((attempt, index) => {
          const status = attempt.is_correct === true ? 'Correct' : attempt.is_correct === false ? 'Incorrect' : 'Partial';
          const score = attempt.is_correct ? 100 : 0;
          const statusColor = 
            status === 'Correct' 
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : status === 'Incorrect'
              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400';

          return (
            <div
              key={attempt.id}
              className="flex items-center justify-between py-2 border-l-2 border-border pl-3"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">
                  #{attempts.length - index}
                </span>
                <Badge className={`text-xs ${statusColor}`}>
                  {status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {score}%
                </span>
                {attempt.user_answer && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-foreground">Answer: {attempt.user_answer}</span>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(attempt.created_at), 'MMM d, h:mm a')}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
