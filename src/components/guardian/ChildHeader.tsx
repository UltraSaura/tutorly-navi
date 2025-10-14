import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type ExerciseHistoryWithAttempts } from '@/types/exercise-history';
interface ChildHeaderProps {
  name: string;
  grade: string;
  status: string;
  exerciseHistory: ExerciseHistoryWithAttempts[];
}
export function ChildHeader({
  name,
  grade,
  status,
  exerciseHistory
}: ChildHeaderProps) {
  // Calculate average score
  const avgScore = exerciseHistory.length > 0 ? Math.round(exerciseHistory.reduce((sum, ex) => {
    const score = ex.is_correct ? 100 : 0;
    return sum + score;
  }, 0) / exerciseHistory.length) : 0;

  // Calculate alerts (exercises that are incorrect)
  const alerts = exerciseHistory.filter(ex => ex.is_correct === false).length;
  const statusColor = alerts === 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400';
  const statusText = alerts === 0 ? 'On track' : `${alerts} alert${alerts > 1 ? 's' : ''}`;
  return <Card className="p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary rounded-sm">
            {name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold text-foreground text-base">{name}</h1>
            <p className="text-sm text-muted-foreground">{grade}</p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          <Badge className={statusColor}>
            {statusText}
          </Badge>
          
        </div>
      </div>
    </Card>;
}