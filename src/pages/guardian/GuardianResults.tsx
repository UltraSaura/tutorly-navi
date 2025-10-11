import { useState } from 'react';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianExerciseHistory } from '@/hooks/useGuardianExerciseHistory';
import ResultsSummary from '@/components/guardian/ResultsSummary';
import ResultsFilter from '@/components/guardian/ResultsFilter';
import ExerciseResultCard from '@/components/guardian/ExerciseResultCard';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function GuardianResults() {
  const { guardianId } = useGuardianAuth();
  const [selectedChild, setSelectedChild] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [correctnessFilter, setCorrectnessFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { children, exerciseHistory, loading, stats } = useGuardianExerciseHistory({
    guardianId,
    childId: selectedChild === 'all' ? undefined : selectedChild,
    subjectId: subjectFilter === 'all' ? undefined : subjectFilter,
    dateFrom,
    dateTo,
    isCorrect: correctnessFilter === 'all' 
      ? undefined 
      : correctnessFilter === 'correct',
  });

  const handleReset = () => {
    setSelectedChild('all');
    setSubjectFilter('all');
    setCorrectnessFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getChildName = (userId: string) => {
    const child = children.find((c) => c.user_id === userId);
    return child ? `${child.firstName} ${child.lastName}` : undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Exercise Results</h1>
        <p className="text-muted-foreground mt-2">
          View and track your children's exercise performance
        </p>
      </div>

      <ResultsSummary
        totalExercises={stats.totalExercises}
        correctExercises={stats.correctExercises}
        totalAttempts={stats.totalAttempts}
        successRate={stats.successRate}
      />

      <Card>
        <CardContent className="pt-6">
          <ResultsFilter
            children={children}
            selectedChild={selectedChild}
            onChildChange={setSelectedChild}
            subjectFilter={subjectFilter}
            onSubjectChange={setSubjectFilter}
            correctnessFilter={correctnessFilter}
            onCorrectnessChange={setCorrectnessFilter}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            onReset={handleReset}
          />
        </CardContent>
      </Card>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center">No children found</p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Add children to your account to start tracking their progress
            </p>
          </CardContent>
        </Card>
      ) : exerciseHistory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center">No exercises found</p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {selectedChild === 'all'
                ? 'Your children haven\'t completed any exercises yet'
                : 'No exercises match the current filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exerciseHistory.map((exercise) => (
            <ExerciseResultCard
              key={exercise.id}
              exercise={exercise}
              childName={selectedChild === 'all' ? getChildName(exercise.user_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
