/**
 * KidExplanationFlow
 *
 * Progressive, interactive explanation for kids (<11).
 * Features:
 * - Reveals one step at a time ("Étape suivante" button)
 * - Compact mobile-first layout
 * - ObjectCounter widget when an arithmetic expression is detected in the example
 * - RuntimeMiniPracticeInline on the "check" step
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
import { buildKidArithmeticSupportText } from "./kidArithmeticGuidance";

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

// ─── Completion banner ─────────────────────────────────────────────────────────
interface CompletionAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

function CompletionBanner({
  youGotThis,
  actions = [],
}: {
  youGotThis: string;
  actions?: CompletionAction[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 14 }}
      className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900"
    >
      <div className="flex items-center justify-center gap-3 text-sm font-bold">
        <span className="text-2xl" aria-hidden="true">🎨</span>
        <span>{youGotThis || "Tu vas y arriver, champion !"}</span>
      </div>

      {actions.length > 0 && (
        <div className="mt-4 grid gap-2">
          {actions.map((action) => {
            const className = [
              "flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
              action.variant === "secondary"
                ? "border border-blue-200 bg-white text-blue-900 hover:bg-blue-50"
                : "bg-teal-400 text-slate-950 hover:bg-teal-500",
            ].join(" ");

            return action.href ? (
              <a
                key={action.label}
                href={action.href}
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </a>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface KidExplanationFlowProps {
  steps: Step[];
  miniPracticeContext?: RuntimeMiniPracticeContext;
  onPracticeMore?: () => void;
  onViewLesson?: () => void;
  practiceHref?: string;
  lessonHref?: string;
  canViewLesson?: boolean;
}

export function KidExplanationFlow({
  steps,
  miniPracticeContext,
  onPracticeMore,
  onViewLesson,
  practiceHref,
  lessonHref,
  canViewLesson = false,
}: KidExplanationFlowProps) {
  const { t, language } = useLanguage();
  const resolveText = useResolveText();
  const isFr = language === "fr";

  // Current step revealed (0-based). Starts at 0 so the first card is visible immediately.
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep >= steps.length - 1;
  const isDone = currentStep >= steps.length;
  const canGoBack = currentStep > 0;

  if (!steps?.length) return null;

  const fallbackTitles = isFr ? KIND_FALLBACK_TITLE_FR : KIND_FALLBACK_TITLE_EN;
  const activeStep = isDone ? null : steps[currentStep];
  const currentStepLabel = `${Math.min(currentStep + 1, steps.length)}/${steps.length}`;
  const isCheckStep = activeStep?.kind === "check";
  const completionActions: CompletionAction[] = [
    ...(onPracticeMore
      ? [{
          label: isFr ? "Continuer à s’entraîner →" : "Keep practicing →",
          href: practiceHref,
          onClick: onPracticeMore,
          variant: "primary" as const,
        }]
      : []),
    ...(canViewLesson && onViewLesson
      ? [{
          label: isFr ? "Revoir la leçon →" : "Review the lesson →",
          href: lessonHref,
          onClick: onViewLesson,
          variant: "secondary" as const,
        }]
      : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-2">
      {/* Active step only */}
      <div className={isCheckStep ? "min-h-0 flex-1 overflow-hidden" : "overflow-visible"}>
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
              className="h-full"
            >
              <CompletionBanner
                youGotThis={t("exercises.explanation.kid.you_got_this") || (isFr ? "Tu vas y arriver, champion !" : "You got this, champion!")}
                actions={completionActions}
              />
            </motion.div>
          ) : activeStep ? (() => {
              const rawTitle = activeStep.title?.trim() || fallbackTitles[activeStep.kind];
              const title = toChildFriendlyExplanationText(rawTitle);
              const rawBody = resolveText(activeStep.body || "");
              const normalizedTitle = rawTitle.toLowerCase();
              const isVisualSupportCard =
                activeStep.kind === "strategy" && (
                  normalizedTitle.includes("regarde") ||
                  normalizedTitle.includes("vois") ||
                  normalizedTitle.includes("see") ||
                  normalizedTitle.includes("look")
                );
              const arithmeticSupportBody =
                isVisualSupportCard && miniPracticeContext?.exercise
                  ? buildKidArithmeticSupportText(
                      miniPracticeContext.exercise,
                      miniPracticeContext.gradeLevel,
                      isFr ? "fr" : "en",
                    )
                  : null;
              const body = toChildFriendlyExplanationText(arithmeticSupportBody || rawBody);
              const icon = KID_ICONS[activeStep.kind] || "✨";

              if (!body) return null;

              const parsedMath =
                (activeStep.kind === "example" || activeStep.kind === "strategy")
                  ? parseArithmetic(body)
                  : null;
              const emoji = parsedMath ? pickEmoji(body) : null;

              return (
                <motion.div
                  key={`${activeStep.kind}-${currentStep}`}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ type: "spring", stiffness: 150, damping: 20 }}
                  className={isCheckStep ? "h-full min-h-0" : "h-auto"}
                >
                  {activeStep.kind === "check" ? (
                    <section className="flex h-full min-h-0 flex-col rounded-xl border border-green-200 bg-white p-2 shadow-sm">
                      <div className="mb-1.5 flex items-center gap-2 px-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">
                          {icon}
                        </div>
                        <h5 className="text-[15px] font-bold leading-tight text-green-900 sm:text-base">
                          {title}
                        </h5>
                      </div>

                      <div className="min-h-0 flex-1">
                        <RuntimeMiniPracticeInline
                          context={miniPracticeContext}
                          fallbackBody={body}
                          variant="kid-fit"
                        />
                      </div>
                    </section>
                  ) : (
                    <AnimatedStepCard
                      kind={activeStep.kind}
                      icon={icon}
                      title={title}
                      index={currentStep}
                      animate={false}
                      isCurrent={true}
                      isCompleted={false}
                      fillHeight={false}
                    >
                      {parsedMath ? (
                      <div className="space-y-2">
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
                      <p className="whitespace-pre-wrap break-words">{body}</p>
                    )}
                    </AnimatedStepCard>
                  )}
                </motion.div>
              );
            })() : null}
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      {!isDone && (
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: canGoBack ? 1.02 : 1 }}
            onClick={() => {
              if (canGoBack) {
                setCurrentStep((prev) => Math.max(0, prev - 1));
              }
            }}
            disabled={!canGoBack}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
          >
            {isFr ? "← Étape précédente" : "← Previous step"}
          </motion.button>

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
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors sm:text-sm"
          >
            {isLast
              ? t("exercises.explanation.kid.got_it")
              : t("exercises.explanation.kid.next_step")}
          </motion.button>
          </div>

          <div className="flex justify-end">
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
              {currentStepLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
