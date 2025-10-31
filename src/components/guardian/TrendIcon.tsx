import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIconProps {
  trend: "up" | "down" | "flat";
  className?: string;
}

export function TrendIcon({ trend, className = "" }: TrendIconProps) {
  if (trend === "up") {
    return <TrendingUp className={`h-4 w-4 text-green-600 ${className}`} />;
  }
  if (trend === "down") {
    return <TrendingDown className={`h-4 w-4 text-red-600 ${className}`} />;
  }
  return <Minus className={`h-4 w-4 text-muted-foreground ${className}`} />;
}
