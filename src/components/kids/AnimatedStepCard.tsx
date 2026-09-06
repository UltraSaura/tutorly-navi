import React from "react";
import { motion } from "framer-motion";

type StepKind = "concept" | "example" | "method" | "strategy" | "pitfall" | "check";

interface AnimatedStepCardProps {
  kind: StepKind;
  icon: string;
  title: string;
  children: React.ReactNode;
  /** 0-based index used for stagger delay */
  index?: number;
  /** Whether to start the animation immediately or wait */
  animate?: boolean;
  /** Whether this card is the currently focused step */
  isCurrent?: boolean;
  /** Whether this card has already been completed and should be de-emphasized */
  isCompleted?: boolean;
  /** Whether the card should stretch to consume the available height */
  fillHeight?: boolean;
}

const KIND_COLORS: Record<StepKind, { border: string; bg: string; accent: string; title: string }> = {
  concept:  { border: "border-violet-200", bg: "from-violet-50/60 to-white", accent: "bg-violet-400",  title: "text-violet-900" },
  example:  { border: "border-sky-200",    bg: "from-sky-50/60 to-white",    accent: "bg-sky-400",     title: "text-sky-900"    },
  method:   { border: "border-orange-200", bg: "from-orange-50/60 to-white", accent: "bg-orange-400",  title: "text-orange-900" },
  strategy: { border: "border-teal-200",   bg: "from-teal-50/60 to-white",   accent: "bg-teal-400",    title: "text-teal-900"   },
  pitfall:  { border: "border-red-200",    bg: "from-red-50/60 to-white",    accent: "bg-red-400",     title: "text-red-900"    },
  check:    { border: "border-green-200",  bg: "from-green-50/60 to-white",  accent: "bg-green-400",   title: "text-green-900"  },
};

const KIND_ICON_BG: Record<StepKind, string> = {
  concept:  "bg-violet-100",
  example:  "bg-sky-100",
  method:   "bg-orange-100",
  strategy: "bg-teal-100",
  pitfall:  "bg-red-100",
  check:    "bg-green-100",
};

export function AnimatedStepCard({
  kind,
  icon,
  title,
  children,
  index = 0,
  animate = true,
  isCurrent = false,
  isCompleted = false,
  fillHeight = false,
}: AnimatedStepCardProps) {
  const colors = KIND_COLORS[kind] ?? KIND_COLORS.concept;
  const iconBg = KIND_ICON_BG[kind] ?? KIND_ICON_BG.concept;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 24, scale: 0.96 } : false}
      animate={{
        opacity: isCompleted && !isCurrent ? 0.56 : 1,
        y: 0,
        scale: isCurrent ? 1 : 0.985,
      }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 18,
        delay: index * 0.18,
      }}
      className={`relative flex ${fillHeight ? "h-full min-h-0" : "h-auto"} flex-col overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-4 transition-all ${
        isCurrent ? "shadow-md ring-2 ring-offset-2 ring-violet-200" : "shadow-sm"
      }`}
    >
      {/* Side accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${colors.accent} transition-opacity ${
          isCompleted && !isCurrent ? "opacity-45" : "opacity-100"
        }`}
        aria-hidden="true"
      />

      <div className={`flex ${fillHeight ? "min-h-0 flex-1" : ""} items-start gap-2.5 pl-0.5`}>
        {/* Icon bubble */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg} text-xl shadow-inner transition-opacity ${
            isCompleted && !isCurrent ? "opacity-60" : "opacity-100"
          }`}
          aria-hidden="true"
        >
          {icon}
        </div>

        <div className={`flex ${fillHeight ? "min-h-0 flex-1" : ""} flex-col min-w-0 space-y-2`}>
          <h5
            className={`text-[15px] font-bold leading-tight transition-colors sm:text-base ${
              isCompleted && !isCurrent ? "text-slate-500" : colors.title
            }`}
          >
            {title}
          </h5>
          <div
            className={`${fillHeight ? "min-h-0 flex-1 overflow-y-auto" : ""} pr-0.5 text-sm leading-relaxed font-medium transition-colors ${
              isCompleted && !isCurrent ? "text-slate-400" : "text-gray-700"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
