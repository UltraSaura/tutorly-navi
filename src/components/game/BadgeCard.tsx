import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeCardProps {
  title: string;
  icon?: React.ReactNode;
  locked?: boolean;
  progress?: number; // 0 to 1
  className?: string;
}

const BadgeCard = ({ title, icon, locked = false, progress, className }: BadgeCardProps) => {
  const progressPercentage = progress ? Math.max(0, Math.min(100, progress * 100)) : 0;

  return (
    <div 
      className={cn(
        "relative w-24 h-24 bg-neutral-surface border-2 rounded-button transition-all duration-200",
        "hover:shadow-md hover:scale-105",
        locked 
          ? "border-neutral-border bg-neutral-bg/50" 
          : progress !== undefined 
            ? "border-brand-primary/30 bg-brand-tint/30"
            : "border-state-success/50 bg-state-success/10",
        className
      )}
      aria-label={`${title} badge${locked ? ' (locked)' : progress !== undefined ? ` (${progressPercentage}% complete)` : ' (earned)'}`}
    >
      {/* Progress ring */}
      {progress !== undefined && !locked && (
        <svg 
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-neutral-border"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${progressPercentage * 2.827} 282.7`}
            className="text-brand-primary transition-all duration-500"
          />
        </svg>
      )}
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
        {/* Icon */}
        <div className={cn(
          "mb-1 transition-all duration-200",
          locked ? "text-neutral-muted" : "text-brand-primary"
        )}>
          {icon || (
            <div className="w-6 h-6 bg-current rounded-full opacity-60" />
          )}
        </div>
        
        {/* Title */}
        <span className={cn(
          "text-caption text-center font-medium leading-tight",
          locked ? "text-neutral-muted" : "text-neutral-text"
        )}>
          {title}
        </span>
      </div>
      
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-surface/80 rounded-button">
          <Lock size={20} className="text-neutral-muted" aria-hidden="true" />
        </div>
      )}
      
      {/* Progress percentage */}
      {progress !== undefined && !locked && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-neutral-surface border border-neutral-border rounded-chip px-2 py-0.5">
          <span className="text-caption font-medium text-neutral-text">
            {progressPercentage}%
          </span>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;