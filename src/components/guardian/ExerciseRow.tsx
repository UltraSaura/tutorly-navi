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
import { supabase } from '@/integrations/supabase/client';
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

  // Status badge - Only "Correct" or "Incorrect"
  const getStatusBadge = () => {
    if (exercise.is_correct === true) {
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Correct</Badge>;
    } else {
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">Incorrect</Badge>;
    }
  };

  // Calculate score percentage
  const score = exercise.is_correct ? 100 : 0;

  // Handle explanation request
  const handleViewExplanation = async () => {
    console.log('[ExerciseRow] Opening explanation for:', exercise.exercise_content);
    
    // First, check if we have a cached explanation
    const { data: cachedExplanation, error: cacheError } = await supabase
      .from('exercise_explanations_cache')
      .select('*')
      .eq('exercise_content', exercise.exercise_content)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (cacheError) {
      console.error('[ExerciseRow] Error fetching cached explanation:', cacheError);
    }
    
    if (cachedExplanation?.explanation_data) {
      console.log('[ExerciseRow] ✅ Using cached explanation (no AI call)');
      console.log('[ExerciseRow] Cached explanation data:', cachedExplanation.explanation_data);
      
      // Use cached explanation directly - guardian sees full solution
      console.log('[ExerciseRow] Setting sections with cached data:', cachedExplanation.explanation_data);
      teaching.setSections(cachedExplanation.explanation_data as any);
      teaching.setOpen(true);
      
      // Debug: Check if sections were set
      setTimeout(() => {
        console.log('[ExerciseRow] Teaching sections after setSections:', teaching.sections);
        console.log('[ExerciseRow] Teaching open state:', teaching.open);
      }, 100);
    } else {
      console.log('[ExerciseRow] ⚠️ No cache found, generating new explanation (legacy support)');
      
      // Show loading toast
      toast({
        title: "Generating explanation...",
        description: "This may take a few seconds",
      });
      
      try {
        // Fallback: Generate new explanation for legacy exercises
        await teaching.openFor({
          prompt: exercise.exercise_content,
          userAnswer: exercise.user_answer,
          subject: exercise.subject_id || 'math'
        }, {
          response_language: 'English',
          grade_level: 'High School'
        });
      } catch (error) {
        console.error('Failed to generate explanation:', error);
        toast({
          title: "Failed to generate explanation",
          description: "Please try again later",
          variant: "destructive"
        });
      }
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

🎯 Method: ${explanationData.method || explanationData.strategy || 'N/A'}

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
        <div className="space-y-3 px-4">
          {/* Main row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Subject chip */}
            <Badge variant="outline" className="w-fit">
              {exercise.subject_id || 'General'}
            </Badge>

            {/* Exercise title and student's answer */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground truncate mx-0.5">
                {exercise.exercise_content.substring(0, 80)}
                {exercise.exercise_content.length > 80 ? '...' : ''}
              </p>
              {exercise.user_answer && (
                <div className="flex items-center gap-2 mx-0.5">
                  <span className="text-xs text-muted-foreground">Student's answer:</span>
                  <span className="text-sm font-medium text-foreground">{exercise.user_answer}</span>
                </div>
              )}
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
    }} loading={teaching.loading} sections={(() => {
      const teachingSections = teaching.sections;
      const fallbackSections = Array.isArray(exercise.explanation) ? exercise.explanation[0]?.explanation_data : exercise.explanation?.explanation_data;
      const finalSections = teachingSections || fallbackSections;
      
      console.log('[ExerciseRow] Modal sections debug:', {
        teachingSections: teachingSections ? 'Present' : 'Null',
        fallbackSections: fallbackSections ? 'Present' : 'Null',
        finalSections: finalSections ? 'Present' : 'Null',
        exerciseExplanation: exercise.explanation ? 'Present' : 'Null'
      });
      
      return finalSections;
    })()} error={teaching.error} exerciseQuestion={exercise.exercise_content} imageUrl={Array.isArray(exercise.explanation) ? exercise.explanation[0]?.explanation_image_url : exercise.explanation?.explanation_image_url} />
    </>;
}