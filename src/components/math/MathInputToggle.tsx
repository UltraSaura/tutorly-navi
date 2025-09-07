import React from 'react';
import { Calculator, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MathInputToggleProps {
  isMathMode: boolean;
  onToggle: () => void;
  className?: string;
}

export const MathInputToggle = ({ 
  isMathMode, 
  onToggle, 
  className 
}: MathInputToggleProps) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn(
        "h-9 w-9 text-neutral-muted hover:text-neutral-text hover:bg-neutral-surface",
        className
      )}
      title={isMathMode ? "Switch to text mode" : "Switch to math mode"}
    >
      {isMathMode ? <Type className="h-4 w-4" /> : <Calculator className="h-4 w-4" />}
    </Button>
  );
};