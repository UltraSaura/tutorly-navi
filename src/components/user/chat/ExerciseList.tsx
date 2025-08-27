
import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import ExerciseCard from '@/components/exercise/ExerciseCard';
import { useTwoCardTeaching } from '@/features/explanations/useTwoCardTeaching';
import { TwoCards } from '@/features/explanations/TwoCards';
import { useUserContext } from '@/hooks/useUserContext';
import XpChip from '@/components/game/XpChip';
import CompactStreakChip from '@/components/game/CompactStreakChip';
import CompactCoinChip from '@/components/game/CompactCoinChip';
import { Exercise as ExerciseType } from '@/types/chat';
import { useLanguage } from '@/context/SimpleLanguageContext';
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
}

const ExerciseList = ({
  exercises,
  grade,
  toggleExerciseExpansion,
  onSubmitAnswer,
  onClearExercises
}: ExerciseListProps) => {
  const { t } = useLanguage();
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
      teaching.openFor(exercise, { 
        response_language: "English", // Default language - should be from user profile
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
      {/* Compact 3-Line Header */}
      <div className="px-6 py-4 border-b border-neutral-border bg-neutral-surface">
        <div className="max-w-6xl mx-auto space-y-2">
          {/* Line 1: Title */}
          <div className="flex items-center justify-between">
            <h1 className="text-h2 font-bold text-neutral-text">{t('exercise.exerciseList')}</h1>
            {exercises.length > 0 && onClearExercises && (
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
          
          {/* Line 2: Motivation Row (conditional) */}
          <div className="flex items-center gap-3">
            <XpChip 
              level={userStats.currentLevel} 
              xp={userStats.currentXp}
            />
            <CompactStreakChip 
              days={userStats.streakDays} 
              active={userStats.streakActive} 
            />
            <CompactCoinChip coins={userStats.coins} />
          </div>
          
          {/* Line 3: Performance Summary */}
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
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {exercises.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-48 h-48 mb-6 bg-neutral-bg rounded-card flex items-center justify-center">
                  <BookOpen size={80} className="text-neutral-muted" />
                </div>
                
                <h3 className="text-h2 font-bold text-neutral-text mb-3">
                  {t('exercise.noExercises')}
                </h3>
                
                <p className="text-body text-neutral-muted mb-8 max-w-md">
                  {t('grades.exerciseListDescription')}
                </p>
              </div>
            ) : (
              /* Exercise Cards Grid */
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
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Two Card Teaching Modal */}
      {teaching.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{t('exercise.showExplanation')}</h3>
              <button onClick={() => teaching.setOpen(false)}>✖</button>
            </div>

            {teaching.loading ? (
              <div className="mt-4 space-y-3">
                <div className="h-16 rounded-xl bg-muted animate-pulse" />
                <div className="h-16 rounded-xl bg-muted animate-pulse" />
              </div>
            ) : teaching.sections ? (
              <div className="mt-4">
                <TwoCards s={teaching.sections} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-destructive">{teaching.error || "No explanation yet."}</p>
            )}

            <div className="mt-6">
              <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium">
                {t('exercise.tryAgain')} → +5 XP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseList;
