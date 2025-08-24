
import React, { useState } from 'react';
import { BookOpen, Upload, MessageCircleQuestion } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { XpBar, StreakChip, CoinWallet } from '@/components/game';
import ExerciseCard from '@/components/exercise/ExerciseCard';
import ExplanationModal from '@/components/exercise/ExplanationModal';
import ExerciseComposer from '@/components/exercise/ExerciseComposer';
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
  onUploadHomework?: (type: 'document' | 'photo' | 'camera') => void;
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
    xpProgress: 0.7, // 70% to next level
    currentLevel: 5,
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
    if (grade.percentage >= 80) return 'text-state-success';
    if (grade.percentage >= 60) return 'text-game-coin';
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
  
  const handleUpload = (type: 'document' | 'photo' | 'camera') => {
    if (onUploadHomework) {
      onUploadHomework(type);
    }
  };
  
  // Convert exercises to ExerciseCard format
  const convertToExerciseCard = (exercise: ExerciseType) => ({
    id: exercise.id,
    subject: 'math' as const, // Default to math, should be determined from exercise data
    prompt: exercise.question,
    userAnswer: exercise.userAnswer,
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
      {/* Header with Grade and Gamification */}
      <div className="p-6 border-b border-neutral-border bg-neutral-surface">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Grade Section */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <h2 className="text-h1 font-bold text-neutral-text mb-1">
                  Exercise Progress
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-body text-neutral-muted">Overall Grade:</span>
                  <span className={cn("text-h2 font-bold", getGradeColor())}>
                    {grade.percentage}%
                  </span>
                  {grade.letter !== 'N/A' && (
                    <span className="text-body text-neutral-muted">({grade.letter})</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Gamification Stats */}
            <div className="flex flex-wrap items-center gap-4">
              <XpBar 
                value={userStats.xpProgress} 
                level={userStats.currentLevel}
                className="min-w-48"
              />
              <StreakChip 
                days={userStats.streakDays} 
                active={userStats.streakActive} 
              />
              <CoinWallet coins={userStats.coins} />
            </div>
          </div>
          
          {/* Stats Summary */}
          <div className="mt-4 flex justify-center lg:justify-start">
            <div className="text-caption text-neutral-muted">
              {correctExercises} correct • {answeredExercises} completed • {totalExercises} total exercises
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
                  Upload your first homework and earn your First Explorer badge +50 XP!
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    size="lg"
                    onClick={() => handleUpload('document')}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-neutral-surface"
                  >
                    <Upload className="mr-2" size={20} />
                    Upload homework
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
