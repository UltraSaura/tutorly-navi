import React from 'react';
import { XpBar, StreakChip, CoinWallet } from '@/components/game';

interface GamificationHeaderProps {
  xp: number; // 0 to 1
  level: number;
  streakDays: number;
  streakActive: boolean;
  coins: number;
  className?: string;
}

const GamificationHeader = ({
  xp,
  level,
  streakDays,
  streakActive,
  coins,
  className
}: GamificationHeaderProps) => {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 bg-neutral-surface border-b border-neutral-border ${className || ''}`}>
      <div className="flex-1">
        <XpBar value={xp} level={level} />
      </div>
      
      <div className="flex items-center gap-3">
        <StreakChip days={streakDays} active={streakActive} />
        <CoinWallet coins={coins} />
      </div>
    </div>
  );
};

export default GamificationHeader;