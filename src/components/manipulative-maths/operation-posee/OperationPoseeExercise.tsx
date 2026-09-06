import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ManipulativeMathMode } from '@/lib/manipulative-maths/types';
import type {
  OperationPoseeExercise as OperationPoseeExerciseData,
  OperationPoseeStudentState,
  OperationPoseeVerificationResult,
} from '@/lib/manipulative-maths/operation-posee/operationPoseeTypes';
import { verifyOperationPosee } from '@/lib/manipulative-maths/operation-posee/verifyOperationPosee';

interface OperationPoseeExerciseProps {
  exercise: OperationPoseeExerciseData;
  mode: ManipulativeMathMode;
  onComplete?: (result: OperationPoseeVerificationResult) => void;
}

function numberText(value: number): string {
  return Math.abs(Math.trunc(value)).toString();
}

function operationResult(exercise: OperationPoseeExerciseData): number {
  return exercise.operation === 'addition'
    ? exercise.topNumber + exercise.bottomNumber
    : exercise.topNumber - exercise.bottomNumber;
}

function operationWidth(exercise: OperationPoseeExerciseData): number {
  return Math.max(
    numberText(exercise.topNumber).length,
    numberText(exercise.bottomNumber).length,
    numberText(operationResult(exercise)).length
  );
}

function digitsForNumber(value: number, width: number): string[] {
  return numberText(value).padStart(width, '0').split('');
}

function emptyState(width: number): OperationPoseeStudentState {
  return {
    resultDigits: Array.from({ length: width }, () => ''),
    carryBoxes: Array.from({ length: width }, () => ''),
  };
}

function operationSymbol(operation: OperationPoseeExerciseData['operation']): string {
  return operation === 'addition' ? '+' : '−';
}

function modeLabel(mode: ManipulativeMathMode): string {
  if (mode === 'practice') return 'Entraînement';
  if (mode === 'quiz') return 'Quiz';
  if (mode === 'auto-verification') return 'Auto-vérification';
  return 'Math Lab';
}

function normalizeInputDigit(value: string): string {
  return value.replace(/\D/g, '').slice(-1);
}

export function OperationPoseeExercise({ exercise, mode, onComplete }: OperationPoseeExerciseProps) {
  const width = useMemo(() => operationWidth(exercise), [exercise]);
  const topDigits = useMemo(() => digitsForNumber(exercise.topNumber, width), [exercise.topNumber, width]);
  const bottomDigits = useMemo(() => digitsForNumber(exercise.bottomNumber, width), [exercise.bottomNumber, width]);
  const prompt = exercise.prompt || `Pose et calcule : ${exercise.topNumber} ${operationSymbol(exercise.operation)} ${exercise.bottomNumber}`;
  const [studentState, setStudentState] = useState<OperationPoseeStudentState>(() => emptyState(width));
  const [verification, setVerification] = useState<OperationPoseeVerificationResult | null>(null);

  const setResultDigit = (index: number, value: string) => {
    setVerification(null);
    setStudentState(prev => ({
      ...prev,
      resultDigits: prev.resultDigits.map((digit, digitIndex) =>
        digitIndex === index ? normalizeInputDigit(value) : digit
      ),
    }));
  };

  const setCarryDigit = (index: number, value: string) => {
    setVerification(null);
    setStudentState(prev => ({
      ...prev,
      carryBoxes: prev.carryBoxes.map((digit, digitIndex) =>
        digitIndex === index ? normalizeInputDigit(value) : digit
      ),
    }));
  };

  const handleVerify = () => {
    const result = verifyOperationPosee(exercise, studentState);
    setVerification(result);
    onComplete?.(result);
  };

  const handleReset = () => {
    setStudentState(emptyState(width));
    setVerification(null);
  };

  const inputClassName = (correct?: boolean) => cn(
    'h-11 w-10 rounded-md border bg-background text-center text-xl font-bold text-foreground shadow-sm outline-none transition',
    'focus:border-primary focus:ring-2 focus:ring-primary/20',
    correct === true && 'border-green-500 bg-green-50 text-green-800',
    correct === false && 'border-red-500 bg-red-50 text-red-800'
  );

  const expectedResultDigits = verification?.expectedResultDigits;
  const expectedCarryBoxes = verification?.expectedCarryBoxes;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-4 my-4 rounded-xl border bg-card p-4 shadow-sm md:p-5"
      aria-label="Manipulatif d'opération posée"
    >
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pose et calcule</p>
          <h3 className="text-lg font-semibold text-foreground">{prompt}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complète les chiffres du résultat et les retenues / emprunts.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {modeLabel(mode)}
        </span>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <div className="min-w-fit rounded-lg bg-muted/40 p-4">
          <div
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: `2rem repeat(${width}, 2.5rem)` }}
          >
            <div />
            {studentState.carryBoxes.map((digit, index) => (
              <input
                key={`carry-${index}`}
                aria-label={`Retenue ou emprunt colonne ${index + 1}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={event => setCarryDigit(index, event.target.value)}
                className={cn(
                  inputClassName(expectedCarryBoxes ? digit === expectedCarryBoxes[index] : undefined),
                  'h-8 text-sm'
                )}
              />
            ))}

            <div />
            {topDigits.map((digit, index) => (
              <div key={`top-${index}`} className="text-center text-2xl font-bold text-foreground">
                {digit}
              </div>
            ))}

            <div className="text-center text-2xl font-bold text-foreground">
              {operationSymbol(exercise.operation)}
            </div>
            {bottomDigits.map((digit, index) => (
              <div key={`bottom-${index}`} className="text-center text-2xl font-bold text-foreground">
                {digit}
              </div>
            ))}

            <div className="col-span-full h-0.5 rounded-full bg-foreground" />

            <div />
            {studentState.resultDigits.map((digit, index) => (
              <input
                key={`result-${index}`}
                aria-label={`Chiffre du résultat colonne ${index + 1}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={event => setResultDigit(index, event.target.value)}
                className={inputClassName(expectedResultDigits ? digit === expectedResultDigits[index] : undefined)}
              />
            ))}
          </div>

          <div className="mt-3 text-center text-xs font-medium text-muted-foreground">
            retenues / emprunts
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={handleVerify}>
          <CheckCircle2 className="h-4 w-4" />
          Vérifier
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
          Recommencer
        </Button>
      </div>

      <AnimatePresence>
        {verification && (
          <motion.div
            key={verification.message}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm',
              verification.correct
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            )}
          >
            {verification.correct ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{verification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
