import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface XpChipProps {
  level: number;
  xp: number;
  className?: string;
}

const XpChip = ({ level, xp, className }: XpChipProps) => {
  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-brand-tint text-brand-primary border-0 px-2 py-1 text-xs font-medium",
        className
      )}
    >
      ⭐ Level {level} · {xp} XP
    </Badge>
  );
};

export default XpChip;