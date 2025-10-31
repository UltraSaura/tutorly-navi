import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CompactCoinChipProps {
  coins: number;
  className?: string;
}

const CompactCoinChip = ({ coins, className }: CompactCoinChipProps) => {
  if (coins === 0) return null;

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-game-coin/10 text-game-coin border-0 px-2 py-1 text-xs font-medium",
        className
      )}
    >
      💰 {coins}
    </Badge>
  );
};

export default CompactCoinChip;