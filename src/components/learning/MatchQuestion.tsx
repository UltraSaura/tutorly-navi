import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchQuestion } from "@/types/quiz-bank";
import { cn } from "@/lib/utils";

interface Props {
  question: MatchQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}

export function MatchQuestionView({ question, value, onChange }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const confirmedPairs: string[] = Array.isArray(value) ? value : [];

  const pairedLeftIds = confirmedPairs.map(p => p.split(":")[0]);
  const pairedRightIds = confirmedPairs.map(p => p.split(":")[1]);

  const handleLeftTap = (leftId: string) => {
    if (pairedLeftIds.includes(leftId)) return;
    setSelectedLeft(prev => prev === leftId ? null : leftId);
  };

  const handleRightTap = (rightId: string) => {
    if (!selectedLeft) return;
    if (pairedRightIds.includes(rightId)) return;
    const newPair = `${selectedLeft}:${rightId}`;
    onChange([...confirmedPairs, newPair]);
    setSelectedLeft(null);
  };

  const removePair = (pair: string) => {
    onChange(confirmedPairs.filter(p => p !== pair));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, i) => {
            const isPaired = pairedLeftIds.includes(pair.leftId);
            const isSelected = selectedLeft === pair.leftId;
            return (
              <motion.button
                key={pair.leftId}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleLeftTap(pair.leftId)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                  isPaired
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 opacity-60"
                    : isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-neutral-300 hover:border-primary/50"
                )}
              >
                {pair.left}
              </motion.button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {question.pairs.map((pair, i) => {
            const isPaired = pairedRightIds.includes(pair.rightId);
            const matchingPair = confirmedPairs.find(p => p.split(":")[1] === pair.rightId);
            return (
              <motion.button
                key={pair.rightId}
                type="button"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRightTap(pair.rightId)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                  isPaired
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 opacity-60"
                    : selectedLeft
                    ? "border-primary/40 hover:border-primary hover:bg-primary/5"
                    : "border-neutral-300"
                )}
              >
                {pair.right}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Paired summary */}
      <AnimatePresence>
        {confirmedPairs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1"
          >
            <p className="text-xs text-muted-foreground mb-1">
              {confirmedPairs.length}/{question.pairs.length} paires
            </p>
            {confirmedPairs.map(pair => {
              const [lid, rid] = pair.split(":");
              const left = question.pairs.find(p => p.leftId === lid)?.left;
              const right = question.pairs.find(p => p.rightId === rid)?.right;
              return (
                <motion.div
                  key={pair}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/20
                             border border-green-200 rounded-lg px-3 py-1.5"
                >
                  <span className="font-medium">{left}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{right}</span>
                  <button
                    type="button"
                    onClick={() => removePair(pair)}
                    className="ml-auto text-muted-foreground hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedLeft && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-primary font-medium"
        >
          Maintenant sélectionne un élément à droite
        </motion.p>
      )}
    </div>
  );
}
