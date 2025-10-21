/**
 * StepDisplay Component
 * Displays individual steps with visual representation and explanation
 */

import React from 'react';
import { StepDisplayProps } from '@/utils/mathStepper/types';
import { OperationGrid } from './OperationGrid';
import { cn } from '@/lib/utils';

export const StepDisplay: React.FC<StepDisplayProps> = ({ 
  step, 
  isActive, 
  className 
}) => {
  const { stepNumber, description, visualData, explanation } = step;
  
  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all duration-300",
        isActive 
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md" 
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
        className
      )}
    >
      {/* Step Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
          isActive 
            ? "bg-blue-500 text-white" 
            : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
        )}>
          {stepNumber}
        </div>
        <h3 className={cn(
          "font-semibold text-sm",
          isActive 
            ? "text-blue-800 dark:text-blue-200" 
            : "text-gray-700 dark:text-gray-300"
        )}>
          {description}
        </h3>
      </div>
      
      {/* Visual Representation */}
      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
        <OperationGrid visualData={visualData} />
      </div>
      
      {/* Explanation */}
      <div className={cn(
        "text-sm leading-relaxed",
        isActive 
          ? "text-blue-700 dark:text-blue-300" 
          : "text-gray-600 dark:text-gray-400"
      )}>
        {explanation}
      </div>
    </div>
  );
};
