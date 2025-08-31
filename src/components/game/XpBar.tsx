import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next'; // <-- Add this import

interface XpBarProps {
  value: number; // 0 to 1
  level: number;
  className?: string;
}

const XpBar = ({ value, level, className }: XpBarProps) => {
  const { t } = useTranslation(); // <-- Add this hook
  const percentage = Math.max(0, Math.min(100, value * 100));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-body font-medium text-neutral-text whitespace-nowrap">
        {t('game.level')} {level} {/* <-- Updated */}
      </span>
      
      <div className="flex-1 relative">
        <div 
          className="h-3 bg-neutral-border rounded-chip overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`XP Progress: ${percentage.toFixed(0)}% complete`}
        >
          <div 
            className="h-full bg-gradient-to-r from-brand-primary to-game-xp transition-all duration-500 ease-out rounded-chip"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Optional XP text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-caption font-medium text-neutral-text/80">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default XpBar;