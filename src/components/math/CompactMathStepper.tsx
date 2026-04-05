/**
 * Compact Math Stepper Component
 * A simplified version of the Interactive Math Stepper for modal environments
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildStepsGeneral, type AnimatorStep, computeCols, toPaddedDigits } from '@/utils/mathStepper/animator';
import { calculateSteps, getMaxStepIndex } from '@/utils/flexibleStepCalculator';
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

  // Calculate the max step dynamically based on current operation type
  const getMaxStep = () => {
    // Use the actual multiplication data if available (most accurate)
    if (multiplicationData) {
      const maxStep = multiplicationData.maxStep;
      console.log(`[CompactMathStepper] Using multiplication data: ${multiplicationData.multiplicationSteps.length} steps, max step index: ${maxStep}`);
      return maxStep;
    }
    
    // Use addition data if available
    if (additionData) {
      const maxStep = additionData.maxStep;
      console.log(`[CompactMathStepper] Using addition data: max step ${maxStep}`);
      return maxStep;
    }
    
    // Use subtraction data if available
    if (subtractionData) {
      const maxStep = subtractionData.maxStep - 1; // -1 because steps are 0-indexed
      console.log(`[CompactMathStepper] Using subtraction data: max step ${maxStep}`);
      return maxStep;
    }
    
    // Use division data if available
    if (divisionData) {
      const maxStep = divisionData.totalPhases - 1;
      console.log(`[CompactMathStepper] Using division data: max step ${maxStep}`);
      return maxStep;
    }
    
    // Fallback to flexibleStepCalculator
    const maxStep = getMaxStepIndex(expression);
    const stepCalculation = calculateSteps(expression);
    console.log(`[CompactMathStepper] Using flexibleStepCalculator: Expression: ${expression}, Operation: ${stepCalculation.operationType}, Total Steps: ${stepCalculation.totalSteps}, Max Step Index: ${maxStep}`);
    return maxStep;
  };

  const handleNext = () => {
    const maxStep = getMaxStep();
    if (currentStep < maxStep) {
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
    const dividend = parseInt(dividendStr, 10);
    const divisor = parseInt(divisorStr, 10);
    if (!Number.isFinite(dividend) || !Number.isFinite(divisor) || divisor === 0) {
      return { error: 'Division par zéro impossible' } as any;
    }

    const dDigits = dividendStr.split('');
    const phases: Array<{
      type: 'inspect' | 'writeQuotient' | 'writeProduct' | 'writeRemainder' | 'bringDown' | 'complete';
      partialDividend: number;
      quotientDigit?: number;
      product?: number;
      remainder?: number;
      bringDownDigit?: string;
      quotientSoFar: string;
      workRows: Array<{ value: string; indent: number; type: 'subtract' | 'remainder' | 'partial' }>;
      explanationShort: string;
      explanationTeacher: string;
    }> = [];

    let partial = 0;
    let quotientSoFar = '';
    const workRows: Array<{ value: string; indent: number; type: 'subtract' | 'remainder' | 'partial' }> = [];
    let digitIndex = 0;

    // Build initial partial dividend (may need multiple digits if divisor > first digit)
    while (digitIndex < dDigits.length && partial < divisor) {
      partial = partial * 10 + parseInt(dDigits[digitIndex], 10);
      digitIndex++;
    }

    // Process each division cycle
    let firstCycle = true;
    while (true) {
      const currentIndent = digitIndex - String(partial).length;

      // Phase: inspect
      const inspectRows = [...workRows];
      phases.push({
        type: 'inspect',
        partialDividend: partial,
        quotientSoFar,
        workRows: [...inspectRows],
        explanationShort: `${partial} ÷ ${divisor} = ?`,
        explanationTeacher: firstCycle
          ? (language === 'fr'
            ? `On commence par prendre ${partial} (${partial < 10 ? 'le premier chiffre' : 'les premiers chiffres'} du dividende). Combien de fois ${divisor} entre dans ${partial} ?`
            : `Start with ${partial} (${partial < 10 ? 'the first digit' : 'the first digits'} of the dividend). How many times does ${divisor} go into ${partial}?`)
          : (language === 'fr'
            ? `On obtient ${partial} comme nouveau dividende partiel. Combien de fois ${divisor} entre dans ${partial} ?`
            : `The new partial dividend is ${partial}. How many times does ${divisor} go into ${partial}?`)
      });

      const qDigit = Math.floor(partial / divisor);
      quotientSoFar += String(qDigit);

      // Phase: writeQuotient
      phases.push({
        type: 'writeQuotient',
        partialDividend: partial,
        quotientDigit: qDigit,
        quotientSoFar,
        workRows: [...inspectRows],
        explanationShort: `${partial} ÷ ${divisor} = ${qDigit}`,
        explanationTeacher: language === 'fr'
          ? `${divisor} × ${qDigit} = ${qDigit * divisor}${qDigit * divisor <= partial ? ` ≤ ${partial}` : ''}, donc on écrit ${qDigit} au quotient.`
          : `${divisor} × ${qDigit} = ${qDigit * divisor}${qDigit * divisor <= partial ? ` ≤ ${partial}` : ''}, so write ${qDigit} in the quotient.`
      });

      const product = qDigit * divisor;
      workRows.push({ value: `-${product}`, indent: currentIndent, type: 'subtract' });

      // Phase: writeProduct
      phases.push({
        type: 'writeProduct',
        partialDividend: partial,
        quotientDigit: qDigit,
        product,
        quotientSoFar,
        workRows: [...workRows],
        explanationShort: `${divisor} × ${qDigit} = ${product}`,
        explanationTeacher: language === 'fr'
          ? `On écrit ${product} sous ${partial} et on soustrait : ${partial} − ${product} = ${partial - product}.`
          : `Write ${product} below ${partial} and subtract: ${partial} − ${product} = ${partial - product}.`
      });

      const rem = partial - product;
      workRows.push({ value: String(rem), indent: currentIndent + String(partial).length - String(rem).length, type: 'remainder' });

      // Phase: writeRemainder
      phases.push({
        type: 'writeRemainder',
        partialDividend: partial,
        quotientDigit: qDigit,
        product,
        remainder: rem,
        quotientSoFar,
        workRows: [...workRows],
        explanationShort: `${partial} − ${product} = ${rem}`,
        explanationTeacher: language === 'fr'
          ? `${partial} − ${product} = ${rem}. ${digitIndex < dDigits.length ? 'On descend le chiffre suivant.' : 'Il ne reste plus de chiffre à descendre.'}`
          : `${partial} − ${product} = ${rem}. ${digitIndex < dDigits.length ? 'Bring down the next digit.' : 'No more digits to bring down.'}`
      });

      if (digitIndex >= dDigits.length) break;

      // Phase: bringDown
      const nextDigit = dDigits[digitIndex];
      const newPartial = rem * 10 + parseInt(nextDigit, 10);
      workRows.push({ value: String(newPartial), indent: currentIndent + String(partial).length - String(newPartial).length + 1, type: 'partial' });

      phases.push({
        type: 'bringDown',
        partialDividend: partial,
        remainder: rem,
        bringDownDigit: nextDigit,
        quotientSoFar,
        workRows: [...workRows],
        explanationShort: `On descend ${nextDigit} → ${newPartial}`,
        explanationTeacher: language === 'fr'
          ? `On descend le ${nextDigit} du dividende à côté du reste ${rem}, ce qui donne ${newPartial}.`
          : `Bring down ${nextDigit} from the dividend next to the remainder ${rem}, giving ${newPartial}.`
      });

      partial = newPartial;
      digitIndex++;
      firstCycle = false;
    }

    // Final complete phase
    const finalRemainder = partial - Math.floor(partial / divisor) * divisor;
    phases.push({
      type: 'complete',
      partialDividend: partial,
      quotientSoFar,
      remainder: finalRemainder,
      workRows: [...workRows],
      explanationShort: finalRemainder > 0
        ? `${dividendStr} ÷ ${divisorStr} = ${quotientSoFar} reste ${finalRemainder}`
        : `${dividendStr} ÷ ${divisorStr} = ${quotientSoFar}`,
      explanationTeacher: finalRemainder > 0
        ? `La division est terminée ! ${dividendStr} ÷ ${divisorStr} = ${quotientSoFar} avec un reste de ${finalRemainder}.`
        : `La division est terminée ! ${dividendStr} ÷ ${divisorStr} = ${quotientSoFar} exactement.`
    });

    return { dividendStr, divisorStr, dividend, divisor, phases, quotientSoFar, finalRemainder, totalPhases: phases.length };
  }, [isSimpleDivision, expression]);

  const multiplicationData = useMemo(() => {
    if (!isSimpleMultiplication) return null;
    const parts = expression.split(/[×*]/);
    const aIn = (parts[0] || '0').replace(/[^0-9]/g, '') || '0';
    const bIn = (parts[1] || '0').replace(/[^0-9]/g, '') || '0';
    const A = aIn.replace(/^0+/, '') || '0';
    const B = bIn.replace(/^0+/, '') || '0';
    
    // Enhanced multiplication with detailed step tracking - each digit multiplication is a separate step
    const multiplicationSteps: Array<{
      step: number;
      multiplierDigit: string;
      multiplierPosition: number;
      multiplicandDigit: string;
      multiplicandPosition: number;
      partialResult: string;
      carries: Array<{ position: number; value: number; used: boolean }>;
      explanation: string;
      isPartialProductComplete: boolean;
      partialProduct: string;
      columnPosition?: number;
      contributingDigits?: Array<{
        partialIndex: number;
        digit: string;
        position: number;
      }>;
    }> = [];
    
    // Partial products from rightmost digit of B
    const partials: string[] = [];
    let stepCounter = 0; // Start from 0 for proper step counting
    
    console.log('[CompactMathStepper] Multiplication data generation:', {
      expression,
      A,
      B,
      aIn,
      bIn
    });
    
    for (let j = B.length - 1; j >= 0; j--) {
      const bj = B.charCodeAt(j) - 48;
      let carry = 0;
      let row = '';
      const carries: Array<{ position: number; value: number; used: boolean }> = [];
      
      // Each digit multiplication is a separate step
      for (let i = A.length - 1; i >= 0; i--) {
        const ai = A.charCodeAt(i) - 48;
        const p = ai * bj + carry;
        const digit = p % 10;
        const newCarry = Math.floor(p / 10);
        
        // Check if this is the last digit (leftmost position)
        const isLastDigit = i === 0;
        
        if (isLastDigit) {
          // For the last digit: show the complete result instead of creating a carry
          row = String(p) + row;
          carry = 0; // No carry for the last digit
          
          // Create a step showing the complete result
          multiplicationSteps.push({
            step: stepCounter++,
            multiplierDigit: String(bj),
            multiplierPosition: B.length - 1 - j,
            multiplicandDigit: String(ai),
            multiplicandPosition: A.length - 1 - i,
            partialResult: String(p), // Show complete result
            carries: [], // No carries for the last digit
            explanation: `${ai} × ${bj} + ${carry} = ${p} (write ${p})`,
            isPartialProductComplete: true,
            partialProduct: row
          });
        } else {
          // For intermediate digits: show digit and create carry
          // Track carry for this position
          if (newCarry > 0) {
            carries.push({
              position: A.length - 1 - i,
              value: newCarry,
              used: false
            });
          }
          
          row = String(digit) + row;
          carry = newCarry;
          
          // Create a step for each digit multiplication (right to left order)
          multiplicationSteps.push({
            step: stepCounter++,
            multiplierDigit: String(bj),
            multiplierPosition: B.length - 1 - j,
            multiplicandDigit: String(ai),
            multiplicandPosition: A.length - 1 - i,
            partialResult: String(digit),
            carries: newCarry > 0 ? [{
              position: A.length - 1 - i,
              value: newCarry,
              used: false
            }] : [], // Show carry immediately when generated
            explanation: `${ai} × ${bj} + ${carry} = ${p} (write ${digit}${newCarry > 0 ? `, carry ${newCarry}` : ''})`,
            isPartialProductComplete: false,
            partialProduct: row
          });
        }
      }
      
      // No need for final carry step since last digit handles complete result
      
      // Add trailing zeros for proper positioning
      row = row + '0'.repeat((B.length - 1) - j);
      partials.push(row);
      
      // Debug logging for partial product generation
      console.log(`[PartialProductGeneration] Row ${B.length - 1 - j} (${A} × ${bj}):`, {
        multiplierDigit: bj,
        multiplierPosition: B.length - 1 - j,
        finalRow: row,
        finalCarry: carry,
        stepsGenerated: multiplicationSteps.filter(s => s.multiplierPosition === B.length - 1 - j).length
      });
    }
    
    // Sum partials for final result with carry tracking
    const sumWidth = Math.max(...partials.map(p => p.length), A.length, B.length);
    let sumFinal = '0';
    const sumCarries: Array<{ position: number; value: number; used: boolean }> = [];
    
    for (let p = 0; p < partials.length; p++) {
      const currentPartial = partials[p];
      const accPad = sumFinal.padStart(Math.max(sumFinal.length, currentPartial.length), '0');
      const curPad = currentPartial.padStart(Math.max(sumFinal.length, currentPartial.length), '0');
      
      let carry = 0;
      let outStr = '';
      
      for (let k = accPad.length - 1; k >= 0; k--) {
        const ssum = (accPad.charCodeAt(k) - 48) + (curPad.charCodeAt(k) - 48) + carry;
        const digit = ssum % 10;
        const newCarry = Math.floor(ssum / 10);
        
        if (newCarry > 0) {
          sumCarries.push({
            position: accPad.length - 1 - k,
            value: newCarry,
            used: false
          });
        }
        
        outStr = String(digit) + outStr;
        carry = newCarry;
      }
      
      sumFinal = (carry ? String(carry) : '') + outStr;
    }
    
    // Add final sum steps - digit by digit
    // Break down the final sum calculation into individual digit steps
    const finalSumDigits = sumFinal.split('').reverse(); // Start from rightmost digit
    
    for (let digitIndex = 0; digitIndex < finalSumDigits.length; digitIndex++) {
      const digit = finalSumDigits[digitIndex];
      const position = digitIndex;
      
      // Find relevant carries for this position
      const relevantCarries = sumCarries.filter(carry => carry.position === position);
      
      // Calculate which digits from each partial product contribute to this column
      const contributingDigits = partials.map((partial, partialIndex) => {
        const paddedPartial = partial.padStart(sumFinal.length, '0');
        const digitFromPartial = paddedPartial[sumFinal.length - 1 - position];
        return {
          partialIndex,
          digit: digitFromPartial,
          position
        };
      }).filter(item => item.digit !== '0' || position === 0); // Filter out leading zeros except for ones place
      
      multiplicationSteps.push({
        step: stepCounter++,
        multiplierDigit: '',
        multiplierPosition: -1,
        multiplicandDigit: '',
        multiplicandPosition: -1,
        partialResult: digit,
        carries: relevantCarries,
        columnPosition: position, // NEW: track which column we're adding
        contributingDigits, // NEW: track which partial product digits contribute
        explanation: `Adding column ${position + 1}: ${digit}`,
        isPartialProductComplete: false,
        partialProduct: sumFinal.substring(0, sumFinal.length - digitIndex) // Show progress
      });
    }
    
    // Add final completion step to reach step 17
    multiplicationSteps.push({
      step: stepCounter++,
      multiplierDigit: '',
      multiplierPosition: -1,
      multiplicandDigit: '',
      multiplicandPosition: -1,
      partialResult: '',
      carries: [],
      explanation: `Multiplication complete: ${A} × ${B} = ${sumFinal}`,
      isPartialProductComplete: true,
      partialProduct: sumFinal
    });
    
    // Calculate total phases (each multiplication step + final sum + completion step)
    const totalPhases = multiplicationSteps.length;
    
    // Safety check: ensure partials array is properly populated
    console.log('[CompactMathStepper] Multiplication data validation:', {
      expression,
      partialsLength: partials.length,
      partials: partials,
      BLength: B.length,
      totalPhases,
      multiplicationStepsLength: multiplicationSteps.length,
      maxStep: totalPhases - 1,
      stepCounter: stepCounter,
      finalResult: sumFinal
    });
    
    if (partials.length === 0) {
      console.error('[CompactMathStepper] Empty partials array detected!', {
        A,
        B,
        expression,
        multiplicationSteps
      });
    }
    
    return { 
      A, 
      B, 
      partials, 
      sumFinal, 
      sumWidth, 
      totalPhases,
      multiplicationSteps,
      maxStep: totalPhases - 1
    };
  }, [isSimpleMultiplication, expression]);

  // Auto-play effect - supports both animator steps and two-phase addition mode
  useEffect(() => {
    const maxStep = getMaxStep();
    if (isAutoPlaying && currentStep < maxStep) {
      const timer = setTimeout(() => {
        setCurrentStep(s => s + 1);
      }, additionData || subtractionData || multiplicationData || divisionData ? 950 : 2000);
      return () => clearTimeout(timer);
    } else if (isAutoPlaying && currentStep >= maxStep) {
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
          {currentStep}
          {" "}of{" "}
          {getMaxStep() + 1}
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
                  <div className="ml-auto grid justify-end min-h-[28px]" style={{ gridTemplateColumns: `repeat(${additionData.resLen + 1}, 2rem)` }}>
                    {/* Empty column for operator */}
                    <div className="w-8 text-center text-slate-400 font-semibold"></div>
                    {/* Carries for digits */}
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
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${additionData.resLen + 1}, 2rem)` }}>
                    {/* Empty column for operator */}
                    <div className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200"></div>
                    {/* First number digits */}
                    {Array.from({ length: additionData.resLen }).map((_, i) => {
                      const j = i - offset;
                      return (
                        <div key={i} className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                          {j >= 0 ? aDigits[j] : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Second number row with + operator */}
                  <div className="ml-auto grid justify-end items-center" style={{ gridTemplateColumns: `repeat(${additionData.resLen + 1}, 2rem)` }}>
                    {/* + operator in first column */}
                    <div className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">+</div>
                    {/* Second number digits */}
                    {Array.from({ length: additionData.resLen }).map((_, i) => {
                      const j = i - offset;
                      return (
                        <div key={i} className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                          {j >= 0 ? bDigits[j] : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div className="my-2 h-[2px] w-full bg-slate-200" />

                  {/* Result row (digit-phase reveal) */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${additionData.resLen + 1}, 2rem)` }}>
                    {/* Empty column for operator */}
                    <div className="w-8 text-center text-lg md:text-xl font-bold"></div>
                    {/* Result digits */}
                    {revealedStr.split('').map((ch, i) => (
                      <motion.div key={i} className="w-8 text-center text-lg md:text-xl font-bold" initial={{ opacity: 0.2 }} animate={{ opacity: ch.trim() ? 1 : 0.2 }}>
                        {ch}
                      </motion.div>
                    ))}
                  </div>

                  {/* Active column highlight */}
                  <AnimatePresence>
                    {activeVisualCol != null && (
                      <motion.div key={`hl-${activeVisualCol}`} className="pointer-events-none absolute inset-y-4 right-0 grid" style={{ gridTemplateColumns: `repeat(${additionData.resLen + 1}, 2rem)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {Array.from({ length: additionData.resLen + 1 }).map((_, i) => (
                          <div key={i} className="w-8 h-[92px]" style={{ gridColumn: `${i + 1} / ${i + 2}` }}>
                            {i === activeVisualCol + 1 && (
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
                <div className="relative font-mono">
                  {/* Carries row above minuend - right-aligned like addition */}
                  <div className="ml-auto grid justify-end min-h-[28px]" style={{ gridTemplateColumns: `repeat(${n}, 2rem)` }}>
                    {Array.from({ length: n }).map((_, i) => (
                      <div key={i} className="w-8 text-center text-slate-400 font-semibold">
                        <AnimatePresence>
                          {showBorrow1[i] && (
                            <motion.div 
                              initial={{ y: -6, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }} 
                              exit={{ opacity: 0 }}
                              className={strikeBorrow1[i] ? 'math-stepper-strikethrough borrow-used' : ''}
                            >
                              1
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {/* Minuend row - right-aligned like addition */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${n}, 2rem)` }}>
                    {Array.from({ length: n }).map((_, i) => (
                      <div key={i} className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                        {aDigits[i]}
                        </div>
                    ))}
                  </div>

                  {/* Subtrahend row with minus sign - right-aligned like addition */}
                  <div className="ml-auto grid justify-end items-center" style={{ gridTemplateColumns: `repeat(${n}, 2rem)` }}>
                    {Array.from({ length: n }).map((_, i) => (
                      <div key={i} className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                        {i === 0 ? '−' : ''}{bDigits[i]}
                        </div>
                    ))}
                  </div>

                  {/* Result underline spanning all columns */}
                  <div className="my-2 h-[2px] w-full bg-gray-800 dark:bg-gray-200" />

                  {/* Result row - right-aligned like addition */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${n}, 2rem)` }}>
                    {Array.from({ length: n }).map((_, i) => (
                      <motion.div
                        key={`res-${i}`}
                        className="w-8 text-center text-lg md:text-xl font-bold select-none"
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
            // French-style long division with animated phases
            (() => {
              if (divisionData.error) {
                return <div className="text-center text-red-600 dark:text-red-400">{divisionData.error}</div>;
              }
              const { dividendStr, divisorStr, phases, quotientSoFar: finalQuotient, finalRemainder } = divisionData;
              const phase = phases[Math.min(currentStep, phases.length - 1)];
              const dividendDigits = dividendStr.split('');
              const maxWorkWidth = dividendStr.length + 2; // extra space for indentation

              // Determine which quotient digits to show
              const qDigitsToShow = phase.quotientSoFar || '';

              // Determine which work rows to show
              const visibleWorkRows = phase.workRows || [];

              return (
                <div className="relative font-mono text-base">
                  {/* French division layout: dividend | divisor */}
                  <div className="flex items-start justify-center gap-0">
                    {/* Left side: dividend + working */}
                    <div className="flex flex-col items-end min-w-0">
                      {/* Dividend row */}
                      <div className="flex items-center">
                        {dividendDigits.map((d, i) => (
                          <motion.div
                            key={`dd-${i}`}
                            className={cn(
                              "w-7 h-8 flex items-center justify-center text-lg font-bold",
                              phase.type === 'inspect' && i < String(phase.partialDividend).length + (dividendStr.length - String(phase.partialDividend).length - (qDigitsToShow.length - (phase.quotientDigit !== undefined ? 0 : 0)))
                                ? "text-foreground"
                                : "text-foreground"
                            )}
                          >
                            {d}
                          </motion.div>
                        ))}
                      </div>

                      {/* Working rows (products, remainders, brought-down partials) */}
                      <AnimatePresence>
                        {visibleWorkRows.map((row, idx) => (
                          <motion.div
                            key={`work-${idx}`}
                            className="flex items-center"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          >
                            {/* Indent + value */}
                            {Array.from({ length: maxWorkWidth }).map((_, ci) => {
                              const valueStr = row.value;
                              const startCol = row.indent;
                              const charIdx = ci - startCol;
                              const ch = charIdx >= 0 && charIdx < valueStr.length ? valueStr[charIdx] : '';
                              const isSubtract = row.type === 'subtract';
                              const isRemainder = row.type === 'remainder';
                              const isPartial = row.type === 'partial';
                              const isLastWorkRow = idx === visibleWorkRows.length - 1;
                              return (
                                <div
                                  key={ci}
                                  className={cn(
                                    "w-7 h-7 flex items-center justify-center text-sm",
                                    isSubtract && "text-red-600 dark:text-red-400",
                                    isRemainder && isLastWorkRow && "text-blue-600 dark:text-blue-400 font-bold",
                                    isRemainder && !isLastWorkRow && "text-muted-foreground",
                                    isPartial && isLastWorkRow && "text-blue-600 dark:text-blue-400 font-bold",
                                    isPartial && !isLastWorkRow && "text-muted-foreground"
                                  )}
                                >
                                  {ch}
                                </div>
                              );
                            })}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Vertical bar + divisor/quotient on the right */}
                    <div className="flex flex-col items-start">
                      {/* Divisor row */}
                      <div className="flex items-center h-8">
                        <div className="w-[2px] h-8 bg-foreground mr-1" />
                        <span className="text-lg font-bold text-foreground px-1">{divisorStr}</span>
                      </div>
                      {/* Horizontal line under divisor */}
                      <div className="flex items-center">
                        <div className="w-[2px] bg-transparent mr-1" />
                        <div className="h-[2px] bg-foreground" style={{ width: `${Math.max(divisorStr.length, finalQuotient.length) * 1.75 + 0.5}rem` }} />
                      </div>
                      {/* Quotient appearing progressively */}
                      <div className="flex items-center">
                        <div className="w-[2px] bg-transparent mr-1" />
                        <div className="flex">
                          {qDigitsToShow.split('').map((qd, qi) => (
                            <motion.div
                              key={`q-${qi}`}
                              className="w-7 h-7 flex items-center justify-center text-lg font-bold text-green-700 dark:text-green-300"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              {qd}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      {/* Final remainder display */}
                      {phase.type === 'complete' && finalRemainder > 0 && (
                        <motion.div
                          className="flex items-center mt-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div className="w-[2px] bg-transparent mr-1" />
                          <span className="text-xs text-muted-foreground">r. {finalRemainder}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Explanation panel */}
                  <div className="mt-3">
                    <motion.div
                      key={`exp-${currentStep}`}
                      className="text-sm text-center text-muted-foreground leading-relaxed px-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {phase.explanationTeacher}
                    </motion.div>
                  </div>
                </div>
              );
            })()
          ) : multiplicationData ? (
            // Enhanced multiplication with true step-by-step reveal
            (() => {
              const { A, B, partials, sumFinal, sumWidth, multiplicationSteps, maxStep } = multiplicationData;
              
              // Safety check: ensure all required data exists
              if (!A || !B || !partials || !Array.isArray(partials) || !multiplicationSteps || !Array.isArray(multiplicationSteps)) {
                console.error('[CompactMathStepper] Invalid multiplication data:', {
                  A,
                  B,
                  partials,
                  multiplicationSteps,
                  multiplicationData
                });
                return (
                  <div className="text-center text-red-600 dark:text-red-400">
                    Error: Invalid multiplication data
                  </div>
                );
              }
              
              const currentStepData = currentStep > 0 ? multiplicationSteps[currentStep - 1] : null; // Adjust for 0-based indexing
              
              // Handle step 0 (initial problem setup)
              if (currentStep === 0) {
              return (
                <div className="relative font-mono">
                    {/* Top multiplicand */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                    <div className="w-8" />
                    {A.padStart(sumWidth, ' ').split('').map((ch, i) => (
                      <div key={i} className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                        {ch.trim()}
                      </div>
                    ))}
                  </div>
                    
                    {/* Multiplier with × symbol */}
                  <div className="ml-auto grid justify-end items-center" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                    <div className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">×</div>
                    {B.padStart(sumWidth, ' ').split('').map((ch, i) => (
                      <div key={i} className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">
                        {ch.trim()}
                      </div>
                    ))}
                  </div>
                    
                    {/* Horizontal line */}
                    <div className="my-2 h-[2px] w-full bg-gray-800 dark:bg-gray-200" />
                    
                    {/* Placeholder rows for partial products */}
                    {partials.map((_, idx) => (
                      <div key={idx} className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                        <div className="w-8" />
                        {Array(sumWidth).fill('').map((_, i) => (
                          <div key={i} className="w-8 text-center text-lg md:text-xl text-gray-300 dark:text-gray-600">•</div>
                        ))}
                      </div>
                    ))}
                    
                    {/* Final sum line */}
                    <div className="my-2 h-[2px] w-full bg-gray-800 dark:bg-gray-200" />
                    
                    {/* Placeholder for final sum */}
                    <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                      <div className="w-8" />
                      {Array(sumWidth).fill('').map((_, i) => (
                        <div key={i} className="w-8 text-center text-lg md:text-xl text-gray-300 dark:text-gray-600">•</div>
                      ))}
                    </div>
                    
                    {/* Initial explanation */}
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                      Ready to multiply {A} × {B} step by step
                    </div>
                  </div>
                );
              }
              
              // For actual multiplication steps, show progressive reveal from RIGHT to LEFT
              const getCurrentPartialProduct = () => {
                if (!currentStepData) return '•'.repeat(sumWidth);
                
                const multiplierPos = currentStepData.multiplierPosition;
                if (multiplierPos === -1) {
                  return '•'.repeat(sumWidth);
                }
                
                const stepsForThisPartial = multiplicationSteps.filter(s => s.multiplierPosition === multiplierPos);
                const currentStepInPartial = stepsForThisPartial.findIndex(s => s.step === currentStepData.step);
                const workingValue = currentStepData.partialProduct ?? '';
                
                console.log(`[PartialProduct] Row ${multiplierPos}, Step ${currentStepInPartial + 1}/${stepsForThisPartial.length}:`, {
                  workingValue,
                  multiplierPos,
                  currentStepData
                });
                
                const display: string[] = Array(sumWidth).fill('•');
                
                // Always show positional shift zeros immediately (muted later)
                for (let z = 0; z < multiplierPos; z++) {
                  const pos = sumWidth - 1 - z;
                  if (pos >= 0 && pos < sumWidth) {
                    display[pos] = '0';
                  }
                }
                
                const digits = workingValue.split('');
                
                for (let idx = 0; idx < digits.length; idx++) {
                  const digit = digits[digits.length - 1 - idx];
                  const pos = sumWidth - 1 - (multiplierPos + idx);
                  if (pos >= 0 && pos < sumWidth) {
                    display[pos] = digit;
                  }
                }
                
                return display.join('');
              };
              
              const getCarriesToShow = () => {
                if (!currentStepData) return { carries: [], strikes: [] };
                
                const carries = Array(sumWidth).fill('');
                const strikes = Array(sumWidth).fill(false);
                
                // Determine which partial product row we're in
                const currentMultiplierPos = currentStepData.multiplierPosition;
                
                // If this is a final sum step (multiplierPosition === -1)
                if (currentMultiplierPos === -1) {
                  // Get all sum steps and current index
                  const sumSteps = multiplicationSteps.filter(s => s.multiplierPosition === -1);
                  const currentSumStepIndex = sumSteps.findIndex(s => s.step === currentStepData.step);
                  
                  // Show carries from all steps up to and including current step
                  for (let i = 0; i <= currentSumStepIndex; i++) {
                    const stepData = sumSteps[i];
                    if (stepData.carries && Array.isArray(stepData.carries)) {
                      stepData.carries.forEach(carry => {
                        const shiftedPosition = carry.position + 1;
                        const uiIndex = sumWidth - 1 - shiftedPosition;
                        if (uiIndex >= 0 && uiIndex < sumWidth) {
                          carries[uiIndex] = String(carry.value);
                          // Mark as struck if it's from a previous step (strikethrough when moving to next column)
                          strikes[uiIndex] = i < currentSumStepIndex;
                        }
                      });
                    }
                  }
                  
                  // Debug logging for final sum carries
                  console.log(`[CarryPersistence] Final Sum Step ${currentStepData.step}:`, {
                    currentStep: currentStepData.step,
                    carries: carries.filter(c => c !== ''),
                    totalCarries: carries.filter(c => c !== '').length
                  });
                  
                  return { carries, strikes };
                }
                
                // For partial product steps: show carries with strikethrough
                const stepsForCurrentRow = multiplicationSteps.filter(s => s.multiplierPosition === currentMultiplierPos);
                const currentStepIndex = stepsForCurrentRow.findIndex(s => s.step === currentStepData.step);
                
                // Collect all carries from all steps in current row up to current step
                const allCarries: Array<{ position: number; value: number; stepIndex: number }> = [];
                
                for (let i = 0; i <= currentStepIndex; i++) {
                  const stepData = stepsForCurrentRow[i];
                  if (stepData.carries && Array.isArray(stepData.carries)) {
                    stepData.carries.forEach(carry => {
                      allCarries.push({
                        position: carry.position,
                        value: carry.value,
                        stepIndex: i
                      });
                    });
                  }
                }
                
                // Display all carries, marking previous ones as struck
                allCarries.forEach(({ position, value, stepIndex }) => {
                  const shiftedPosition = position + 1;
                  const uiIndex = sumWidth - 1 - shiftedPosition;
                  if (uiIndex >= 0 && uiIndex < sumWidth) {
                    // Only update if not already set (keeps the most recent carry at each position)
                    if (!carries[uiIndex]) {
                      carries[uiIndex] = String(value);
                      // Mark as struck if it's from a previous step (not current)
                      strikes[uiIndex] = stepIndex < currentStepIndex;
                    }
                  }
                });
                
                // Debug logging for carry persistence
                console.log(`[CarryPersistence] Row ${currentMultiplierPos}, Step ${currentStepIndex + 1}/${stepsForCurrentRow.length}:`, {
                  currentStep: currentStepData.step,
                  multiplierPosition: currentMultiplierPos,
                  stepsInRow: stepsForCurrentRow.length,
                  currentStepIndex,
                  carries: carries.filter(c => c !== ''),
                  totalCarries: carries.filter(c => c !== '').length
                });
                
                return { carries, strikes };
              };
              
              const carriesToShow = getCarriesToShow();
              const currentPartial = getCurrentPartialProduct();
              
              return (
                <div className="relative font-mono">
                  {/* Carries row above multiplicand - shifted one column to the left */}
                  <div className="ml-auto grid justify-end min-h-[28px]" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                    <div className="w-8" />
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
                  
                  {/* Top multiplicand */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                    <div className="w-8" />
                    {A.padStart(sumWidth, ' ').split('').map((ch, i) => {
                      // Map display index to actual A digit position (right-to-left)
                      const offset = sumWidth - A.length;
                      const actualIdx = Math.max(0, i - offset);
                      const digitPos = A.length - 1 - actualIdx; // Position in right-to-left order
                      const isActive = currentStepData && digitPos === currentStepData.multiplicandPosition;
                      return (
                        <div key={i} className={`w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 ${isActive ? 'relative' : ''}`}>
                          <AnimatePresence>
                            {isActive && ch.trim() && (
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="math-digit-frame-blue absolute inset-0"
                                style={{ pointerEvents: 'none' }}
                              />
                            )}
                          </AnimatePresence>
                          {ch.trim()}
                        </div>
                      );
                    })}
                  </div>
                  
        {/* Multiplier with × symbol */}
        <div className="ml-auto grid justify-end items-center" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
          <div className="w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">×</div>
          {B.padStart(sumWidth, ' ').split('').map((ch, i) => {
            // Map display position to actual B index (0-based from left)
            const actualBIndex = i - (sumWidth - B.length); // Account for left padding
            const multiplierPos = B.length - 1 - actualBIndex; // right-to-left position
            const isActive = currentStepData && currentStepData.multiplierPosition === multiplierPos;
            return (
              <div key={i} className={`w-8 text-center text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200 ${isActive ? 'relative' : ''}`}>
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="math-digit-frame-blue absolute inset-0"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </AnimatePresence>
                {ch.trim()}
              </div>
            );
          })}
        </div>
                  
                  {/* Horizontal line */}
                  <div className="my-2 h-[2px] w-full bg-gray-800 dark:bg-gray-200" />
                  
                  {/* Progressive partial products */}
                  {partials.map((row, idx) => {
                    const isCurrentPartial = currentStepData && currentStepData.multiplierPosition === idx;
                    const isRevealed = currentStepData && (
                      currentStepData.multiplierPosition >= idx || 
                      currentStepData.multiplierPosition === -1 // Final sum steps show all partial products
                    );
                    
                    if (!isRevealed) {
                      // Show placeholder dots
                      return (
                        <div key={idx} className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                          <div className="w-8" />
                          {Array(sumWidth).fill('').map((_, i) => (
                            <div key={i} className="w-8 text-center text-lg md:text-xl text-gray-300 dark:text-gray-600">•</div>
                          ))}
                        </div>
                      );
                    }
                    
                    if (isCurrentPartial && currentStepData.multiplierPosition !== -1) {
                      // Show progressive reveal for current partial product
                      return (
                        <div key={idx} className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                          <div className="w-8" />
                          {currentPartial.split('').map((ch, i) => {
                            const highlightIndex = currentStepData
                              ? sumWidth - 1 - (currentStepData.multiplierPosition + currentStepData.multiplicandPosition)
                              : -1;
                            // Determine if this cell is a positional shift zero (to the right of the row)
                            const digitPosFromRight = sumWidth - 1 - i;
                            const isShiftZero = currentStepData
                              ? digitPosFromRight < currentStepData.multiplierPosition
                              : false;
                            const isActiveDigit =
                              currentStepData &&
                              highlightIndex >= 0 &&
                              i === highlightIndex &&
                              ch !== '•' &&
                              !isShiftZero;
                            return (
                              <motion.div 
                                key={i} 
                                className={`w-8 text-center text-lg md:text-xl relative ${
                                  ch === '•'
                                    ? 'text-gray-300 dark:text-gray-600'
                                    : isShiftZero
                                      ? 'text-gray-400 dark:text-gray-500'
                                      : 'text-blue-600 dark:text-blue-400 font-bold'
                                }`}
                                initial={{ opacity: 0, scale: 0.8 }} 
                                animate={{ 
                                  opacity: 1,
                                  scale: ch === '•' || isShiftZero ? 1 : 1.1
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                <AnimatePresence>
                                  {isActiveDigit && (
                                    <motion.div
                                      initial={{ scale: 0.9, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.9, opacity: 0 }}
                                      className="math-digit-frame-green absolute inset-0"
                                      style={{ pointerEvents: 'none' }}
                                    />
                                  )}
                                </AnimatePresence>
                                {ch}
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      // Show completed partial product WITH FRAMES during addition
                      const isInFinalSumMode = currentStepData && currentStepData.multiplierPosition === -1;
                      const currentColumnPos = (currentStepData as any)?.columnPosition ?? -1;
                      
                      return (
                        <div key={idx} className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                          <div className="w-8" />
                          {row.padStart(sumWidth, ' ').split('').map((ch, i) => {
                            // Calculate if this digit should be framed during final sum
                            let isActiveInAddition = false;
                            if (isInFinalSumMode && currentColumnPos >= 0) {
                              // Map display position to actual digit position from right
                              const digitPosition = sumWidth - 1 - i; // Position from right (0 = ones, 1 = tens, etc.)
                              
                              // Check if this digit contributes to the current column being added
                              const contributingDigits = (currentStepData as any)?.contributingDigits || [];
                              isActiveInAddition = contributingDigits.some(
                                (contrib: any) => contrib.partialIndex === idx && digitPosition === currentColumnPos
                              );
                            }
                            
                            return (
                              <div key={i} className={`w-8 text-center text-lg md:text-xl text-gray-800 dark:text-gray-200 ${isActiveInAddition ? 'relative' : ''}`}>
                                <AnimatePresence>
                                  {isActiveInAddition && (
                                    <motion.div
                                      initial={{ scale: 0.9, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.9, opacity: 0 }}
                                      className="math-digit-frame-purple absolute inset-0"
                                      style={{ pointerEvents: 'none' }}
                                    />
                                  )}
                                </AnimatePresence>
                                {ch.trim()}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  })}
                  
                  {/* Final sum line */}
                  <div className="my-2 h-[2px] w-full bg-gray-800 dark:bg-gray-200" />
                  
                  {/* Final sum - show digit by digit for final sum steps */}
                  <div className="ml-auto grid justify-end" style={{ gridTemplateColumns: `repeat(${sumWidth + 1}, 2rem)` }}>
                    <div className="w-8" />
                    {(() => {
                      // Check if this is a final sum step (multiplierPosition === -1)
                      if (currentStepData && currentStepData.multiplierPosition === -1) {
                        // This is a final sum step - show progressive reveal
                        const finalSumSteps = multiplicationSteps.filter(s => s.multiplierPosition === -1);
                        const currentFinalSumStepIndex = finalSumSteps.findIndex(s => s.step === currentStepData.step);
                        
                        // Show final sum from right to left (ones place first)
                        const revealedLength = Math.min(currentFinalSumStepIndex + 1, sumFinal.length);
                        const hiddenLength = sumFinal.length - revealedLength;
                        
                        const hidden = '•'.repeat(hiddenLength);
                        const revealed = sumFinal.substring(hiddenLength);
                        const displayString = hidden + revealed;
                        
                        return displayString.padStart(sumWidth, ' ').split('').map((ch, i) => {
                          // Calculate if this is the digit being revealed in current step
                          const digitPosition = sumWidth - 1 - i;
                          const currentColumnPos = (currentStepData as any)?.columnPosition ?? -1;
                          const isActiveDigit = digitPosition === currentColumnPos && ch !== '•' && ch !== ' ';
                          
                          return (
                            <motion.div 
                              key={i} 
                              className={`w-8 text-center text-lg md:text-xl font-bold relative ${
                                ch === '•' 
                                  ? 'text-gray-300 dark:text-gray-600' 
                                  : 'text-green-700 dark:text-green-300'
                              }`}
                              initial={{ opacity: 0, scale: 0.8 }} 
                              animate={{ 
                                opacity: 1,
                                scale: ch === '•' ? 1 : 1.1
                              }}
                              transition={{ duration: 0.5 }}
                            >
                              <AnimatePresence>
                                {isActiveDigit && (
                                  <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="math-digit-frame-purple absolute inset-0"
                                    style={{ pointerEvents: 'none' }}
                                  />
                                )}
                              </AnimatePresence>
                              {ch.trim()}
                            </motion.div>
                          );
                        });
                      } else if (currentStep >= multiplicationSteps.length) {
                        // All steps complete - show full final sum
                        return sumFinal.padStart(sumWidth, ' ').split('').map((ch, i) => (
                          <motion.div 
                            key={i} 
                            className="w-8 text-center text-lg md:text-xl font-bold text-green-700 dark:text-green-300" 
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ 
                              opacity: 1,
                              scale: 1.1
                            }}
                            transition={{ duration: 0.5 }}
                          >
                            {ch.trim()}
                          </motion.div>
                        ));
                      } else {
                        // Show placeholder dots
                        return Array(sumWidth).fill('').map((_, i) => (
                          <div key={i} className="w-8 text-center text-lg md:text-xl text-gray-300 dark:text-gray-600">
                            •
                  </div>
                        ));
                      }
                    })()}
                  </div>
                  
                  {/* Current step explanation */}
                  {currentStepData && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                      {currentStepData.explanation}
                    </div>
                  )}
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
          disabled={currentStep >= getMaxStep()}
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
            style={{ width: `${((currentStep + 1) / (getMaxStep() + 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
