import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface StreakChipProps {
  days: number;
  active: boolean;
  className?: string;
}

const StreakChip = ({ days, active, className }: StreakChipProps) => {
  const { t } = useTranslation();
  
  if (!active || days === 0) return null;

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-game-fire/10 text-game-fire border-0 px-2 py-1 text-xs font-medium",
        className
      )}
      aria-label={`${days} ${t('game.dayStreak')}${active ? `, ${t('game.active')}` : `, ${t('game.inactive')}`}`}
    >
      🔥 {days} {t('game.dayStreak')}
    </Badge>
  );
};

export default StreakChip;