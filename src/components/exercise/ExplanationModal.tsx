import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Search, CheckSquare, Divide, Check } from 'lucide-react';
import { showXpToast } from '@/components/game/XpToast';

interface ExplanationStep {
  title: string;
  body: string;
  icon: string;
}

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: ExplanationStep[];
  onTryAgain: () => void;
}

const iconMap = {
  magnifier: Search,
  checklist: CheckSquare,
  divide: Divide,
  check: Check,
};

const ExplanationModal = ({
  isOpen,
  onClose,
  steps,
  onTryAgain
}: ExplanationModalProps) => {
  
  const handleTryAgain = () => {
    onTryAgain();
    showXpToast(5, "Great effort! Keep learning!");
    onClose();
  };

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
          <Accordion type="single" collapsible className="space-y-2">
            {steps.map((step, index) => {
              const IconComponent = iconMap[step.icon as keyof typeof iconMap] || Check;
              
              return (
                <AccordionItem 
                  key={index} 
                  value={`step-${index}`}
                  className="border border-neutral-border rounded-button px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex-shrink-0 w-8 h-8 rounded-chip bg-brand-tint flex items-center justify-center">
                        <IconComponent size={16} className="text-brand-primary" aria-hidden="true" />
                      </div>
                      <span className="text-body font-medium text-neutral-text">
                        {step.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-4">
                    <div className="ml-11 text-body text-neutral-muted leading-relaxed">
                      {step.body}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
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