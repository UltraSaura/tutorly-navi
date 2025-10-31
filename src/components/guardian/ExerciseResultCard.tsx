import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Eye, Lightbulb } from 'lucide-react';
import { ExerciseHistoryWithAttempts } from '@/types/exercise-history';
import { format } from 'date-fns';
import { MathRenderer } from '@/components/math';

interface ExerciseResultCardProps {
  exercise: ExerciseHistoryWithAttempts;
  childName?: string;
  onViewExplanation?: (exercise: ExerciseHistoryWithAttempts) => void;
  onRequestExplanation?: (exercise: ExerciseHistoryWithAttempts) => void;
}

export default function ExerciseResultCard({
  exercise,
  childName,
  onViewExplanation,
  onRequestExplanation,
}: ExerciseResultCardProps) {
  const hasExplanation = Array.isArray(exercise.explanation)
    ? exercise.explanation.length > 0
    : !!exercise.explanation;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {exercise.is_correct === null ? (
                <Clock className="h-5 w-5 text-muted-foreground" />
              ) : exercise.is_correct ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {childName && <span className="text-sm text-muted-foreground">{childName}</span>}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {exercise.subject_id && (
              <Badge variant="outline" className="capitalize">
                {exercise.subject_id}
              </Badge>
            )}
            <Badge variant="secondary">
              {exercise.attempts_count} {exercise.attempts_count === 1 ? 'attempt' : 'attempts'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Exercise:</p>
          <div className="p-3 bg-muted rounded-md">
            <MathRenderer latex={exercise.exercise_content} />
          </div>
        </div>

        {exercise.user_answer ? (
          <div>
            <p className="text-sm font-medium mb-2">
              {exercise.is_correct ? 'Correct Answer:' : 'Student Answer:'}
            </p>
            <div className="p-3 bg-muted rounded-md">
              <MathRenderer latex={exercise.user_answer} />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground italic">
              Question asked - Not answered yet
            </p>
          </div>
        )}

        {/* NEW: Show correct answer for guardians */}
        {exercise.correct_answer && (
          <div>
            <p className="text-sm font-medium mb-2 text-green-700 dark:text-green-400">
              Correct Answer:
            </p>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
              <MathRenderer latex={exercise.correct_answer} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(exercise.created_at), 'PPp')}
          </div>
          <div className="flex gap-2">
            {hasExplanation && onViewExplanation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewExplanation(exercise)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Explanation
              </Button>
            )}
            {!hasExplanation && exercise.user_answer && onRequestExplanation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRequestExplanation(exercise)}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate Explanation
              </Button>
            )}
          </div>
        </div>

        {exercise.attempts && exercise.attempts.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2">Attempt History:</p>
            <div className="space-y-1">
              {exercise.attempts.map((attempt, idx) => (
                <div key={attempt.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Attempt {idx + 1}: {format(new Date(attempt.created_at), 'PP')}
                  </span>
                  {attempt.is_correct ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
