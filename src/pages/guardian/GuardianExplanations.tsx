import { useState } from 'react';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianExerciseHistory } from '@/hooks/useGuardianExerciseHistory';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import ExplanationCard from '@/components/guardian/ExplanationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BookOpen } from 'lucide-react';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';
import type { ExerciseHistoryWithAttempts } from '@/types/exercise-history';

export default function GuardianExplanations() {
  const { guardianId, loading: authLoading } = useGuardianAuth();
  const { children, exerciseHistory, loading } = useGuardianExerciseHistory({
    guardianId,
  });
  const [selectedExercise, setSelectedExercise] = useState<ExerciseHistoryWithAttempts | null>(null);
  const teaching = useTwoCardTeaching();

  const getChildName = (userId: string) => {
    const child = children.find((c) => c.user_id === userId);
    return child ? `${child.firstName} ${child.lastName}` : 'Unknown';
  };

  const handleRequestExplanation = async (exercise: ExerciseHistoryWithAttempts) => {
    const exerciseData = {
      prompt: exercise.exercise_content,
      userAnswer: exercise.user_answer || '',
      subject: exercise.subject_id || 'math'
    };
    
    await teaching.openFor(exerciseData, {
      response_language: 'English',
      grade_level: 'High School'
    });
    
    setSelectedExercise(exercise);
  };

  const handleViewExplanation = (exercise: ExerciseHistoryWithAttempts) => {
    setSelectedExercise(exercise);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Explanations</h1>
        <p className="text-muted-foreground">
          View AI-generated explanations for your children's exercises
        </p>
      </div>

      {exerciseHistory && exerciseHistory.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exerciseHistory.map((exercise) => (
            <ExplanationCard
              key={exercise.id}
              exercise={exercise}
              childName={getChildName(exercise.user_id)}
              onView={handleViewExplanation}
              onRequestExplanation={handleRequestExplanation}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No explanations yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Explanations will appear here when your children complete exercises and request help.
            </p>
          </CardContent>
        </Card>
      )}

      <ExplanationModal
        open={teaching.open || !!selectedExercise?.explanation}
        onClose={() => {
          teaching.setOpen(false);
          setSelectedExercise(null);
        }}
        loading={teaching.loading}
        sections={
          teaching.sections || 
          (selectedExercise?.explanation && !Array.isArray(selectedExercise.explanation) 
            ? selectedExercise.explanation.explanation_data 
            : null)
        }
        error={teaching.error}
        onTryAgain={() => {}}
        exerciseQuestion={selectedExercise?.exercise_content || ''}
      />
    </div>
  );
}
