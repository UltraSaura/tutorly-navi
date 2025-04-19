
import { useExercises } from '@/hooks/useExercises';
import ExerciseList from './chat/ExerciseList';
import { BarChart3, Graduate } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const GradeDashboard = () => {
  const { exercises, grade, toggleExerciseExpansion } = useExercises();

  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Grade Dashboard</h1>
        <p className="text-muted-foreground">Track your academic progress and review your exercises</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
            <Graduate className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{grade.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              Grade: {grade.letter}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercise Statistics</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{correctExercises}/{completedExercises}</div>
            <p className="text-xs text-muted-foreground">
              {totalExercises} total exercises • {completedExercises} attempted
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exercise List</CardTitle>
          <CardDescription>
            Review your submitted exercises and their feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExerciseList
            exercises={exercises}
            grade={grade}
            toggleExerciseExpansion={toggleExerciseExpansion}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeDashboard;
