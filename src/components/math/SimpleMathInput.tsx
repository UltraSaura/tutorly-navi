import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SimpleMathInputProps {
  value?: string;
  onChange?: (latex: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SimpleMathInput = ({
  value = '',
  onChange,
  onEnter,
  placeholder = '',
  className,
  disabled = false
}: SimpleMathInputProps) => {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter?.();
    }
  };

  const insertSymbol = (symbol: string) => {
    const newValue = inputValue + symbol;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      
      {/* Simple math symbols toolbar */}
      <div className="flex flex-wrap gap-1">
        {['+', '-', '×', '÷', '=', '(', ')', '²', '√', 'π'].map((symbol) => (
          <Button
            key={symbol}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertSymbol(symbol)}
            disabled={disabled}
            className="h-8 w-8 p-0 text-sm"
          >
            {symbol}
          </Button>
        ))}
      </div>
    </div>
  );
}; 