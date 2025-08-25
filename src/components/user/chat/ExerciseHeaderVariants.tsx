import React from 'react';
import { XpBar, StreakChip, CoinWallet } from '@/components/game';
import { cn } from '@/lib/utils';

interface HeaderProps {
  grade: { percentage: number; letter: string };
  userStats: {
    xpProgress: number;
    currentLevel: number;
    streakDays: number;
    streakActive: boolean;
    coins: number;
  };
  exerciseStats: {
    correct: number;
    answered: number;
    total: number;
  };
}

// Variant 1: Compact Horizontal Layout (~80px height)
export const CompactHorizontalHeader = ({ grade, userStats, exerciseStats }: HeaderProps) => {
  const getGradeColor = () => {
    if (grade.percentage >= 80) return 'text-state-success';
    if (grade.percentage >= 60) return 'text-game-coin';
    return 'text-state-danger';
  };

  return (
    <div className="p-3 border-b border-neutral-border bg-neutral-surface">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Grade Section - Compact */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-h2 font-bold text-neutral-text">Exercise Progress</span>
              <span className="text-body text-neutral-muted">•</span>
              <span className="text-body text-neutral-muted">Grade:</span>
              <span className={cn("text-h2 font-bold", getGradeColor())}>
                {grade.percentage}%
              </span>
              {grade.letter !== 'N/A' && (
                <span className="text-body text-neutral-muted">({grade.letter})</span>
              )}
            </div>
          </div>
          
          {/* Gamification Stats - Inline */}
          <div className="flex flex-wrap items-center gap-3">
            <XpBar 
              value={userStats.xpProgress} 
              level={userStats.currentLevel}
              className="min-w-36"
            />
            <StreakChip 
              days={userStats.streakDays} 
              active={userStats.streakActive} 
            />
            <CoinWallet coins={userStats.coins} />
          </div>
        </div>
        
        {/* Stats Summary - Inline */}
        <div className="mt-2">
          <div className="text-caption text-neutral-muted text-center lg:text-left">
            {exerciseStats.correct} correct • {exerciseStats.answered} completed • {exerciseStats.total} total
          </div>
        </div>
      </div>
    </div>
  );
};

// Variant 2: Minimal Essential Header (~60px height)
export const MinimalEssentialHeader = ({ grade, userStats, exerciseStats }: HeaderProps) => {
  const getGradeColor = () => {
    if (grade.percentage >= 80) return 'text-state-success';
    if (grade.percentage >= 60) return 'text-game-coin';
    return 'text-state-danger';
  };

  return (
    <div className="p-2 border-b border-neutral-border bg-neutral-surface">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Essential Grade Display */}
          <div className="flex items-center gap-3">
            <span className={cn("text-h2 font-bold", getGradeColor())}>
              {grade.percentage}%
            </span>
            <div className="h-4 w-px bg-neutral-border"></div>
            <div className="text-caption text-neutral-muted">
              {exerciseStats.correct}/{exerciseStats.total} correct
            </div>
          </div>
          
          {/* Compact Gamification */}
          <div className="flex items-center gap-2">
            <XpBar 
              value={userStats.xpProgress} 
              level={userStats.currentLevel}
              className="min-w-32"
            />
            <StreakChip 
              days={userStats.streakDays} 
              active={userStats.streakActive} 
            />
            <CoinWallet coins={userStats.coins} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Variant 3: Ultra-Compact Sticky Bar (~40px height)
export const UltraCompactStickyHeader = ({ grade, userStats, exerciseStats }: HeaderProps) => {
  const getGradeColor = () => {
    if (grade.percentage >= 80) return 'text-state-success';
    if (grade.percentage >= 60) return 'text-game-coin';
    return 'text-state-danger';
  };

  return (
    <div className="sticky top-0 z-10 py-2 px-4 border-b border-neutral-border bg-neutral-surface/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Grade Badge */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1 rounded-chip text-body font-semibold bg-opacity-10 border",
            grade.percentage >= 80 
              ? "bg-state-success/10 border-state-success/20 text-state-success"
              : grade.percentage >= 60
              ? "bg-game-coin/10 border-game-coin/20 text-game-coin"
              : "bg-state-danger/10 border-state-danger/20 text-state-danger"
          )}>
            {grade.percentage}%
          </div>
          <div className="text-caption text-neutral-muted">
            {exerciseStats.correct}/{exerciseStats.total}
          </div>
        </div>
        
        {/* Mini Stats */}
        <div className="flex items-center gap-2">
          {/* Mini XP Progress */}
          <div className="flex items-center gap-2">
            <span className="text-caption text-neutral-muted">L{userStats.currentLevel}</span>
            <div className="w-16 h-2 bg-neutral-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-primary to-game-xp transition-all duration-500"
                style={{ width: `${userStats.xpProgress * 100}%` }}
              />
            </div>
          </div>
          
          {/* Mini Coins */}
          <div className="flex items-center gap-1 px-2 py-1 bg-game-coin/10 rounded-chip">
            <span className="text-caption font-medium text-game-coin">
              {userStats.coins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};