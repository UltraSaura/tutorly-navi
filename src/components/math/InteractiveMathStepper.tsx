/**
 * InteractiveMathStepper Component
 * Main component that provides step-by-step math problem solving with visual animations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StepDisplay } from './StepDisplay';
import { InteractiveMathStepperProps, StepperState, MathStep } from '@/utils/mathStepper/types';
import { generateSteps } from '@/utils/mathStepper/stepGenerator';
import { parseExpression } from '@/utils/mathStepper/parser';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  EyeOff,
  Calculator,
  AlertCircle
} from 'lucide-react';

export const InteractiveMathStepper: React.FC<InteractiveMathStepperProps> = ({
  expression,
  className,
  autoPlay = false,
  onStepChange,
  onComplete
}) => {
  const [state, setState] = useState<StepperState>({
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    isPlaying: false,
    showAnswer: false
  });
  
  const [userExpression, setUserExpression] = useState(expression);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate steps when expression changes
  const generateStepsForExpression = useCallback(async (expr: string) => {
    if (!expr.trim()) {
      setState(prev => ({ ...prev, steps: [], totalSteps: 0, currentStep: 0 }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const steps = generateSteps(expr);
      setState(prev => ({
        ...prev,
        steps,
        totalSteps: steps.length,
        currentStep: 0,
        showAnswer: false
      }));
      
      if (autoPlay) {
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid expression');
      setState(prev => ({ ...prev, steps: [], totalSteps: 0, currentStep: 0 }));
    } finally {
      setIsLoading(false);
    }
  }, [autoPlay]);

  // Initial load
  useEffect(() => {
    generateStepsForExpression(expression);
  }, [expression, generateStepsForExpression]);

  // Auto-play functionality
  useEffect(() => {
    if (!state.isPlaying || state.currentStep >= state.totalSteps - 1) {
      return;
    }

    const timer = setTimeout(() => {
      setState(prev => {
        const newStep = prev.currentStep + 1;
        onStepChange?.(newStep);
        return { ...prev, currentStep: newStep };
      });
    }, 2000); // 2 seconds per step

    return () => clearTimeout(timer);
  }, [state.isPlaying, state.currentStep, state.totalSteps, onStepChange]);

  // Complete callback
  useEffect(() => {
    if (state.currentStep >= state.totalSteps - 1 && state.totalSteps > 0) {
      setState(prev => ({ ...prev, isPlaying: false }));
      onComplete?.();
    }
  }, [state.currentStep, state.totalSteps, onComplete]);

  const handlePrevious = () => {
    if (state.currentStep > 0) {
      setState(prev => {
        const newStep = prev.currentStep - 1;
        onStepChange?.(newStep);
        return { ...prev, currentStep: newStep };
      });
    }
  };

  const handleNext = () => {
    if (state.currentStep < state.totalSteps - 1) {
      setState(prev => {
        const newStep = prev.currentStep + 1;
        onStepChange?.(newStep);
        return { ...prev, currentStep: newStep };
      });
    }
  };

  const handlePlayPause = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleReset = () => {
    setState(prev => ({ 
      ...prev, 
      currentStep: 0, 
      isPlaying: false, 
      showAnswer: false 
    }));
    onStepChange?.(0);
  };

  const handleShowAnswer = () => {
    setState(prev => ({ ...prev, showAnswer: !prev.showAnswer }));
  };

  const handleExpressionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateStepsForExpression(userExpression);
  };

  const currentStep = state.steps[state.currentStep];
  const finalResult = state.steps.length > 0 ? state.steps[state.steps.length - 1]?.result : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-blue-600" />
            Interactive Math Stepper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expression Input */}
          <form onSubmit={handleExpressionSubmit} className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Try your own math problem:
            </label>
            <div className="flex gap-2">
              <Input
                value={userExpression}
                onChange={(e) => setUserExpression(e.target.value)}
                placeholder="e.g., 23 + 45, 12 × 8, 100 ÷ 4"
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !userExpression.trim()}>
                {isLoading ? 'Loading...' : 'Solve'}
              </Button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Progress Indicator */}
          {state.totalSteps > 0 && (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                Step {state.currentStep + 1} of {state.totalSteps}
              </Badge>
              {finalResult !== null && (
                <Badge variant="secondary" className="text-sm">
                  Answer: {finalResult.toFixed(2)}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {state.totalSteps > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={state.currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={state.currentStep >= state.totalSteps - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={state.totalSteps <= 1}
                >
                  {state.isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {state.isPlaying ? 'Pause' : 'Play'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowAnswer}
                >
                  {state.showAnswer ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {state.showAnswer ? 'Hide' : 'Show'} Answer
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Display */}
      {currentStep && (
        <StepDisplay
          step={currentStep}
          isActive={true}
        />
      )}

      {/* Final Answer Card */}
      {state.showAnswer && finalResult !== null && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-2">
                🎉 Final Answer
              </h3>
              <div className="text-2xl font-mono font-bold text-green-900 dark:text-green-100">
                {finalResult.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <h4 className="font-semibold mb-2">💡 Tips:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use + for addition, - for subtraction, × or * for multiplication</li>
              <li>Use ÷ or / for division, % for percentages</li>
              <li>Use parentheses () for grouping: (12 + 3) × 4</li>
              <li>Try the Play button to see steps automatically</li>
              <li>Use Show Answer to see the final result</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
