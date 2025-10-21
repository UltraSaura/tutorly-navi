/**
 * OperationGrid Component
 * Renders visual representations of math operations with highlights and animations
 */

import React from 'react';
import { VisualStepData, HighlightData, CarryData, BorrowData } from '../utils/mathStepper/types';
import { cn } from '@/lib/utils';

interface OperationGridProps {
  visualData: VisualStepData;
  className?: string;
}

export const OperationGrid: React.FC<OperationGridProps> = ({ visualData, className }) => {
  const { type, layout } = visualData;
  
  const renderColumnLayout = () => {
    const { rows, highlights = [], carries = [], borrows = [] } = layout;
    
    return (
      <div className={cn("font-mono text-center space-y-1", className)}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center items-center">
            {row.split('').map((char, colIndex) => {
              const highlight = highlights.find(h => h.row === rowIndex && h.column === colIndex);
              const carry = carries.find(c => c.fromColumn === colIndex);
              const borrow = borrows.find(b => b.toColumn === colIndex);
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "inline-block px-1 transition-colors duration-300",
                    highlight && `bg-blue-200 dark:bg-blue-800 rounded`,
                    carry && "border-t-2 border-red-500",
                    borrow && "border-b-2 border-orange-500"
                  )}
                >
                  {char}
                </div>
              );
            })}
          </div>
        ))}
        
        {/* Carry/Borrow annotations */}
        {(carries.length > 0 || borrows.length > 0) && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {carries.map((carry, index) => (
              <div key={`carry-${index}`} className="text-red-600 dark:text-red-400">
                {carry.description}
              </div>
            ))}
            {borrows.map((borrow, index) => (
              <div key={`borrow-${index}`} className="text-orange-600 dark:text-orange-400">
                {borrow.description}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const renderGridLayout = () => {
    const { rows, highlights = [] } = layout;
    
    return (
      <div className={cn("font-mono text-center space-y-1", className)}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center items-center">
            {row.split('').map((char, colIndex) => {
              const highlight = highlights.find(h => h.row === rowIndex && h.column === colIndex);
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "inline-block px-1 transition-colors duration-300",
                    highlight && `bg-blue-200 dark:bg-blue-800 rounded`
                  )}
                >
                  {char}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };
  
  const renderLongDivisionLayout = () => {
    const { rows } = layout;
    
    return (
      <div className={cn("font-mono text-center space-y-2", className)}>
        {rows.map((row, index) => (
          <div key={index} className="flex justify-center items-center">
            {row}
          </div>
        ))}
      </div>
    );
  };
  
  const renderPercentageLayout = () => {
    const { rows } = layout;
    
    return (
      <div className={cn("font-mono text-center space-y-2", className)}>
        {rows.map((row, index) => (
          <div key={index} className="flex justify-center items-center">
            {row}
          </div>
        ))}
      </div>
    );
  };
  
  const renderUnaryLayout = () => {
    const { rows } = layout;
    
    return (
      <div className={cn("font-mono text-center space-y-2", className)}>
        {rows.map((row, index) => (
          <div key={index} className="flex justify-center items-center">
            {row}
          </div>
        ))}
      </div>
    );
  };
  
  const renderParenthesesLayout = () => {
    const { rows } = layout;
    
    return (
      <div className={cn("font-mono text-center space-y-2", className)}>
        {rows.map((row, index) => (
          <div key={index} className="flex justify-center items-center">
            {row}
          </div>
        ))}
      </div>
    );
  };
  
  switch (type) {
    case 'column':
      return renderColumnLayout();
    case 'grid':
      return renderGridLayout();
    case 'long-division':
      return renderLongDivisionLayout();
    case 'percentage':
      return renderPercentageLayout();
    case 'unary':
      return renderUnaryLayout();
    case 'parentheses':
      return renderParenthesesLayout();
    default:
      return <div className="text-gray-500">Unknown layout type</div>;
  }
};
