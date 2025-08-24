import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakChipProps {
  days: number;
  active: boolean;
  className?: string;
}

const StreakChip = ({ days, active, className }: StreakChipProps) => {
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-chip transition-all duration-200",
        active 
          ? "bg-game-streak/10 border border-game-streak/20" 
          : "bg-neutral-border/50 border border-neutral-border",
        className
      )}
      aria-label={`${days} day streak${active ? ', active' : ', inactive'}`}
    >
      <Flame 
        size={16}
        className={cn(
          "transition-colors duration-200",
          active ? "text-game-streak" : "text-neutral-muted"
        )}
        aria-hidden="true"
      />
      
      <span 
        className={cn(
          "text-caption font-medium transition-colors duration-200",
          active ? "text-game-streak" : "text-neutral-muted"
        )}
      >
        {days} day streak
      </span>
      
      {active && (
        <div className="w-2 h-2 bg-game-streak rounded-full animate-pulse" />
      )}
    </div>
  );
};

export default StreakChip;