import React from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinWalletProps {
  coins: number;
  className?: string;
}

const CoinWallet = ({ coins, className }: CoinWalletProps) => {
  const formattedCoins = coins.toLocaleString();

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 bg-game-coin/10 border border-game-coin/20 rounded-button",
        "transition-all duration-200 hover:bg-game-coin/15",
        className
      )}
      aria-label={`${formattedCoins} coins in wallet`}
    >
      <Coins 
        size={18}
        className="text-game-coin"
        aria-hidden="true"
      />
      
      <span className="text-body font-semibold text-neutral-text">
        {formattedCoins}
      </span>
    </div>
  );
};

export default CoinWallet;