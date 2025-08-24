import React from 'react';
import { Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface XpToastProps {
  amount: number;
  message?: string;
}

const XpToast = ({ amount, message }: XpToastProps) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-game-xp/10 border border-game-xp/20 rounded-button animate-scale-in">
      <div className="flex-shrink-0">
        <div className="relative">
          <Zap 
            size={20} 
            className="text-game-xp" 
            aria-hidden="true"
          />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-game-xp rounded-full animate-ping opacity-75" />
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body font-bold text-game-xp">
            +{amount} XP
          </span>
          {amount >= 100 && (
            <span className="text-caption text-neutral-muted font-medium px-2 py-0.5 bg-neutral-border/50 rounded-chip">
              Great!
            </span>
          )}
        </div>
        
        {message && (
          <p className="text-caption text-neutral-muted mt-1">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Export function to show XP toast
export const showXpToast = (amount: number, message?: string) => {
  toast({
    title: null,
    description: <XpToast amount={amount} message={message} />,
    duration: 3000,
  });
};

export default XpToast;