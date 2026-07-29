import { useState } from "react";
import { motion } from "framer-motion";
import type { SliderQuestion } from "@/types/quiz-bank";
import { cn } from "@/lib/utils";

interface Props {
  question: SliderQuestion;
  value: number | "";
  onChange: (v: number) => void;
}

export function SliderQuestionView({ question, value, onChange }: Props) {
  const { min, max, step, unit, trackLabel } = question;
  const current = value === "" ? min + (max - min) / 2 : Number(value);
  const pct = ((current - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Live value display */}
      <div className="flex flex-col items-center gap-1">
        <motion.div
          key={current}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-4xl font-bold tabular-nums"
        >
          {current}{unit ? <span className="text-xl font-medium ml-1 text-muted-foreground">{unit}</span> : null}
        </motion.div>
        {trackLabel && (
          <p className="text-sm text-muted-foreground">{trackLabel}</p>
        )}
      </div>

      {/* Slider track */}
      <div className="relative px-2">
        <div className="relative h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full">
          <motion.div
            className="absolute left-0 top-0 h-3 rounded-full bg-primary"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-3 top-0"
          aria-label={trackLabel ?? question.prompt}
        />
        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary border-2 border-white shadow-md pointer-events-none"
          animate={{ left: `calc(${pct}% - 12px)` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          style={{ top: "50%", transform: "translateY(-50%)" }}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
