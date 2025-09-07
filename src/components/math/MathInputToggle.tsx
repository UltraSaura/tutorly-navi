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
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn(
        "h-9 w-9 transition-colors",
        isMathMode 
          ? "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20" 
          : "text-neutral-muted hover:text-neutral-text",
        className
      )}
      title={isMathMode ? "Switch to text input" : "Switch to math input"}
    >
      {isMathMode ? (
        <Calculator className="h-4 w-4" />
      ) : (
        <Type className="h-4 w-4" />
      )}
    </Button>
  );
};