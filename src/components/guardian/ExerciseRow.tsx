import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';
import { type ExerciseHistoryWithAttempts } from '@/types/exercise-history';
import { ExerciseTimeline } from './ExerciseTimeline';
import { ExplanationModal } from '@/features/explanations/ExplanationModal';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
interface ExerciseRowProps {
  exercise: ExerciseHistoryWithAttempts;
  allAttempts: ExerciseHistoryWithAttempts[];
  childId: string;
}
export function ExerciseRow({
  exercise,
  allAttempts,
  childId
}: ExerciseRowProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const teaching = useTwoCardTeaching();
  const hasMultipleAttempts = allAttempts.length > 1;

  // Status badge
  const getStatusBadge = () => {
    if (exercise.is_correct === true) {
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Correct</Badge>;
    } else if (exercise.is_correct === false) {
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">Incorrect</Badge>;
    } else {
      return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Partially correct</Badge>;
    }
  };

  // Calculate score percentage
  const score = exercise.is_correct ? 100 : 0;

  // Handle explanation request
  const handleViewExplanation = () => {
    if (exercise.explanation) {
      setShowExplanationModal(true);
    } else {
      // Use the teaching hook to generate explanation
      teaching.openFor({
        exercise_content: exercise.exercise_content,
        userAnswer: exercise.user_answer,
        subject: exercise.subject_id
      }, {
        response_language: 'English',
        grade_level: 'High School'
      });
    }
  };

  // Quick text summary
  const handleQuickSummary = () => {
    const explanationData = Array.isArray(exercise.explanation) ? exercise.explanation[0]?.explanation_data : exercise.explanation?.explanation_data;
    if (!explanationData) {
      toast({
        title: "No explanation available",
        description: "Click 'View explanation' to generate one.",
        variant: "destructive"
      });
      return;
    }
    const summary = `
📖 Concept: ${explanationData.concept || 'N/A'}

🎯 Strategy: ${explanationData.strategy || 'N/A'}

⚠️ Common Pitfall: ${explanationData.pitfall || 'N/A'}
    `.trim();
    toast({
      title: "Quick Summary",
      description: summary,
      duration: 8000
    });
  };
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };
  return <>
      <Card className="py-4 px-0 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          {/* Main row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Subject chip */}
            <Badge variant="outline" className="w-fit">
              {exercise.subject_id || 'General'}
            </Badge>

            {/* Exercise title */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {exercise.exercise_content.substring(0, 80)}
                {exercise.exercise_content.length > 80 ? '...' : ''}
              </p>
            </div>

            {/* Status and metrics */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {hasMultipleAttempts && <Badge variant="outline" className="text-xs">
                  Retried ×{allAttempts.length}
                </Badge>}
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Attempts: <span className="font-semibold text-foreground">{exercise.attempts_count}</span></span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{format(new Date(exercise.created_at), 'MMM d, h:mm a')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleViewExplanation} className="text-xs">
              <ImageIcon className="h-3 w-3 mr-1" />
              View explanation
            </Button>

            

            {hasMultipleAttempts && <Button variant="ghost" size="sm" onClick={() => setShowTimeline(!showTimeline)} className="text-xs ml-auto">
                {showTimeline ? <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide history
                  </> : <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show history
                  </>}
              </Button>}
          </div>

          {/* Timeline (collapsible) */}
          {showTimeline && hasMultipleAttempts && <ExerciseTimeline attempts={allAttempts} />}
        </div>
      </Card>

      {/* Explanation Modal - use teaching hook's state */}
      <ExplanationModal open={teaching.open || showExplanationModal} onClose={() => {
      teaching.setOpen(false);
      setShowExplanationModal(false);
    }} loading={teaching.loading} sections={teaching.sections || (Array.isArray(exercise.explanation) ? exercise.explanation[0]?.explanation_data : exercise.explanation?.explanation_data)} error={teaching.error} exerciseQuestion={exercise.exercise_content} imageUrl={Array.isArray(exercise.explanation) ? exercise.explanation[0]?.explanation_image_url : exercise.explanation?.explanation_image_url} />
    </>;
}