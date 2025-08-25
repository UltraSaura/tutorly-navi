import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showXpToast } from '@/components/game/XpToast';
import { Step } from '@/features/explanations/types';
import { Exercise } from '@/types/chat';
import { fetchExplanation } from '@/features/explanations/request';
import { safeParse } from '@/features/explanations/validate';
import ExplanationCards from '@/features/explanations/ExplanationCards';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseRow: Exercise;
  onTryAgain: () => void;
}

const ExplanationModal = ({
  isOpen,
  onClose,
  exerciseRow,
  onTryAgain
}: ExplanationModalProps) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasShownExplanation, setHasShownExplanation] = useState(false);
  
  const handleShowExplanation = async () => {
    if (hasShownExplanation) return; // Already shown
    
    setLoading(true);
    try {
      const response = await fetchExplanation(exerciseRow);
      const parsedSteps = safeParse(response);
      setSteps(parsedSteps.steps);
      setHasShownExplanation(true);
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
      // safeParse will return fallback steps if needed
      const fallbackSteps = safeParse('');
      setSteps(fallbackSteps.steps);
      setHasShownExplanation(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTryAgain = () => {
    onTryAgain();
    showXpToast(5, "Great effort! Keep learning!");
    onClose();
  };

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSteps([]);
      setHasShownExplanation(false);
      setLoading(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        aria-describedby="explanation-description"
      >
        <DialogHeader>
          <DialogTitle className="text-h2 font-semibold text-neutral-text">
            Step-by-step explanation
          </DialogTitle>
        </DialogHeader>
        
        <div 
          id="explanation-description" 
          className="sr-only"
        >
          Interactive explanation with steps to solve this exercise
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          {!hasShownExplanation ? (
            <div className="text-center py-8">
              <Button
                onClick={handleShowExplanation}
                disabled={loading}
                className="bg-brand-primary hover:bg-brand-primary/90 text-neutral-surface"
                size="lg"
              >
                {loading ? 'Loading explanation...' : 'Show explanation'}
              </Button>
            </div>
          ) : (
            <ExplanationCards steps={steps} />
          )}
        </div>
        
        <div className="pt-4 border-t border-neutral-border">
          <Button 
            onClick={handleTryAgain}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-neutral-surface"
            size="lg"
          >
            Try again → +5 XP
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExplanationModal;