import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface XpChipProps {
  level: number;
  xp: number;
  className?: string;
}

const XpChip = ({ level, xp, className }: XpChipProps) => {
  const { t } = useTranslation();

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "bg-[#606dfc] text-white border-0 px-2 py-1 text-xs font-medium",
        className
      )}
    >
      ⭐ {t('game.level')} {level} · {xp} {t('game.xp')}
    </Badge>
  );
};

export default XpChip;