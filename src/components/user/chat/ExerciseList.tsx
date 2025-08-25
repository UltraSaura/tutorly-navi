
import React, { useState } from 'react';
import { BookOpen, Upload, MessageCircleQuestion, GraduationCap, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import ExerciseCard from '@/components/exercise/ExerciseCard';
import ExplanationModal from '@/components/exercise/ExplanationModal';
import ExerciseComposer from '@/components/exercise/ExerciseComposer';
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
  onSubmitQuestion?: (question: string) => void;
  onUploadHomework?: () => void;
}

const ExerciseList = ({
  exercises,
  grade,
  toggleExerciseExpansion,
  onSubmitAnswer,
  onClearExercises,
  onSubmitQuestion,
  onUploadHomework
}: ExerciseListProps) => {
  const { t } = useLanguage();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  
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
  
  // Mock explanation steps
  const mockExplanationSteps = [
    {
      title: "Analyze the problem",
      body: "First, identify what type of problem this is and what information you have available.",
      icon: "magnifier"
    },
    {
      title: "Break down the steps",
      body: "Divide the problem into smaller, manageable parts that you can solve one at a time.",
      icon: "checklist" 
    },
    {
      title: "Apply the method",
      body: "Use the appropriate mathematical or logical method to solve each part of the problem.",
      icon: "divide"
    },
    {
      title: "Verify your answer",
      body: "Check your work by substituting your answer back into the original problem.",
      icon: "check"
    }
  ];
  
  const getGradeColor = () => {
    if (grade.percentage >= 60) return 'text-state-success';
    return 'text-state-danger';
  };
  
  const handleShowExplanation = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    setShowExplanationModal(true);
  };
  
  const handleTryAgain = (exerciseId: string) => {
    // Handle retry logic
    console.log('Retrying exercise:', exerciseId);
    setShowExplanationModal(false);
  };
  
  const handleSubmitQuestion = async (question: string) => {
    if (onSubmitQuestion) {
      await onSubmitQuestion(question);
    }
  };
  
  const handleUpload = () => {
    if (onUploadHomework) {
      onUploadHomework();
    }
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
        : 'incorrect' as const,
    score: exercise.isCorrect !== undefined ? {
      got: exercise.isCorrect ? 1 : 0,
      total: 1
    } : undefined
  });
  
  return (
    <div className="flex flex-col h-full">
      {/* Compact 3-Line Header */}
      <div className="px-6 py-4 border-b border-neutral-border bg-neutral-surface">
        <div className="max-w-6xl mx-auto space-y-2">
          {/* Line 1: Title */}
          <div className="flex items-center justify-between">
            <h1 className="text-h2 font-bold text-neutral-text">Exercise List</h1>
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
              <span className="text-body text-neutral-muted">Overall Grade:</span>
              <span className={cn("text-body font-semibold", getGradeColor())}>
                {grade.percentage}%
              </span>
            </div>
            <div className="text-body text-neutral-muted">
              {correctExercises}/{totalExercises} correct
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
                  No exercises yet
                </h3>
                
                <p className="text-body text-neutral-muted mb-8 max-w-md">
                  No exercises yet. Upload your first homework to get started!
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    size="lg"
                    onClick={handleUpload}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-neutral-surface"
                  >
                    <Upload className="mr-2" size={20} />
                    + Upload homework
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => handleSubmitQuestion('')}
                    className="border-neutral-border text-neutral-text hover:bg-neutral-bg"
                  >
                    <MessageCircleQuestion className="mr-2" size={20} />
                    Ask a question
                  </Button>
                </div>
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
      
      {/* Footer Composer */}
      <ExerciseComposer
        onSubmitQuestion={handleSubmitQuestion}
        onUpload={handleUpload}
        disabled={false}
      />
      
      {/* Explanation Modal */}
      <ExplanationModal
        isOpen={showExplanationModal}
        onClose={() => setShowExplanationModal(false)}
        steps={mockExplanationSteps}
        onTryAgain={() => handleTryAgain(selectedExerciseId || '')}
      />
    </div>
  );
};

export default ExerciseList;
