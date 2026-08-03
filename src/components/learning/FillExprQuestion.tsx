import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FillExprQuestion } from "@/types/quiz-bank";
import { cn } from "@/lib/utils";
import { useLearningDragDrop } from "./useLearningDragDrop";

interface Props {
  question: FillExprQuestion;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

export function FillExprQuestionView({ question, value, onChange }: Props) {
  const filled = value ?? {};
  const { draggedValue, getDragSourceProps, getDropTargetProps } = useLearningDragDrop();

  const handleChip = (blank: string, chip: string) => {
    if (filled[blank] === chip) {
      const next = { ...filled };
      delete next[blank];
      onChange(next);
    } else {
      onChange({ ...filled, [blank]: chip });
    }
  };

  const clearSlot = (blank: string) => {
    const next = { ...filled };
    delete next[blank];
    onChange(next);
  };

  const moveChipToBlank = (blank: string, chip: string) => {
    const next = { ...filled };

    Object.entries(next).forEach(([existingBlank, existingChip]) => {
      if (existingChip === chip) {
        delete next[existingBlank];
      }
    });

    next[blank] = chip;
    onChange(next);
  };

  const parts = question.template.split(/(_{2,})/g);
  let blankIndex = 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-xl font-semibold justify-center">
        {parts.map((part, i) => {
          if (/^_{2,}$/.test(part)) {
            const blank = question.blanks[blankIndex] ?? `blank_${blankIndex}`;
            blankIndex++;
            const filledValue = filled[blank];
            return (
              <motion.button
                key={`blank-${blank}`}
                type="button"
                onClick={() => filledValue && clearSlot(blank)}
                {...getDropTargetProps((chip) => moveChipToBlank(blank, chip))}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "min-w-[48px] h-12 px-3 rounded-xl border-2 flex items-center justify-center",
                  "text-lg font-bold transition-colors",
                  filledValue
                    ? "border-primary bg-primary/10 text-primary cursor-pointer"
                    : draggedValue
                      ? "border-primary/50 bg-primary/5 text-neutral-400"
                      : "border-dashed border-neutral-400 bg-neutral-50 dark:bg-neutral-800 text-neutral-400"
                )}
              >
                <AnimatePresence mode="wait">
                  {filledValue ? (
                    <motion.span
                      key={filledValue}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {filledValue}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm"
                    >
                      ?
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          }
          return (
            <span key={`text-${i}`} className="text-foreground">
              {part}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {question.chips.map((chip, i) => {
          const usedInBlank = Object.entries(filled).find(([, v]) => v === chip)?.[0];
          const isUsed = !!usedInBlank;
          const nextUnfilledBlank = question.blanks.find(b => !filled[b]);
          return (
            <motion.button
              key={chip}
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
              whileTap={{ scale: 0.9 }}
              {...getDragSourceProps(chip)}
              onClick={() => {
                if (isUsed) {
                  clearSlot(usedInBlank!);
                } else if (nextUnfilledBlank) {
                  handleChip(nextUnfilledBlank, chip);
                }
              }}
              className={cn(
                "w-12 h-12 rounded-xl border text-lg font-semibold transition-all cursor-grab active:cursor-grabbing",
                isUsed
                  ? "bg-primary/10 border-primary text-primary opacity-50"
                  : draggedValue === chip
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary border-transparent hover:border-primary/40 shadow-sm"
              )}
            >
              {chip}
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Glisse un nombre dans une case, ou tapote pour le placer.
      </p>
    </div>
  );
}
