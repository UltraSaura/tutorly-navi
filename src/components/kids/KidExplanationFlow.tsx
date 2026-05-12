/**
 * KidExplanationFlow
 *
 * Progressive, interactive explanation for kids (<11).
 * Features:
 * - Reveals one step at a time ("Étape suivante" button)
 * - Spring-animated cards via AnimatedStepCard
 * - ObjectCounter widget when an arithmetic expression is detected in the example
 * - RuntimeMiniPracticeInline on the "check" step
 * - No static walls of text — each step is short + visual
 */
import React, { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Step } from "@/features/explanations/types";
import type { RuntimeMiniPracticeContext } from "@/features/explanations/runtimeMiniPractice";
import { AnimatedStepCard } from "./AnimatedStepCard";
import { parseArithmetic, pickEmoji } from "./parseArithmetic";
import { toChildFriendlyExplanationText } from "@/features/explanations/childFriendlyText";
import { useResolveText } from "@/hooks/useResolveText";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { RuntimeMiniPracticeInline } from "@/features/explanations/RuntimeMiniPracticeInline";

// Lazy-load the heavy ObjectCounter (framer-motion + emoji rendering)
const ObjectCounter = lazy(() =>
  import("./ObjectCounter").then((m) => ({ default: m.ObjectCounter }))
);

// ─── Icon mapping ─────────────────────────────────────────────────────────────
const KID_ICONS: Record<Step["kind"], string> = {
  concept:  "🌟",
  example:  "📝",
  method:   "🚀",
  strategy: "💡",
  pitfall:  "⚠️",
  check:    "✅",
};

const KIND_FALLBACK_TITLE_FR: Record<Step["kind"], string> = {
  concept:  "L'idée clé",
  example:  "Un exemple",
  method:   "La méthode",
  strategy: "Astuce",
  pitfall:  "Attention !",
  check:    "Essaie toi-même",
};

const KIND_FALLBACK_TITLE_EN: Record<Step["kind"], string> = {
  concept:  "The big idea",
  example:  "An example",
  method:   "The method",
  strategy: "Tip",
  pitfall:  "Watch out!",
  check:    "Try it yourself",
};

// ─── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i === current ? 1.35 : 1,
            backgroundColor: i <= current ? "#a855f7" : "#e5e7eb",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="h-2.5 w-2.5 rounded-full"
        />
      ))}
    </div>
  );
}

// ─── Intro banner ─────────────────────────────────────────────────────────────
function IntroBanner({ t }: { t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 18 }}
      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-100 to-purple-50 border border-violet-200 px-5 py-4"
    >
      <span className="text-3xl" aria-hidden="true">🧠</span>
      <div>
        <p className="font-bold text-violet-900 text-base leading-tight">
          {t("exercises.explanation.kid.intro_title")}
        </p>
        <p className="text-xs text-violet-700 mt-0.5">
          {t("exercises.explanation.kid.intro_sub")}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Completion banner ─────────────────────────────────────────────────────────
function CompletionBanner({ youGotThis }: { youGotThis: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 14 }}
      className="flex items-center justify-center gap-3 rounded-2xl bg-blue-50 border border-blue-200 p-5 text-blue-800 font-bold text-sm"
    >
      <span className="text-2xl" aria-hidden="true">🎨</span>
      <span>{youGotThis || "Tu vas y arriver, champion !"}</span>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface KidExplanationFlowProps {
  steps: Step[];
  miniPracticeContext?: RuntimeMiniPracticeContext;
}

export function KidExplanationFlow({ steps, miniPracticeContext }: KidExplanationFlowProps) {
  const { t, language } = useLanguage();
  const resolveText = useResolveText();
  const isFr = language === "fr";

  // Current step revealed (0-based). Starts at 0 so the first card is visible immediately.
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep >= steps.length - 1;
  const isDone = currentStep >= steps.length;

  if (!steps?.length) return null;

  const fallbackTitles = isFr ? KIND_FALLBACK_TITLE_FR : KIND_FALLBACK_TITLE_EN;

  return (
    <div className="space-y-5 py-1">
      {/* Banner */}
      <IntroBanner t={t} />

      {/* Progress dots */}
      <ProgressDots total={steps.length} current={isDone ? steps.length - 1 : currentStep} />

      {/* Steps revealed so far */}
      <div className="space-y-4">
        <AnimatePresence>
          {steps.slice(0, isDone ? steps.length : currentStep + 1).map((step, index) => {
            const rawTitle = step.title?.trim() || fallbackTitles[step.kind];
            const title = toChildFriendlyExplanationText(rawTitle);
            const rawBody = resolveText(step.body || "");
            const body = toChildFriendlyExplanationText(rawBody);
            const icon = KID_ICONS[step.kind] || "✨";

            if (!body) return null;

            // Detect arithmetic in "example" or "strategy" steps to show ObjectCounter
            const parsedMath =
              (step.kind === "example" || step.kind === "strategy")
                ? parseArithmetic(body)
                : null;
            const emoji = parsedMath ? pickEmoji(body) : null;

            return (
              <AnimatedStepCard
                key={`${step.kind}-${index}`}
                kind={step.kind}
                icon={icon}
                title={title}
                index={index}
                animate={true}
              >
                {step.kind === "check" ? (
                  /* Interactive mini-practice for "check" step */
                  <div className="mt-2 rounded-xl bg-green-50 border border-green-100 p-3">
                    <RuntimeMiniPracticeInline
                      context={miniPracticeContext}
                      fallbackBody={body}
                    />
                  </div>
                ) : parsedMath ? (
                  /* Visual arithmetic widget when numbers are simple enough */
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap break-words">{body}</p>
                    <Suspense fallback={
                      <div className="h-24 rounded-xl bg-sky-50 animate-pulse" aria-label={isFr ? "Chargement du visuel..." : "Loading visual..."} />
                    }>
                      <ObjectCounter
                        a={parsedMath.a}
                        b={parsedMath.b}
                        operation={parsedMath.op}
                        emoji={emoji ?? "🔵"}
                        autoPlay={true}
                        replayLabel={t("exercises.explanation.kid.replay")}
                      />
                    </Suspense>
                  </div>
                ) : (
                  /* Plain text (child-friendly, short sentences from the AI) */
                  <p className="whitespace-pre-wrap break-words">{body}</p>
                )}
              </AnimatedStepCard>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      {!isDone && (
        <div className="flex justify-end">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => {
              if (isLast) {
                setCurrentStep(steps.length); // mark done
              } else {
                setCurrentStep((prev) => prev + 1);
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors"
          >
            {isLast
              ? t("exercises.explanation.kid.got_it")
              : t("exercises.explanation.kid.next_step")}
          </motion.button>
        </div>
      )}

      {/* Completion footer */}
      {isDone && (
        <CompletionBanner
          youGotThis={t("exercises.explanation.kid.you_got_this") || (isFr ? "Tu vas y arriver, champion !" : "You got this, champion!")}
        />
      )}
    </div>
  );
}
