import { useExercises } from '@/hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartBar } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import ExerciseList from './chat/ExerciseList';
import GradeHistoryChart from './grades/GradeHistoryChart';
import { useState } from 'react';

const GradeDashboard = () => {
  const { exercises, grade, getExercisesBySubject, toggleExerciseExpansion } = useExercises();
  const { subjects } = useAdmin();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  const filteredExercises = selectedSubject 
    ? getExercisesBySubject(selectedSubject)
    : exercises;
  
  const totalExercises = filteredExercises.length;
  const answeredExercises = filteredExercises.filter(ex => ex.isCorrect !== undefined).length;
  const correctExercises = filteredExercises.filter(ex => ex.isCorrect).length;
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Grade Dashboard</h1>
        <p className="text-muted-foreground">
          Track your progress and performance across all subjects
        </p>
      </div>

      <div className="mb-6">
        <Select
          value={selectedSubject || "all"}
          onValueChange={(value) => setSelectedSubject(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
        <GradeHistoryChart exercises={filteredExercises} />
        <div className="grid gap-6">
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
      </div>

      <div className="rounded-lg border bg-card">
        <ExerciseList
          exercises={filteredExercises}
          grade={grade}
          toggleExerciseExpansion={toggleExerciseExpansion}
          subjectId={selectedSubject}
        />
      </div>
    </div>
  );
};

export default GradeDashboard;
