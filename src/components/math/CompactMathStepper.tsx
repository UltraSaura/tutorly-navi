/**
 * Compact Math Stepper Component
 * A simplified version of the Interactive Math Stepper for modal environments
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildStepsGeneral, type AnimatorStep, computeCols, toPaddedDigits } from '@/utils/mathStepper/animator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw,
  Calculator,
  AlertCircle
} from 'lucide-react';

interface CompactMathStepperProps {
  expression: string;
  className?: string;
}

export const CompactMathStepper: React.FC<CompactMathStepperProps> = ({
  expression,
  className
}) => {
  console.log('[CompactMathStepper] Rendering with expression:', expression);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<AnimatorStep[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateStepperSteps = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('[CompactMathStepper] Processing expression:', expression);
        
        // Generate steps with AST-based animator (default to English locale)
        const generatedSteps = buildStepsGeneral(expression, 'en');
        console.log('[CompactMathStepper] Generated steps:', generatedSteps);
        
        setSteps(generatedSteps);
        setCurrentStep(0);
      } catch (err) {
        console.error('[CompactMathStepper] Error generating steps:', err);
        setError(`Error processing expression: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    generateStepperSteps();
  }, [expression]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsAutoPlaying(false);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  // Detect simple integer addition for two-phase column animation
  const isSimpleAddition = useMemo(() => /^(\s*\d+\s*\+\s*\d+\s*)$/.test(expression), [expression]);
  const isSimpleSubtraction = useMemo(() => /^(\s*\d+\s*-\s*\d+\s*)$/.test(expression), [expression]);
  const isSimpleDivision = useMemo(() => /^(\s*\d+\s*[\/÷]\s*\d+\s*)$/.test(expression), [expression]);
  const isSimpleMultiplication = useMemo(() => /^(\s*\d+\s*[×*]\s*\d+\s*)$/.test(expression), [expression]);

  // Two-phase column animation data (only used if isSimpleAddition)
  const additionData = useMemo(() => {
    if (!isSimpleAddition) return null;
    const parts = expression.split('+');
    const numA = (parts[0] || '0').replace(/[^0-9]/g, '');
    const numB = (parts[1] || '0').replace(/[^0-9]/g, '');
    const addStrings = (s1: string, s2: string): string => {
      let i = s1.length - 1, j = s2.length - 1, carry = 0;
      const out: string[] = [];
      while (i >= 0 || j >= 0 || carry) {
        const d1 = i >= 0 ? s1.charCodeAt(i) - 48 : 0;
        const d2 = j >= 0 ? s2.charCodeAt(j) - 48 : 0;
        const sum = d1 + d2 + carry;
        out.push(String(sum % 10));
        carry = Math.floor(sum / 10);
        i--; j--;
      }
      return out.reverse().join('').replace(/^0+(?!$)/, '');
    };
    const maxLen = Math.max(numA.length, numB.length);
    const padTo = (s: string, len: number) => s.padStart(len, '0').split('').map(Number);
    const aDigits = padTo(numA, maxLen);
    const bDigits = padTo(numB, maxLen);
    const stepsRTL: { index: number; ad: number; bd: number; carryIn: number; raw: number; digit: number; carryOut: number }[] = [];
    let carry = 0;
    for (let i = maxLen - 1; i >= 0; i--) {
      const ad = aDigits[i];
      const bd = bDigits[i];
      const carryIn = carry;
      const raw = ad + bd + carryIn;
      const digit = raw % 10;
      const carryOut = Math.floor(raw / 10);
      stepsRTL.push({ index: i, ad, bd, carryIn, raw, digit, carryOut });
      carry = carryOut;
    }
    const fullResult = addStrings(numA, numB);
    const resLen = fullResult.length;
    const offset = resLen - maxLen;
    const finalCarry = carry;
    const totalColumnPhases = maxLen * 2;
    const maxStep = totalColumnPhases + (finalCarry > 0 ? 1 : 0);
    return { numA, numB, aDigits, bDigits, stepsRTL, fullResult, resLen, offset, finalCarry, totalColumnPhases, maxStep };
  }, [isSimpleAddition, expression]);

  const subtractionData = useMemo(() => {
    if (!isSimpleSubtraction) return null;
    const parts = expression.split('-');
    const numA = (parts[0] || '0').replace(/[^0-9]/g, '');
    const numB = (parts[1] || '0').replace(/[^0-9]/g, '');
    const maxLen = Math.max(numA.length, numB.length);
    const padTo = (s: string, len: number) => s.padStart(len, '0').split('').map(Number);
    let A = padTo(numA, maxLen);
    let B = padTo(numB, maxLen);
    // Ensure we subtract smaller from larger; track sign
    let neg = false;
    const aStr = A.join('');
    const bStr = B.join('');
    if (Number(aStr) < Number(bStr)) { neg = true; [A, B] = [B, A]; }
    const stepsRTL: { index: number; top: number; bottom: number; borrowed: boolean; diff: number }[] = [];
    let borrowCarry = 0;
    for (let i = maxLen - 1; i >= 0; i--) {
      let t = A[i] - borrowCarry;
      const bd = B[i];
      let borrowed = false;
      if (t < bd) { t += 10; borrowCarry = 1; borrowed = true; } else borrowCarry = 0;
      const diff = t - bd;
      stepsRTL.push({ index: i, top: t, bottom: bd, borrowed, diff });
    }
    // Build final result string (without sign yet)
    const resultArr: number[] = new Array(maxLen).fill(0);
    stepsRTL.forEach((s, idx) => {
      const pos = maxLen - 1 - idx;
      resultArr[pos] = s.diff;
    });
    let finalStr = resultArr.join('').replace(/^0+(?!$)/, '');
    if (neg && finalStr !== '0') finalStr = '-' + finalStr;
    const resLen = finalStr.length;
    const offset = resLen - maxLen;
    const totalColumnPhases = maxLen * 2; // even=borrow/show, odd=reveal digit
    const maxStep = totalColumnPhases; // no extra carry step like addition
    return { numA, numB, aDigits: A, bDigits: B, stepsRTL, finalStr, resLen, offset, totalColumnPhases, maxStep };
  }, [isSimpleSubtraction, expression]);

  const divisionData = useMemo(() => {
    if (!isSimpleDivision) return null;
    const parts = expression.split(/[÷\/]/);
    const dividendStr = (parts[0] || '0').replace(/[^0-9]/g, '');
    const divisorStr = (parts[1] || '1').replace(/[^0-9]/g, '');
    const dv = Number(dividendStr || '0');
    const dr = Number(divisorStr || '1');
    if (!Number.isFinite(dv) || !Number.isFinite(dr) || dr === 0) {
      return { error: 'Invalid division' } as any;
    }
    const aStr = Math.abs(dv).toString();
    const bStr = Math.abs(dr).toString();
    const [ai, ad = ''] = aStr.split('.');
    const [bi, bd = ''] = bStr.split('.');
    // scale to ensure 2 decimals in quotient
    const A = (ai + (ad || '') + '0'.repeat(Math.max(0, 2 - (ad || '').length))).replace(/^0+/, '') || '0';
    const B = (bi + (bd || '')).replace(/^0+/, '') || '0';
    const sign = (dv < 0 ? -1 : 1) * (dr < 0 ? -1 : 1);

    // per-digit long division steps
    let remainder = 0;
    let quotient = '';
    const steps: { cur: number; digit: number; newRem: number }[] = [];
    const bNum = Number(B);
    for (let idx = 0; idx < A.length; idx++) {
      const cur = remainder * 10 + (A.charCodeAt(idx) - 48);
      const qd = Math.floor(cur / bNum);
      const newRem = cur - qd * bNum;
      quotient += String(qd);
      remainder = newRem;
      steps.push({ cur, digit: qd, newRem });
    }
    // format quotient to 2dp
    let qStr = quotient.replace(/^0+/, '') || '0';
    if (qStr.length <= 2) qStr = '0'.repeat(3 - qStr.length) + qStr;
    const withDot = qStr.slice(0, qStr.length - 2) + '.' + qStr.slice(qStr.length - 2);
    const finalQuotient = (sign < 0 ? '-' : '') + withDot;
    const resLen = withDot.length;
    const totalPhases = withDot.replace(/[^0-9]/g, '').length; // Count only digit characters for phases
    return { dividendStr, divisorStr, A, B, steps, finalQuotient, resLen, totalPhases };
  }, [isSimpleDivision, expression]);

  const multiplicationData = useMemo(() => {
    if (!isSimpleMultiplication) return null;
    const parts = expression.split(/[×*]/);
    const aIn = (parts[0] || '0').replace(/[^0-9]/g, '') || '0';
    const bIn = (parts[1] || '0').replace(/[^0-9]/g, '') || '0';
    const A = aIn.replace(/^0+/, '') || '0';
    const B = bIn.replace(/^0+/, '') || '0';
    // Partial products from rightmost digit of B
    const partials: string[] = [];
    for (let j = B.length - 1; j >= 0; j--) {
      const bj = B.charCodeAt(j) - 48;
      let carry = 0, row = '';
      for (let i = A.length - 1; i >= 0; i--) {
        const ai = A.charCodeAt(i) - 48;
        const p = ai * bj + carry;
        row = String(p % 10) + row;
        carry = Math.floor(p / 10);
      }
      if (carry) row = String(carry) + row;
      row = row + '0'.repeat((B.length - 1) - j);
      partials.push(row);
    }
    // Sum partials for final result
    const sumWidth = Math.max(...partials.map(p => p.length), A.length, B.length);
    const sumFinal = partials.reduce((acc, cur) => {
      const aPad = acc.padStart(Math.max(acc.length, cur.length), '0');
      const cPad = cur.padStart(Math.max(acc.length, cur.length), '0');
      let carry = 0, outStr = '';
      for (let k = aPad.length - 1; k >= 0; k--) {
        const ssum = (aPad.charCodeAt(k) - 48) + (cPad.charCodeAt(k) - 48) + carry;
        outStr = String(ssum % 10) + outStr;
        carry = Math.floor(ssum / 10);
      }
      return (carry ? String(carry) : '') + outStr;
    }, '0');
    // Phases: reveal each partial line, then final sum line
    const totalPhases = partials.length + 1;
    return { A, B, partials, sumFinal, sumWidth, totalPhases };
  }, [isSimpleMultiplication, expression]);

  // Auto-play effect - supports both animator steps and two-phase addition mode
  useEffect(() => {
    const total = additionData ? additionData.maxStep : subtractionData ? subtractionData.maxStep : multiplicationData ? multiplicationData.totalPhases : divisionData ? divisionData.totalPhases : steps.length - 1;
    if (isAutoPlaying && currentStep < total) {
      const timer = setTimeout(() => {
        setCurrentStep(s => s + 1);
      }, additionData || subtractionData || multiplicationData || divisionData ? 950 : 2000);
      return () => clearTimeout(timer);
    } else if (isAutoPlaying && currentStep >= total) {
      setIsAutoPlaying(false);
    }
  }, [isAutoPlaying, currentStep, steps.length, additionData, subtractionData, multiplicationData, divisionData]);

  if (isLoading) {
    return (
      <div className={cn("p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md", className)}>
        <div className="text-center">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            🧮 Loading Interactive Math Stepper...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md", className)}>
        <div className="text-center">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <div className="text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            Expression: {expression}
          </div>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className={cn("p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md", className)}>
        <div className="text-center">
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            No steps available for this expression
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className={cn("p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
            Step-by-Step Math
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {additionData ? Math.min(currentStep + 1, additionData.maxStep + 1) : subtractionData ? Math.min(currentStep + 1, subtractionData.maxStep) : multiplicationData ? Math.min(currentStep + 1, multiplicationData.totalPhases) : divisionData ? Math.min(currentStep + 1, divisionData.totalPhases) : currentStep + 1}
          {" "}of{" "}
          {additionData ? additionData.maxStep + 1 : subtractionData ? subtractionData.maxStep : multiplicationData ? multiplicationData.totalPhases : divisionData ? divisionData.totalPhases : steps.length}
        </Badge>
      </div>

      {/* Current Step Display */}
      <div className="mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          {additionData ? (
            // Two-phase column addition view
            (() => {
              const { resLen, offset, aDigits, bDigits, fullResult, totalColumnPhases } = additionData;
              const withinColumns = currentStep >= 0 && currentStep < totalColumnPhases;
              const colPhaseIndex = withinColumns ? currentStep : null;
              const colIndexFromRight = withinColumns ? Math.floor((colPhaseIndex as number) / 2) : null;
              const activeInputIndex = withinColumns ? additionData.stepsRTL.length - 1 - (colIndexFromRight as number) : null;
              const activeVisualCol = activeInputIndex != null ? additionData.offset + activeInputIndex : null;

              const carriesToShow = (() => {
                const row = Array(resLen).fill('');
                const strikeRow = Array(resLen).fill(false);
                let carryCount = 0;
                if (withinColumns) {
                  carryCount = Math.floor((colPhaseIndex as number) / 2) + 1;
                } else if (currentStep >= totalColumnPhases) {
                  carryCount = additionData.stepsRTL.length;
                }
                for (let k = 0; k < carryCount; k++) {
                  const inputIndex = additionData.stepsRTL.length - 1 - k;
                  const info = additionData.stepsRTL.find(s => s.index === inputIndex);
                  const visualCol = additionData.offset + inputIndex;
                  if (info && info.carryIn > 0 && visualCol >= 0 && visualCol < resLen) {
                    row[visualCol] = String(info.carryIn);
                    // Mark for strikethrough if this carry has been used (processed in previous steps)
                    if (k < carryCount - 1) {
                      strikeRow[visualCol] = true;
                    }
                  }
                }
                if (currentStep >= totalColumnPhases && additionData.finalCarry > 0) {
                  row[0] = String(additionData.finalCarry);
                }
                return { carries: row, strikes: strikeRow };
              })();

              const revealedStr = (() => {
                const arr = fullResult.split('');
                const out = Array(resLen).fill(' ');
                let digitPhases = 0;
                if (withinColumns) {
                  digitPhases = Math.floor(((colPhaseIndex as number) + 1) / 2);
                } else if (currentStep >= totalColumnPhases) {
                  digitPhases = additionData.stepsRTL.length;
                }
                let toReveal = digitPhases;
                for (let i = resLen - 1; i >= 0; i--) {
                  if (toReveal > 0) {
                    out[i] = arr[i];
                    toReveal--;
                  }
                }
                if (currentStep >= totalColumnPhases && additionData.finalCarry > 0) {
                  out[0] = arr[0];
                }
                return out.join('');
              })();

              return (
                <div className="relative font-mono">
                  {/* Carries row */}
                  <div className="ml-auto grid justify-end min-h-[28px]" style={{ gridTemplateColumns: `repeat(${additionData.resLen}, 2rem)` }}>
                    {carriesToShow.carries.map((val, i) => (
                      <div key={i} className="w-8 text-center text-slate-400 font-semibold">
                        <AnimatePresence>
                          {val && (
                            <motion.div 
                              initial={{ y: -6, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }} 
                              exit={{ opacity: 0 }}
                              className={carriesToShow.strikes[i] ? 'math-stepper-strikethrough carry-used' : ''}
                            >
                              {val}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {/* First number row */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${additionData.resLen}, 2rem)` }}>
                    {Array.from({ length: additionData.resLen }).map((_, i) => {
                      const j = i - offset;
                      return (
                        <div key={i} className="w-8 text-center text-lg md:text-xl">
                          {j >= 0 ? aDigits[j] : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Second number row */}
                  <div className="ml-auto grid justify-end items-center" style={{ gridTemplateColumns: `repeat(${additionData.resLen}, 2rem)` }}>
                    {Array.from({ length: additionData.resLen }).map((_, i) => {
                      const j = i - offset;
                      return (
                        <div key={i} className="w-8 text-center text-lg md:text-xl">
                          {j >= 0 ? bDigits[j] : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div className="my-2 h-[2px] w-full bg-slate-200" />

                  {/* Result row (digit-phase reveal) */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${additionData.resLen}, 2rem)` }}>
                    {revealedStr.split('').map((ch, i) => (
                      <motion.div key={i} className="w-8 text-center text-lg md:text-xl font-bold" initial={{ opacity: 0.2 }} animate={{ opacity: ch.trim() ? 1 : 0.2 }}>
                        {ch}
                      </motion.div>
                    ))}
                  </div>

                  {/* Active column highlight */}
                  <AnimatePresence>
                    {activeVisualCol != null && (
                      <motion.div key={`hl-${activeVisualCol}`} className="pointer-events-none absolute inset-y-4 right-0 grid" style={{ gridTemplateColumns: `repeat(${additionData.resLen}, 2rem)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {Array.from({ length: additionData.resLen }).map((_, i) => (
                          <div key={i} className="w-8 h-[92px]" style={{ gridColumn: `${i + 1} / ${i + 2}` }}>
                            {i === activeVisualCol && (
                              <motion.div className="h-full w-full rounded-xl ring-2 ring-sky-300/90" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} />
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()
          ) : subtractionData ? (
            // French-style subtraction with borrowing indicators
            (() => {
              const { aDigits, bDigits, finalStr, totalColumnPhases, stepsRTL } = subtractionData;
              const n = aDigits.length;
              const withinColumns = currentStep >= 0 && currentStep < totalColumnPhases;
              const colPhaseIndex = withinColumns ? currentStep : null;
              const colIndexFromRight = withinColumns ? Math.floor((colPhaseIndex as number) / 2) : null;
              
              // Get the actual column index being processed (from stepsRTL which goes right-to-left)
              const activeColumnIndex = colIndexFromRight !== null && colIndexFromRight < stepsRTL.length
                ? stepsRTL[colIndexFromRight].index
                : null;

              // Build French-style borrow indicators with strikethrough tracking
              const showBorrow1 = Array(n).fill(false);
              const showBottomPlus1 = Array(n).fill(false);
              const strikeBorrow1 = Array(n).fill(false);
              const strikeBottomPlus1 = Array(n).fill(false);
              
              // Only show borrow indicators for columns we've already processed
              let processedColumns = 0;
              if (withinColumns) {
                processedColumns = Math.floor((colPhaseIndex as number) / 2);
              } else if (currentStep >= totalColumnPhases) {
                processedColumns = stepsRTL.length;
              }
              
              // Process steps from right to left - only show indicators for completed columns
              for (let k = 0; k < processedColumns; k++) {
                const info = stepsRTL[k]; // stepsRTL is already right-to-left
                if (info && info.borrowed) {
                  const colIndex = info.index; // actual column index in the digit array
                  showBorrow1[colIndex] = true;
                  // The "+1" appears on the column to the left (where we borrowed from)
                  if (colIndex > 0) {
                    showBottomPlus1[colIndex - 1] = true;
                  }
                  
                  // Mark for strikethrough if this column has been processed
                  if (k < processedColumns - 1) {
                    strikeBorrow1[colIndex] = true;
                    if (colIndex > 0) {
                      strikeBottomPlus1[colIndex - 1] = true;
                    }
                  }
                }
              }

              // Build result digits array for reveal (RIGHT TO LEFT)
              const resultDigits = (() => {
                // Build result array aligned with input columns
                const out = Array(n).fill(null);
                let digitPhases = 0;
                if (withinColumns) digitPhases = Math.floor(((colPhaseIndex as number) + 1) / 2);
                else if (currentStep >= totalColumnPhases) digitPhases = stepsRTL.length;
                
                // For each completed step, place the result digit in the correct column
                for (let k = 0; k < digitPhases; k++) {
                  const info = stepsRTL[k];
                  if (info) {
                    // The diff from stepsRTL is the result digit for this column
                    out[info.index] = String(info.diff);
                  }
                }
                return out;
              })();

              return (
                <div className="inline-block p-4 bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-700 shadow-sm">
                  {/* Minus sign at left */}
                  <div className="flex items-end gap-3 mb-1">
                    <div className="text-3xl font-bold select-none text-gray-800 dark:text-gray-200">−</div>

                    {/* Columns */}
                    <div
                      className="grid items-start"
                      style={{ gridTemplateColumns: `repeat(${n}, minmax(42px, 1fr))`, gap: "8px" }}
                    >
                      {Array.from({ length: n }).map((_, i) => {
                        const isActive = i === activeColumnIndex;
                        const top = aDigits[i];
                        const bot = bDigits[i];

                        return (
                          <motion.div
                            key={i}
                            className={`relative text-center p-1 rounded-xl border transition-all ${
                              isActive ? "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-700"
                            }`}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            {/* TOP digit with tiny purple '1' in front when borrowing */}
                            <div className="relative text-2xl font-bold leading-none h-8 flex items-center justify-center text-gray-800 dark:text-gray-200">
                              <AnimatePresence>
                                {showBorrow1[i] && (
                                  <motion.span
                                    className={`absolute -left-2 -top-1 text-xs text-purple-600 dark:text-purple-400 font-semibold ${
                                      strikeBorrow1[i] ? 'math-stepper-strikethrough borrow-used' : ''
                                    }`}
                                    aria-hidden
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                  >
                                    1
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <span>{top}</span>
                            </div>

                            {/* divider line (between top and bottom rows) */}
                            <div className="h-[2px] bg-gray-800 dark:bg-gray-200 my-1" />

                            {/* BOTTOM digit with '+1' tied to bottom row (left side) */}
                            <div className="relative text-2xl font-bold leading-none h-8 flex items-center justify-center text-gray-800 dark:text-gray-200">
                              <AnimatePresence>
                                {showBottomPlus1[i] && (
                                  <motion.span
                                    className={`absolute -left-4 -top-1 text-sm text-purple-600 dark:text-purple-400 font-semibold ${
                                      strikeBottomPlus1[i] ? 'math-stepper-strikethrough borrow-used' : ''
                                    }`}
                                    aria-hidden
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                  >
                                    +1
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <span>{bot}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Result underline spanning all columns */}
                  <div className="mt-2 ml-8 h-2">
                    <div className="h-[4px] bg-gray-800 dark:bg-gray-200 rounded" />
                  </div>

                  {/* Result row */}
                  <div
                    className="grid mt-2"
                    style={{ 
                      gridTemplateColumns: `repeat(${n}, minmax(42px, 1fr))`, 
                      gap: "8px", 
                      marginLeft: "34px" 
                    }}
                  >
                    {Array.from({ length: n }).map((_, i) => (
                      <motion.div
                        key={`res-${i}`}
                        className="text-center text-2xl font-bold select-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {resultDigits[i] ? (
                          <motion.span 
                            className="text-green-700 dark:text-green-300"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            {resultDigits[i]}
                          </motion.span>
                        ) : (
                          <span className="text-slate-400">•</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : divisionData ? (
            // Simple long division digit-by-digit reveal
            (() => {
              const { dividendStr, divisorStr, A, B, steps: dSteps, finalQuotient, resLen, totalPhases } = divisionData;
              const revealed = (() => {
                const qStr = finalQuotient;
                const arr = qStr.split('');
                // For division, we want to reveal quotient digits progressively
                // Each step reveals one more digit of the quotient
                const upto = Math.min(currentStep + 1, arr.filter(ch => ch !== '.').length);
                
                // Build revealed string without weird spacing
                let revealedStr = '';
                let digitCount = 0;
                
                for (let i = 0; i < arr.length; i++) {
                  if (arr[i] === '.') {
                    // Show decimal point if we've revealed at least one digit before it
                    if (digitCount > 0) {
                      revealedStr += '.';
                    } else {
                      revealedStr += '?';
                    }
                  } else {
                    if (digitCount < upto) {
                      revealedStr += arr[i];
                      digitCount++;
                    } else {
                      revealedStr += '?'; // Show ? for unrevealed digits
                    }
                  }
                }
                
                return revealedStr;
              })();

              return (
                <div className="relative font-mono">
                  {/* Proper division format: dividend ÷ divisor = quotient */}
                  <div className="text-sm text-slate-600 mb-1">
                    {dividendStr} ÷ {divisorStr} = ?
                  </div>
                  {/* Quotient row reveal */}
                  <div className="text-center text-lg md:text-xl font-bold text-green-700 dark:text-green-300">
                    {revealed}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Long division: reveal one quotient digit per step
                  </div>
                </div>
              );
            })()
          ) : multiplicationData ? (
            // Multiplication partial products then final sum
            (() => {
              const { A, B, partials, sumFinal, sumWidth, totalPhases } = multiplicationData;
              const showFinal = currentStep >= partials.length;
              return (
                <div className="relative font-mono">
                  {/* Top rows */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth}, 2rem)` }}>
                    {A.padStart(sumWidth, ' ').split('').map((ch, i) => (
                      <div key={i} className="w-8 text-center text-lg md:text-xl">{ch.trim()}</div>
                    ))}
                  </div>
                  <div className="ml-auto grid justify-end items-center" style={{ gridTemplateColumns: `repeat(${sumWidth}, 2rem)` }}>
                    {('×' + B.padStart(sumWidth - 1, ' ')).split('').map((ch, i) => (
                      <div key={i} className="w-8 text-center text-lg md:text-xl">{ch.trim()}</div>
                    ))}
                  </div>
                  <div className="my-2 h-[2px] w-full bg-slate-200" />
                  {/* Partial products */}
                  {partials.map((row, idx) => (
                    <div key={idx} className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth}, 2rem)` }}>
                      {row.padStart(sumWidth, ' ').split('').map((ch, i) => (
                        <motion.div key={i} className="w-8 text-center text-lg md:text-xl" initial={{ opacity: 0.2 }} animate={{ opacity: currentStep >= idx + 1 ? 1 : 0.2 }}>
                          {ch.trim()}
                        </motion.div>
                      ))}
                    </div>
                  ))}
                  {/* Final sum row */}
                  <div className="my-2 h-[2px] w-full bg-slate-200" />
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth}, 2rem)` }}>
                    {sumFinal.padStart(sumWidth, ' ').split('').map((ch, i) => (
                      <motion.div key={i} className="w-8 text-center text-lg md:text-xl font-bold" initial={{ opacity: 0.2 }} animate={{ opacity: showFinal ? 1 : 0.2 }}>
                        {ch.trim()}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
            const cols = computeCols(currentStepData);
            const gutter = <div className="w-6" />; // operator gutter
            // Map right-based carries/borrows (1=ones) to left-to-right UI indices
            const carryArray: (number | undefined)[] = Array.from({ length: cols }).map(() => undefined);
            if (currentStepData.carries) {
              Object.entries(currentStepData.carries).forEach(([k, v]) => {
                const fromRight = Number(k); // 1 = ones, 2 = tens, ...
                const uiIndex = Math.max(0, Math.min(cols - 1, cols - fromRight));
                carryArray[uiIndex] = v as number;
              });
            }
            const borrowArray: (number | undefined)[] = Array.from({ length: cols }).map(() => undefined);
            if (currentStepData.borrows) {
              Object.entries(currentStepData.borrows).forEach(([k, v]) => {
                const fromRight = Number(k);
                const uiIndex = Math.max(0, Math.min(cols - 1, cols - fromRight));
                borrowArray[uiIndex] = v as number;
              });
            }
            return (
              <div className="font-mono text-gray-800 dark:text-gray-200">
                {/* Carries/Borrows row above numbers */}
                <div className="flex items-center mb-1">
                  {gutter}
                  {Array.from({ length: cols }).map((_, idx) => (
                    <div key={idx} className="flex-1 text-center text-sm">
                      {carryArray[idx] != null ? (
                        <span className="text-blue-600 dark:text-blue-300">{carryArray[idx]}</span>
                      ) : borrowArray[idx] != null ? (
                        <span className="text-red-600 dark:text-red-300">↘︎1</span>
                      ) : (
                        <span className="opacity-0">0</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Core rows (top, op, bottom, line, result) */}
                {currentStepData.rows.map((row, rIdx) => {
                  const opChar = row.role === 'op' ? row.value.trim().charAt(0) : '';
                  const digits = toPaddedDigits(row.value, cols);
                  return (
                    <div key={rIdx} className="flex items-center">
                      <div className="w-6 text-right pr-1 text-blue-600 dark:text-blue-300">{opChar}</div>
                      {digits.map((d, idx) => (
                        <div key={`${rIdx}-${idx}`} className={`flex-1 flex items-center justify-center ${row.role === 'line' ? 'py-1' : 'py-2'}`}>
                          {row.role === 'line' ? (
                            <div className="w-full h-px bg-blue-200 dark:bg-blue-700 rounded" />
                          ) : (
                            <span className={`text-base ${row.role === 'result' && d.trim().length > 0 ? 'text-green-700 dark:text-green-300' : ''}`}>
                              {d}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Explanation */}
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                  {currentStepData.explanation}
                </div>
              </div>
            );
          })() )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="h-8 px-3"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAutoPlay}
          className="h-8 px-3"
        >
          {isAutoPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
          className="h-8 px-3"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-8 px-3"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${additionData ? ((Math.min(currentStep + 1, additionData.maxStep + 1)) / (additionData.maxStep + 1)) * 100 : subtractionData ? ((Math.min(currentStep + 1, subtractionData.maxStep)) / subtractionData.maxStep) * 100 : multiplicationData ? ((Math.min(currentStep + 1, multiplicationData.totalPhases)) / multiplicationData.totalPhases) * 100 : divisionData ? ((Math.min(currentStep + 1, divisionData.totalPhases)) / divisionData.totalPhases) * 100 : (((currentStep + 1) / steps.length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
