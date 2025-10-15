import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { type ExerciseHistoryWithAttempts } from '@/types/exercise-history';
import { ExerciseRow } from './ExerciseRow';

interface ExercisesPanelProps {
  exercises: ExerciseHistoryWithAttempts[];
  childId: string;
}

export function ExercisesPanel({ exercises, childId }: ExercisesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [needsAttention, setNeedsAttention] = useState(false);

  // Group exercises by exercise_content to show only the last attempt
  const groupedExercises = useMemo(() => {
    const groups = new Map<string, ExerciseHistoryWithAttempts>();
    
    // Sort by date descending first
    const sorted = [...exercises].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Keep only the latest for each exercise_content
    sorted.forEach((exercise) => {
      if (!groups.has(exercise.exercise_content)) {
        groups.set(exercise.exercise_content, exercise);
      }
    });

    return Array.from(groups.values());
  }, [exercises]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    let filtered = groupedExercises;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((ex) =>
        ex.exercise_content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Needs attention filter (hide correct exercises)
    if (needsAttention) {
      filtered = filtered.filter((ex) => ex.is_correct !== true);
    }

    return filtered;
  }, [groupedExercises, searchQuery, needsAttention]);

  // Get all attempts for a specific exercise
  const getExerciseAttempts = (exerciseContent: string) => {
    return exercises
      .filter((ex) => ex.exercise_content === exerciseContent)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  return (
    <Card className="py-6 px-0.5">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">Exercises</h2>
          <div className="flex items-center gap-2">
            <Checkbox
              id="needs-attention"
              checked={needsAttention}
              onCheckedChange={(checked) => setNeedsAttention(checked === true)}
            />
            <Label htmlFor="needs-attention" className="text-sm cursor-pointer">
              Needs attention
            </Label>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 ml-[10px] mr-[20px]"
          />
        </div>

        {/* Exercise List */}
        <div className="space-y-3">
          {filteredExercises.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {needsAttention
                ? 'No exercises need attention. Great job! 🎉'
                : 'No exercises found'}
            </p>
          ) : (
            filteredExercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                allAttempts={getExerciseAttempts(exercise.exercise_content)}
                childId={childId}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
