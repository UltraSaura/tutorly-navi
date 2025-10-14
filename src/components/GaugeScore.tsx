import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Level {
  min: number;
  max: number;
  color: string;
  emoji: string;
  label: string;
}

const LEVELS: Level[] = [
  { min: 0, max: 20, color: '#ef4444', emoji: '😡', label: 'Bad' },
  { min: 20, max: 35, color: '#f97316', emoji: '😟', label: 'Poor' },
  { min: 35, max: 50, color: '#f59e0b', emoji: '😐', label: 'Fair' },
  { min: 50, max: 70, color: '#84cc16', emoji: '🙂', label: 'Good' },
  { min: 70, max: 85, color: '#22c55e', emoji: '😀', label: 'Very Good' },
  { min: 85, max: 100, color: '#16a34a', emoji: '🤩', label: 'Excellent' }
];

export interface GaugeScoreProps {
  value: number;
  size?: number;
  thickness?: number;
  className?: string;
  label?: string;
  showLegend?: boolean;
  showValue?: boolean;
  animate?: boolean;
  variant?: "full" | "mini";
  trackColor?: string;
  needleColor?: string;
  centerIndicator?: "emoji" | "none";
}

const clampValue = (value: number): number => Math.max(0, Math.min(100, value));

const getLevel = (score: number): Level => {
  const clamped = clampValue(score);
  return LEVELS.find(level => clamped >= level.min && clamped < level.max) || LEVELS[LEVELS.length - 1];
};

const scoreToAngle = (score: number): number => -90 + (clampValue(score) / 100) * 180;

const describeArc = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
};

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

export function GaugeScore({
  value,
  size = 140,
  thickness = 12,
  className,
  label,
  showLegend = false,
  showValue = false,
  animate = true,
  variant = "full",
  trackColor = "#e5e7eb",
  needleColor = "#111827",
  centerIndicator = "emoji"
}: GaugeScoreProps) {
  const clampedValue = clampValue(value);
  const currentLevel = getLevel(clampedValue);
  const needleAngle = scoreToAngle(clampedValue);
  
  const isMini = variant === "mini";
  const actualSize = isMini ? Math.min(size, 80) : size;
  const actualThickness = isMini ? Math.min(thickness, 8) : thickness;
  
  const centerX = actualSize / 2;
  const centerY = actualSize / 2;
  const radius = (actualSize - actualThickness) / 2;
  const needleLength = radius * 0.7;
  
  const viewBoxHeight = actualSize * 0.65;
  
  const bandPaths = useMemo(() => {
    return LEVELS.map(level => {
      const startAngle = -90 + (level.min / 100) * 180;
      const endAngle = -90 + (level.max / 100) * 180;
      return {
        path: describeArc(centerX, centerY, radius, startAngle, endAngle),
        color: level.color
      };
    });
  }, [centerX, centerY, radius]);
  
  const needleEnd = polarToCartesian(centerX, centerY, needleLength, needleAngle);
  
  const emojiSize = isMini ? "text-xl" : "text-4xl";
  
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <svg
        width={actualSize}
        height={viewBoxHeight}
        viewBox={`0 0 ${actualSize} ${viewBoxHeight}`}
        role="img"
        aria-label={`${label || 'Score'}: ${clampedValue}% (${currentLevel.label})`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedValue}
        className="overflow-visible"
      >
        <title>{label || 'Score'} Performance Gauge</title>
        <desc>
          Shows {clampedValue}% success rate, rated as {currentLevel.label}.
          Gauge displays from 0% (left) to 100% (right) with color-coded performance bands.
        </desc>
        
        {/* Track (background) */}
        <path
          d={describeArc(centerX, centerY, radius, -90, 90)}
          fill="none"
          stroke={trackColor}
          strokeWidth={actualThickness}
          strokeLinecap="round"
        />
        
        {/* Color bands */}
        {bandPaths.map((band, index) => (
          <path
            key={index}
            d={band.path}
            fill="none"
            stroke={band.color}
            strokeWidth={actualThickness}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={needleColor}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            transformOrigin: `${centerX}px ${centerY}px`,
            transition: animate ? 'all 0.6s ease-out' : 'none',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
          }}
        />
        
        {/* Center hub */}
        <circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill={needleColor}
        />
        
        {/* Emoji indicator */}
        {centerIndicator === "emoji" && (
          <foreignObject
            x={centerX - actualSize * 0.15}
            y={centerY - actualSize * 0.25}
            width={actualSize * 0.3}
            height={actualSize * 0.3}
          >
            <div className={cn(
              "flex items-center justify-center w-full h-full transition-transform duration-300 hover:scale-110",
              emojiSize
            )}>
              {currentLevel.emoji}
            </div>
          </foreignObject>
        )}
      </svg>
      
      {showValue && (
        <div className="text-sm font-semibold text-muted-foreground">
          {clampedValue}%
        </div>
      )}
      
      {showLegend && (
        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
          {LEVELS.map((level, index) => (
            <div key={index} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: level.color }}
              />
              <span className="text-muted-foreground">{level.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export helper functions for testing
export { clampValue, getLevel, scoreToAngle };
