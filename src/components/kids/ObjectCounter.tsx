/**
 * ObjectCounter — visual arithmetic widget for kids
 *
 * Renders emoji objects (🍎 by default) in two groups:
 *   GROUP A  +  GROUP B  =  TOTAL
 *
 * The "add" group animates in one by one after a short delay.
 * Works for addition and subtraction.
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Operation = "+" | "-" | "×";

interface ObjectCounterProps {
  /** Value of the first group */
  a: number;
  /** Value added / removed */
  b: number;
  /** Operation to display */
  operation?: Operation;
  /** Emoji used as the counting object */
  emoji?: string;
  /** Auto-play the animation on mount */
  autoPlay?: boolean;
  /** Translated label for the replay button */
  replayLabel?: string;
}

const MAX_OBJECTS = 20; // Safety cap so we never overflow the UI

function clamp(n: number) {
  return Math.min(n, MAX_OBJECTS);
}

export function ObjectCounter({
  a,
  b,
  operation = "+",
  emoji = "🍎",
  autoPlay = true,
  replayLabel = "🔁 Rejouer",
}: ObjectCounterProps) {
  const safeA = clamp(Math.abs(a));
  const safeB = clamp(Math.abs(b));

  // How many "b" objects are currently visible (animated in one-by-one)
  const [visibleB, setVisibleB] = useState(autoPlay ? 0 : safeB);
  const [done, setDone] = useState(!autoPlay);

  useEffect(() => {
    if (!autoPlay) return;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setVisibleB(current);
      if (current >= safeB) {
        clearInterval(timer);
        setDone(true);
      }
    }, 350);
    return () => clearInterval(timer);
  }, [autoPlay, safeB]);

  const total =
    operation === "+"
      ? safeA + safeB
      : operation === "-"
      ? safeA - safeB
      : safeA * safeB;

  return (
    <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 p-4 space-y-3">
      {/* Group A */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
          Groupe A — {safeA}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: safeA }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 180, damping: 14 }}
              className="text-2xl select-none"
              aria-hidden="true"
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Operator line */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-sky-600">{operation}</span>
        <div className="space-y-1 flex-1">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
            Groupe B — {safeB}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence>
              {Array.from({ length: visibleB }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className="text-2xl select-none"
                  aria-hidden="true"
                >
                  {emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Result */}
      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="flex items-center gap-3 rounded-xl bg-green-100 border border-green-200 px-4 py-3"
        >
          <span className="text-2xl">🎉</span>
          <span className="text-lg font-black text-green-800">
            = {total}
          </span>
        </motion.div>
      )}

      {/* Replay button */}
      {done && autoPlay && (
        <button
          type="button"
          onClick={() => {
            setVisibleB(0);
            setDone(false);
            // restart after a brief pause
            setTimeout(() => {
              let current = 0;
              const timer = setInterval(() => {
                current += 1;
                setVisibleB(current);
                if (current >= safeB) {
                  clearInterval(timer);
                  setDone(true);
                }
              }, 350);
            }, 100);
          }}
          className="text-xs font-semibold text-sky-600 hover:text-sky-800 underline underline-offset-2 transition-colors"
        >
          {replayLabel}
        </button>
      )}
    </div>
  );
}
