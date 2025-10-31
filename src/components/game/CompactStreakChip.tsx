import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CompactStreakChipProps {
  days: number;
  active: boolean;
  className?: string;
}

const CompactStreakChip = ({ days, active, className }: CompactStreakChipProps) => {
  const { t } = useTranslation();

  if (!active || days === 0) return null;

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-game-fire/10 text-game-fire border-0 px-2 py-1 text-xs font-medium",
        className
      )}
    >
      🔥 {days} {t('game.dayStreak')}
    </Badge>
  );
};

export default CompactStreakChip;