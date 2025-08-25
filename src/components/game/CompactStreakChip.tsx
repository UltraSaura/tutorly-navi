import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CompactStreakChipProps {
  days: number;
  active: boolean;
  className?: string;
}

const CompactStreakChip = ({ days, active, className }: CompactStreakChipProps) => {
  if (!active || days === 0) return null;

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-game-fire/10 text-game-fire border-0 px-2 py-1 text-xs font-medium",
        className
      )}
    >
      🔥 {days} day streak
    </Badge>
  );
};

export default CompactStreakChip;