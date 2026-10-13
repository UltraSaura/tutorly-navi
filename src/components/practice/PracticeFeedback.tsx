import { CheckCircle2, XCircle, AlertCircle, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type PracticeFeedbackStatus = 'correct' | 'incorrect' | 'partial' | 'incomplete';

export function PracticeFeedback({
  status,
  language,
  points,
}: {
  status: PracticeFeedbackStatus;
  language: string;
  points?: number;
}) {
  const fr = language === 'fr';
  const isCorrect = status === 'correct';
  const isIncorrect = status === 'incorrect';
  const label = isCorrect
    ? (fr ? 'Bien joué' : 'Good job')
    : isIncorrect
      ? (fr ? 'Pas encore' : 'Not yet')
      : status === 'partial'
        ? (fr ? 'Presque' : 'Almost there')
        : (fr ? 'À compléter' : 'Incomplete');

  const Icon = isCorrect ? CheckCircle2 : isIncorrect ? XCircle : status === 'partial' ? AlertCircle : Circle;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" role="status" aria-live="polite">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: isCorrect ? 8 : 0 }}
        animate={isCorrect
          ? { scale: [0.92, 1.06, 1], opacity: 1, y: [8, -3, 0] }
          : isIncorrect
            ? { x: [0, -6, 6, -4, 4, 0], opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: isCorrect ? 0.42 : 0.35 }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
          isCorrect && 'border-green-300 bg-green-100 text-green-800',
          isIncorrect && 'border-red-300 bg-red-100 text-red-800',
          status === 'partial' && 'border-amber-300 bg-amber-100 text-amber-800',
          status === 'incomplete' && 'border-slate-300 bg-slate-100 text-slate-700',
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </motion.div>
      {isCorrect && points != null ? (
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: -8 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="text-sm font-bold text-emerald-600"
        >
          +{points} {fr ? 'points' : 'points'}
        </motion.span>
      ) : null}
    </div>
  );
}

