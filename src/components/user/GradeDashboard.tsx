
import { useExercises } from '@/hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChartBar } from 'lucide-react';
import ExerciseList from './chat/ExerciseList';

const GradeDashboard = () => {
  const { exercises, grade, exercisesBySubject, getExercisesBySubject, toggleExerciseExpansion } = useExercises();
  
  const totalExercises = exercises.length;
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Grade Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress and performance across all subjects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
            <ChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {grade.percentage}% ({grade.letter})
            </div>
            <Progress 
              value={grade.percentage} 
              className="h-2" 
              indicatorClassName={
                grade.percentage >= 90 ? "bg-green-500" :
                grade.percentage >= 80 ? "bg-blue-500" :
                grade.percentage >= 70 ? "bg-yellow-500" :
                "bg-red-500"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercise Statistics</CardTitle>
            <ChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Exercises:</span>
                <span className="font-medium">{totalExercises}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">{answeredExercises}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Correct:</span>
                <span className="font-medium">{correctExercises}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <ChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {answeredExercises > 0
                ? Math.round((correctExercises / answeredExercises) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {correctExercises} correct out of {answeredExercises} answered exercises
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <ExerciseList
          exercises={exercises}
          grade={grade}
          toggleExerciseExpansion={toggleExerciseExpansion}
        />
      </div>
    </div>
  );
};

export default GradeDashboard;
