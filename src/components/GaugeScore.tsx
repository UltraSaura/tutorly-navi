import { useMemo } from 'react';
import { motion } from 'framer-motion';
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
  variant?: 'full' | 'mini';
  trackColor?: string;
  needleColor?: string;
  centerIndicator?: 'emoji' | 'none';
}

// Helper functions
export const clampValue = (value: number): number => 
  Math.max(0, Math.min(100, value));

export const getLevel = (score: number): Level => 
  LEVELS.find(level => score >= level.min && score < level.max) || LEVELS[LEVELS.length - 1];

export const scoreToAngle = (score: number): number => 
  -90 + (score / 100) * 180;

const describeArc = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
};

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

const GaugeScore = ({
  value,
  size = 140,
  thickness = 12,
  className,
  label,
  showLegend = false,
  showValue = false,
  animate = true,
  variant = 'full',
  trackColor = '#e5e7eb',
  needleColor = '#111827',
  centerIndicator = 'emoji'
}: GaugeScoreProps) => {
  const clampedValue = clampValue(value);
  const currentLevel = useMemo(() => getLevel(clampedValue), [clampedValue]);
  const needleAngle = useMemo(() => scoreToAngle(clampedValue), [clampedValue]);

  // Adjust sizes based on variant
  const actualSize = variant === 'mini' ? Math.min(size, 120) : size;
  const actualThickness = variant === 'mini' ? Math.min(thickness, 10) : thickness;
  const emojiSize = variant === 'mini' ? 24 : 40;
  
  const viewBoxSize = actualSize;
  const viewBoxHeight = actualSize * 0.6; // Semi-circle height
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const radius = (viewBoxSize / 2) - actualThickness;
  const needleLength = radius * 0.7;

  // Calculate needle endpoint
  const needleEnd = polarToCartesian(centerX, centerY, needleLength, needleAngle);

  // Generate arcs for each level band
  const levelArcs = useMemo(() => {
    return LEVELS.map((level) => {
      const startAngle = -90 + (level.min / 100) * 180;
      const endAngle = -90 + (level.max / 100) * 180;
      return {
        ...level,
        path: describeArc(centerX, centerY, radius, startAngle, endAngle)
      };
    });
  }, [centerX, centerY, radius]);

  // Track arc (background)
  const trackArc = describeArc(centerX, centerY, radius, -90, 90);

  const ariaLabel = label 
    ? `${label}: ${clampedValue}% (${currentLevel.label})`
    : `${clampedValue}% (${currentLevel.label})`;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg
        width={actualSize}
        height={viewBoxHeight}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxHeight}`}
        role="img"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedValue}
        className="overflow-visible"
      >
        <title>{label ? `${label} Performance Gauge` : 'Performance Gauge'}</title>
        <desc>
          Shows {clampedValue}% success rate, rated as {currentLevel.label}.
          Gauge displays from 0% (left) to 100% (right) with color-coded performance bands.
        </desc>

        {/* Track (background) */}
        <path
          d={trackArc}
          fill="none"
          stroke={trackColor}
          strokeWidth={actualThickness}
          strokeLinecap="round"
        />

        {/* Level bands */}
        {levelArcs.map((level) => (
          <path
            key={level.label}
            d={level.path}
            fill="none"
            stroke={level.color}
            strokeWidth={actualThickness}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}

        {/* Needle */}
        <motion.line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={needleColor}
          strokeWidth={2}
          strokeLinecap="round"
          initial={animate ? { x2: centerX, y2: centerY } : undefined}
          animate={{ x2: needleEnd.x, y2: needleEnd.y }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
        />

        {/* Center hub */}
        <circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill={needleColor}
        />

        {/* Emoji indicator */}
        {centerIndicator === 'emoji' && (
          <text
            x={centerX}
            y={centerY - needleLength * 0.3}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={emojiSize}
            style={{ userSelect: 'none' }}
          >
            {currentLevel.emoji}
          </text>
        )}

        {/* Optional value text */}
        {showValue && (
          <text
            x={centerX}
            y={centerY + 20}
            textAnchor="middle"
            fontSize={variant === 'mini' ? 12 : 16}
            fill={needleColor}
            fontWeight="600"
          >
            {clampedValue}%
          </text>
        )}
      </svg>

      {/* Optional legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {LEVELS.map((level) => (
            <div key={level.label} className="flex items-center gap-1 text-xs">
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
};

export default GaugeScore;
