
import React, { useState, useEffect } from 'react';
import { GraduationCap, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import ExerciseCard from '@/components/exercise/ExerciseCard';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { TwoCards } from '@/features/explanations/TwoCards';
import { useUserContext } from '@/hooks/useUserContext';
import XpChip from '@/components/game/XpChip';
import CompactCoinChip from '@/components/game/CompactCoinChip';
import EmptyExerciseState from './EmptyExerciseState';
import { Exercise as ExerciseType } from '@/types/chat';
import { useTranslation } from 'react-i18next'; // <-- Updated import
import { cn } from '@/lib/utils';

interface ExerciseListProps {
  exercises: ExerciseType[];
  grade: {
    percentage: number;
    letter: string;
  };
  toggleExerciseExpansion: (id: string) => void;
  onSubmitAnswer?: (exerciseId: string, answer: string) => void;
  onClearExercises?: () => void;
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  onAddExercise?: () => void;
}

// Utility function to map language codes to full names for AI
const mapLanguageForAI = (languageCode: string): string => {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'fr': 'French'
  };
  return languageMap[languageCode] || 'English';
};

const ExerciseList = ({
  exercises,
  grade,
  toggleExerciseExpansion,
  onSubmitAnswer,
  onClearExercises,
  inputMessage,
  onInputChange,
  onSubmit,
  isLoading,
  onAddExercise
}: ExerciseListProps) => {
  const { t, i18n } = useTranslation(); // <-- Updated hook usage
  const teaching = useTwoCardTeaching();
  const { userContext } = useUserContext();

  // Debug logging for grade props
  console.log('[ExerciseList] Received grade prop:', grade);
  console.log('[ExerciseList] Grade percentage:', grade.percentage, 'Grade letter:', grade.letter);
  
  // Track grade changes
  useEffect(() => {
    console.log('[ExerciseList] Grade changed via useEffect:', grade);
  }, [grade]);
  
  const correctExercises = exercises.filter(ex => ex.isCorrect).length;
  const answeredExercises = exercises.filter(ex => ex.isCorrect !== undefined).length;
  const totalExercises = exercises.length;
  
  // Mock data for gamification (replace with real data from context)
  const userStats = {
    currentLevel: 2,
    currentXp: 250,
    streakDays: 7,
    streakActive: true,
    coins: 245
  };
  
  const getGradeColor = () => {
    if (grade.percentage >= 60) return 'text-state-success';
    return 'text-state-danger';
  };
  
  const handleShowExplanation = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      // Map Exercise fields to the format expected by useTwoCardTeaching
      const exerciseRow = {
        prompt: exercise.question,  // Map 'question' to 'prompt'
        userAnswer: exercise.userAnswer,
        subject: exercise.subjectId || 'math'  // Map 'subjectId' to 'subject'
      };
      
      teaching.openFor(exerciseRow, { 
        response_language: mapLanguageForAI(i18n.resolvedLanguage), // <-- Updated
        grade_level: userContext?.student_level || "High School"
      });
    }
  };
  
  const handleTryAgain = (exerciseId: string) => {
    // Handle retry logic
    console.log('Retrying exercise:', exerciseId);
  };
  
  
  // Convert exercises to ExerciseCard format
  const convertToExerciseCard = (exercise: ExerciseType) => ({
    id: exercise.id,
    subject: 'math' as const, // Default to math, should be determined from exercise data
    prompt: exercise.question,
    userAnswer: exercise.userAnswer,
    explanation: exercise.explanation,
    status: exercise.isCorrect === undefined 
      ? 'unanswered' as const
      : exercise.isCorrect 
        ? 'correct' as const 
        : 'incorrect' as const
  });
  
  return (
    <div className="flex flex-col h-full">
      {/* Simplified Header - Only show when exercises exist */}
      {exercises.length > 0 && (
        <div className="px-6 py-4 border-b border-neutral-border bg-neutral-surface">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <XpChip 
                  level={userStats.currentLevel} 
                  xp={userStats.currentXp}
                />
                <CompactCoinChip coins={userStats.coins} />
              </div>
              
              {onClearExercises && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearExercises}
                  className="text-neutral-muted hover:text-neutral-text"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            
            {/* Performance Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-neutral-muted" />
                <span className="text-body text-neutral-muted">{t('grades.overallGrade')}:</span>
                <span className={cn("text-body font-semibold", getGradeColor())}>
                  {grade.percentage}% ({grade.letter})
                </span>
              </div>
              <div className="text-body text-neutral-muted">
                {correctExercises}/{totalExercises} {t('exercise.correct')}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {exercises.length === 0 ? (
          /* Empty State */
          <EmptyExerciseState
            inputMessage={inputMessage}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            isLoading={isLoading}
            onAddExercise={onAddExercise}
          />
        ) : (
          /* Exercise Cards Grid */
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {exercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      {...convertToExerciseCard(exercise)}
                      onShowExplanation={handleShowExplanation}
                      onTryAgain={handleTryAgain}
                      onSubmitAnswer={onSubmitAnswer}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
      
      {/* Two Card Teaching Modal */}
      {teaching.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border shadow-lg max-h-[95vh] md:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
              <h3 className="font-semibold text-lg text-foreground">{t('exercise.showExplanation')}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => teaching.setOpen(false)}
                className="h-6 w-6"
                aria-label="Close"
              >
                <span className="text-sm">✖</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {teaching.loading ? (
                <div className="space-y-3">
                  <div className="h-16 rounded-xl bg-muted animate-pulse" />
                  <div className="h-16 rounded-xl bg-muted animate-pulse" />
                </div>
              ) : teaching.sections ? (
                <TwoCards s={teaching.sections} />
              ) : (
                <p className="text-sm text-destructive">{teaching.error || "No explanation yet."}</p>
              )}
            </div>

            <div className="p-4 md:p-5 border-t border-border">
              <Button 
                onClick={() => teaching.setOpen(false)}
                className="w-full"
                size="lg"
              >
                {t('exercise.tryAgain')} → +5 XP
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseList;
