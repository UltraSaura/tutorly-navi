import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FillExprQuestion } from "@/types/quiz-bank";
import { cn } from "@/lib/utils";

interface Props {
  question: FillExprQuestion;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

export function FillExprQuestionView({ question, value, onChange }: Props) {
  const filled = value ?? {};
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [draggedChip, setDraggedChip] = useState<string | null>(null);

  // Place a chip into a specific blank, evicting it from any other blank first
  const placeChip = (blank: string, chip: string) => {
    const next = { ...filled };
    Object.keys(next).forEach(k => { if (next[k] === chip) delete next[k]; });
    next[blank] = chip;
    onChange(next);
  };

  const clearSlot = (blank: string) => {
    const next = { ...filled };
    delete next[blank];
    onChange(next);
  };

  // Tap a chip: select it, or if already selected deselect it.
  // If a chip was already selected and the user taps a different one, just switch selection.
  const handleChipTap = (chip: string) => {
    const usedInBlank = Object.entries(filled).find(([, v]) => v === chip)?.[0];
    if (selectedChip === chip) {
      setSelectedChip(null);
    } else {
      if (usedInBlank) clearSlot(usedInBlank);
      setSelectedChip(chip);
    }
  };

  // Tap a blank: if a chip is selected place it here; otherwise clear the blank.
  const handleBlankTap = (blank: string) => {
    if (selectedChip) {
      placeChip(blank, selectedChip);
      setSelectedChip(null);
    } else if (filled[blank]) {
      clearSlot(blank);
    }
  };

  // Deduplicate blank IDs: if AI produced ["b1","b1"] both slots share a key and mirror each other.
  // Remap to always-unique IDs by appending _N on collision.
  const seen = new Map<string, number>();
  const safeBlankIds = question.blanks.map(id => {
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    return count === 0 ? id : `${id}_${count}`;
  });

  const parts = question.template.split(/(_{2,})/g);
  let blankIndex = 0;
  const anySelected = !!selectedChip;

  return (
    <div className="flex flex-col gap-6">
      {/* Expression with blanks */}
      <div className="flex flex-wrap items-center gap-2 text-xl font-semibold justify-center">
        {parts.map((part, i) => {
          if (/^_{2,}$/.test(part)) {
            const blank = safeBlankIds[blankIndex] ?? `blank_${blankIndex}`;
            blankIndex++;
            const filledValue = filled[blank];
            const isTarget = anySelected && !filledValue;

            return (
              <motion.button
                key={`blank-${blank}`}
                type="button"
                onClick={() => handleBlankTap(blank)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const chip = e.dataTransfer.getData("text/plain");
                  if (chip) { placeChip(blank, chip); setDraggedChip(null); }
                }}
                whileTap={{ scale: 0.95 }}
                animate={isTarget ? { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 0.9 } } : { scale: 1 }}
                className={cn(
                  "min-w-[52px] h-14 px-4 rounded-xl border-2 flex items-center justify-center",
                  "text-xl font-bold transition-colors",
                  filledValue
                    ? "border-[#12C6A0] bg-[#F2FBF8] text-[#085041] cursor-pointer shadow-sm"
                    : isTarget
                      ? "border-[#12C6A0] border-dashed bg-[#F2FBF8]/60 text-[#9FE1CB] shadow-[0_0_0_3px_#9FE1CB55]"
                      : "border-dashed border-neutral-300 bg-neutral-50 text-neutral-400"
                )}
              >
                <AnimatePresence mode="wait">
                  {filledValue ? (
                    <motion.span
                      key={filledValue}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    >
                      {filledValue}
                    </motion.span>
                  ) : (
                    <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                      {isTarget ? '↓' : '?'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          }
          return (
            <span key={`text-${i}`} className="text-foreground">{part}</span>
          );
        })}
      </div>

      {/* Hint text when a chip is selected */}
      <AnimatePresence>
        {selectedChip && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-center text-sm font-semibold"
            style={{ color: '#12C6A0' }}
          >
            « {selectedChip} » sélectionné — appuie sur une case pour le placer
          </motion.p>
        )}
      </AnimatePresence>

      {/* Chips */}
      <div className="flex flex-wrap gap-3 justify-center">
        {question.chips.map((chip, i) => {
          const usedInBlank = Object.entries(filled).find(([, v]) => v === chip)?.[0];
          const isUsed = !!usedInBlank;
          const isSelected = selectedChip === chip;

          return (
            <motion.button
              key={chip}
              type="button"
              draggable
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{
                opacity: isUsed ? 0.35 : 1,
                scale: isSelected ? 1.15 : 1,
              }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
              whileTap={{ scale: 0.88 }}
              onDragStart={(e: any) => {
                e.dataTransfer?.setData("text/plain", chip);
                setDraggedChip(chip);
                setSelectedChip(null);
              }}
              onDragEnd={() => setDraggedChip(null)}
              onClick={() => handleChipTap(chip)}
              style={isSelected ? {
                background: '#12C6A0',
                color: '#0F172A',
                borderColor: '#0F6E56',
                boxShadow: '0 0 0 3px #9FE1CB',
              } : isUsed ? {
                background: '#F2FBF8',
                color: '#9FE1CB',
                borderColor: '#9FE1CB',
              } : {
                background: 'white',
                color: '#374151',
                borderColor: '#EAECEF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
              className={cn(
                "w-14 h-14 rounded-2xl border-2 text-xl font-bold transition-all",
                draggedChip === chip ? "opacity-50" : "",
                isUsed ? "cursor-not-allowed" : "cursor-pointer active:cursor-grabbing",
              )}
            >
              {chip}
            </motion.button>
          );
        })}
      </div>

      {!selectedChip && (
        <p className="text-xs text-center text-muted-foreground">
          Appuie sur un nombre, puis sur une case — ou glisse-le directement.
        </p>
      )}
    </div>
  );
}
