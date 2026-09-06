import React from "react";
import { HelpCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useAdmin } from "@/context/AdminContext";
import {
  buildDirectArithmeticMiniPracticeForContext,
  generateRuntimeMiniPractice,
  hasArithmeticManipulativeLanguage,
  isVerticalOperationVisualText,
  isMiniPracticeAnswerCorrect,
  type RuntimeMiniPractice,
  type RuntimeMiniPracticeContext,
} from "./runtimeMiniPractice";
import { trackLearningInteraction } from "@/services/learningAnalytics";

interface RuntimeMiniPracticeInlineProps {
  context?: RuntimeMiniPracticeContext;
  fallbackBody: string;
  variant?: "default" | "kid-fit";
}

type AnswerState = "idle" | "correct" | "incorrect";

const shouldSpanFullWidthChoice = (label: string) =>
  label.trim().length > 18 || /\s/.test(label.trim());

const SIMPLE_TEN_TOKEN_REGEX = /\[\|{4}\]|\[10\]/g;
const SIMPLE_UNIT_TOKEN_REGEX = /\[1\]|•/g;
const COUNTED_BASE_TEN_TOKEN_REGEX = /\[(\d+)\s*(barres?|dizaines?|tens?|rods?|cubes?|unités?|unites?|units?)\]/gi;
const BASE_TEN_DETECT_REGEX = /\[\|{4}\]|\[10\]|\[1\]|•|\[(\d+)\s*(barres?|dizaines?|tens?|rods?|cubes?|unités?|unites?|units?)\]/i;

function isBaseTenVisualText(visualText?: string | null): boolean {
  if (!visualText) return false;
  return BASE_TEN_DETECT_REGEX.test(visualText);
}

type BaseTenSegment =
  | { type: "text"; value: string }
  | { type: "ten" }
  | { type: "unit" };

function parseBaseTenSegments(text: string): BaseTenSegment[] {
  const segments: BaseTenSegment[] = [];
  let lastIndex = 0;
  const matches = [
    ...text.matchAll(SIMPLE_TEN_TOKEN_REGEX),
    ...text.matchAll(SIMPLE_UNIT_TOKEN_REGEX),
    ...text.matchAll(COUNTED_BASE_TEN_TOKEN_REGEX),
  ].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  for (const match of matches) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const rawText = text.slice(lastIndex, index);
      if (rawText) segments.push({ type: "text", value: rawText });
    }

    const token = match[0];
    const countedType = match[2]?.toLowerCase?.() ?? "";
    const count = Number.parseInt(match[1] ?? "", 10);

    if (token === "[1]" || token === "•") {
      segments.push({ type: "unit" });
    } else if (token === "[10]" || token === "[||||]") {
      segments.push({ type: "ten" });
    } else if (Number.isFinite(count) && count > 0) {
      const normalizedCount = Math.min(count, 20);
      const isTen =
        countedType.startsWith("barre") ||
        countedType.startsWith("dizaine") ||
        countedType.startsWith("ten") ||
        countedType.startsWith("rod");

      const nextSegments = Array.from({ length: normalizedCount }, () => ({
        type: isTen ? "ten" : "unit",
      } as BaseTenSegment));

      segments.push(...nextSegments);
    } else {
      segments.push({ type: "text", value: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    const rawText = text.slice(lastIndex);
    if (rawText) segments.push({ type: "text", value: rawText });
  }

  return segments;
}

function BaseTenChip({ type }: { type: "ten" | "unit" }) {
  if (type === "ten") {
    return <span className="inline-block h-4 w-10 rounded-md border border-sky-300 bg-sky-200 align-middle" aria-label="dizaine" />;
  }

  return <span className="inline-block h-3.5 w-3.5 rounded-sm border border-emerald-300 bg-emerald-200 align-middle" aria-label="unité" />;
}

function BaseTenInline({ text }: { text: string }) {
  const segments = parseBaseTenSegments(text);

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 leading-7">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <span key={`${segment.type}-${index}`} className="whitespace-pre-wrap text-slate-800">
              {segment.value}
            </span>
          );
        }

        return <BaseTenChip key={`${segment.type}-${index}`} type={segment.type} />;
      })}
    </div>
  );
}

function BaseTenVisual({ visualText }: { visualText: string }) {
  const lines = visualText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="rounded-xl border bg-slate-50 p-2.5">
      <div className="space-y-2.5">
        {lines.map((line, index) => {
          const colonIndex = line.indexOf(":");
          const hasLabel = colonIndex > 0;
          const label = hasLabel ? line.slice(0, colonIndex).trim() : "";
          const content = hasLabel ? line.slice(colonIndex + 1).trim() : line;

          if (hasLabel) {
            return (
              <div key={index} className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1">
                <span className="pt-0.5 text-sm font-semibold text-slate-900">{label}</span>
                <BaseTenInline text={content} />
              </div>
            );
          }

          return (
            <div key={index} className="text-sm leading-7 text-slate-700">
              <BaseTenInline text={content} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniPracticeOperationVisual({ visualText }: { visualText: string }) {
  return (
    <div className="rounded-xl border bg-muted/50 px-2.5 py-2.5">
      <div className="flex justify-start overflow-x-auto">
        <pre className="min-w-[7rem] whitespace-pre font-mono text-base leading-6 tabular-nums text-foreground sm:text-lg sm:leading-7">
          {visualText}
        </pre>
      </div>
    </div>
  );
}

function MiniPracticeVisual({ visualText }: { visualText: string }) {
  if (isVerticalOperationVisualText(visualText)) {
    return <MiniPracticeOperationVisual visualText={visualText} />;
  }

  if (isBaseTenVisualText(visualText)) {
    return <BaseTenVisual visualText={visualText} />;
  }

  return (
    <pre className="overflow-x-auto rounded-xl border bg-muted/50 p-3 font-mono text-sm leading-6 text-foreground whitespace-pre-wrap">
      {visualText}
    </pre>
  );
}

function compactPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 120) return cleaned;

  const sentenceBreak = cleaned.search(/[.!?]\s/);
  if (sentenceBreak > 0 && sentenceBreak <= 120) {
    return cleaned.slice(0, sentenceBreak + 1).trim();
  }

  return `${cleaned.slice(0, 117).trim()}…`;
}

function normalizeChoiceValue(value: string): string {
  return value.trim().toLowerCase();
}

export function RuntimeMiniPracticeInline({
  context,
  fallbackBody,
  variant = "default",
}: RuntimeMiniPracticeInlineProps) {
  const { t } = useLanguage();
  const { selectedModelId } = useAdmin();
  const [practice, setPractice] = React.useState<RuntimeMiniPractice | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [selectedChoice, setSelectedChoice] = React.useState("");
  const [shortAnswer, setShortAnswer] = React.useState("");
  const [orderedIds, setOrderedIds] = React.useState<string[]>([]);
  const [showHint, setShowHint] = React.useState(false);
  const [answerState, setAnswerState] = React.useState<AnswerState>("idle");
  const attemptNumberRef = React.useRef(0);
  const hintUsedRef = React.useRef(false);

  const resetInteraction = React.useCallback(() => {
    setSelectedChoice("");
    setShortAnswer("");
    setOrderedIds([]);
    setShowHint(false);
    setAnswerState("idle");
    hintUsedRef.current = false;
  }, []);

  const loadPractice = React.useCallback(async () => {
    if (!context || context.enabled === false) {
      setPractice(null);
      setFailed(true);
      return;
    }

    setLoading(true);
    setFailed(false);
    attemptNumberRef.current = 0;
    resetInteraction();

    const generated = await generateRuntimeMiniPractice({
      ...context,
      modelId: context.modelId || selectedModelId,
    });

    const safeGenerated =
      generated && hasArithmeticManipulativeLanguage(generated)
        ? buildDirectArithmeticMiniPracticeForContext(context, generated.learningStyleUsed) || generated
        : generated;

    setPractice(safeGenerated);
    setFailed(!safeGenerated);
    setLoading(false);

    if (safeGenerated) {
      trackLearningInteraction({
        eventType: "runtime_mini_practice_generated",
        learningStyleUsed: safeGenerated.learningStyleUsed,
        supportType: safeGenerated.learningStyleUsed,
        practiceStyle: safeGenerated.learningStyleUsed,
        subject: context.subject,
        concept: safeGenerated.concept,
        metadata: {
          questionType: safeGenerated.questionType,
          hasVisualText: Boolean(safeGenerated.visualText),
        },
      });
    }
  }, [context, resetInteraction, selectedModelId]);

  React.useEffect(() => {
    loadPractice();
  }, [loadPractice]);

  const handleCheck = () => {
    if (!practice) return;

    const answer = practice.questionType === "ordering"
      ? orderedIds
      : practice.questionType === "short_answer"
        ? shortAnswer
        : selectedChoice;

    const hasAnswer = Array.isArray(answer) ? answer.length > 0 : answer.trim().length > 0;
    if (!hasAnswer) return;

    const wasCorrect = isMiniPracticeAnswerCorrect(practice, answer);
    const attemptNumber = attemptNumberRef.current + 1;
    attemptNumberRef.current = attemptNumber;
    setAnswerState(wasCorrect ? "correct" : "incorrect");

    trackLearningInteraction({
      eventType: "runtime_mini_practice_answered",
      learningStyleUsed: practice.learningStyleUsed,
      supportType: practice.learningStyleUsed,
      practiceStyle: practice.learningStyleUsed,
      subject: context?.subject,
      concept: practice.concept,
      questionId: practice.id,
      questionKind: practice.questionType,
      wasCorrect,
      attemptNumber,
      hintUsed: hintUsedRef.current,
      metadata: {
        hasVisualText: Boolean(practice.visualText),
      },
    });
  };

  const handleTryAgain = () => {
    trackLearningInteraction({
      eventType: "runtime_mini_practice_try_again_clicked",
      learningStyleUsed: practice?.learningStyleUsed || context?.learningStyle,
      supportType: practice?.learningStyleUsed || context?.learningStyle,
      practiceStyle: practice?.learningStyleUsed || context?.learningStyle,
      subject: context?.subject,
      concept: practice?.concept,
      questionId: practice?.id,
      questionKind: practice?.questionType,
    });
    resetInteraction();
  };

  const handleHintClick = () => {
    const nextShowHint = !showHint;
    setShowHint(nextShowHint);
    if (nextShowHint) {
      hintUsedRef.current = true;
      trackLearningInteraction({
        eventType: "runtime_mini_practice_hint_clicked",
        learningStyleUsed: practice?.learningStyleUsed || context?.learningStyle,
        supportType: practice?.learningStyleUsed || context?.learningStyle,
        practiceStyle: practice?.learningStyleUsed || context?.learningStyle,
        subject: context?.subject,
        concept: practice?.concept,
        questionId: practice?.id,
        questionKind: practice?.questionType,
      });
    }
  };

  const handleTryAnother = () => {
    trackLearningInteraction({
      eventType: "runtime_mini_practice_try_another_clicked",
      learningStyleUsed: practice?.learningStyleUsed || context?.learningStyle,
      supportType: practice?.learningStyleUsed || context?.learningStyle,
      practiceStyle: practice?.learningStyleUsed || context?.learningStyle,
      subject: context?.subject,
      concept: practice?.concept,
      questionId: practice?.id,
      questionKind: practice?.questionType,
    });
    loadPractice();
  };

  const handleOrderPick = (id: string) => {
    setAnswerState("idle");
    setOrderedIds((current) =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
        {t("exercises.explanation.mini_practice.loading")}
      </div>
    );
  }

  if (failed || !practice) {
    return (
      <div className="whitespace-pre-wrap break-words">
        {fallbackBody}
      </div>
    );
  }

  const canCheck = practice.questionType === "ordering"
    ? orderedIds.length > 0
    : practice.questionType === "short_answer"
      ? shortAnswer.trim().length > 0
      : selectedChoice.trim().length > 0;
  const isKidFit = variant === "kid-fit";
  const promptText = isKidFit ? compactPrompt(practice.prompt) : practice.prompt;
  const correctChoiceId = practice.questionType === "multiple_choice" && !Array.isArray(practice.correctAnswer)
    ? (
        practice.choices?.find((choice) => {
          const normalizedCorrect = normalizeChoiceValue(practice.correctAnswer as string);
          return (
            normalizeChoiceValue(choice.id) === normalizedCorrect ||
            normalizeChoiceValue(choice.label) === normalizedCorrect
          );
        })?.id ?? null
      )
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`min-h-0 flex-1 ${isKidFit ? "space-y-2 overflow-hidden" : "space-y-3 overflow-y-auto pr-1"}`}>
        {practice.visualText && (
          <MiniPracticeVisual visualText={practice.visualText} />
        )}

        <p className={`${isKidFit ? "text-[13px] leading-snug" : "text-sm leading-relaxed"} text-muted-foreground whitespace-pre-wrap break-words`}>
          {promptText}
        </p>

        {practice.questionType === "multiple_choice" && (
          <div className={`grid grid-cols-1 ${isKidFit ? "gap-1.5" : "gap-2"}`}>
            {practice.choices?.map(choice => {
              const selected = selectedChoice === choice.id;
              const fullWidth = shouldSpanFullWidthChoice(choice.label);
              const isSubmittedCorrect = answerState === "correct" && selected;
              const isSubmittedIncorrect = answerState === "incorrect" && selected;
              const idleSelected = answerState === "idle" && selected;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => {
                    setSelectedChoice(choice.id);
                    setAnswerState("idle");
                  }}
                  className={[
                    `w-full rounded-xl border text-left font-medium transition-colors ${isKidFit ? "px-3 py-2 text-[13px] leading-snug" : "px-3 py-2.5 text-sm"}`,
                    isSubmittedCorrect
                      ? "border-green-500 bg-green-50 text-green-900"
                      : isSubmittedIncorrect
                        ? "border-red-400 bg-red-50 text-red-900"
                        : idleSelected
                          ? "border-slate-400 bg-slate-50 text-foreground"
                          : "bg-background hover:bg-muted/70",
                    fullWidth ? "col-span-1" : "",
                  ].join(" ")}
                >
                  <span className="font-semibold">{choice.id}.</span> {choice.label}
                </button>
              );
            })}
          </div>
        )}

        {practice.questionType === "short_answer" && (
          <Input
            value={shortAnswer}
            onChange={(event) => {
              setShortAnswer(event.target.value);
              setAnswerState("idle");
            }}
            aria-label={practice.prompt}
            className={isKidFit ? "h-9" : "h-10"}
          />
        )}

        {practice.questionType === "ordering" && (
          <div className={isKidFit ? "space-y-1.5" : "space-y-2"}>
            <div className={`flex flex-wrap ${isKidFit ? "gap-1.5" : "gap-2"}`}>
              {practice.choices?.map(choice => {
                const position = orderedIds.indexOf(choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleOrderPick(choice.id)}
                    className={[
                      `rounded-lg border transition-colors ${isKidFit ? "px-2.5 py-1.5 text-[13px] leading-snug" : "px-3 py-2 text-sm"}`,
                      position >= 0 ? "border-primary bg-primary/10" : "bg-background hover:bg-muted/70",
                    ].join(" ")}
                  >
                    {position >= 0 && <span className="mr-2 font-bold">{position + 1}</span>}
                    {choice.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showHint && (
          <div className={`rounded-lg border bg-muted/50 whitespace-pre-wrap text-muted-foreground ${isKidFit ? "p-2 text-[12px] leading-snug" : "p-3 text-sm"}`}>
            {practice.hint}
          </div>
        )}
      </div>

      <div className="mt-2 shrink-0 border-t border-slate-100 pt-1.5">
        {answerState !== "idle" && (
          <div
            className={[
              "mb-2 rounded-xl border px-3 py-2 text-sm font-semibold",
              answerState === "correct"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-amber-200 bg-amber-50 text-amber-900",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true">{answerState === "correct" ? "✅" : "❌"}</span>
              <span>
                {answerState === "correct"
                  ? practice.feedback.correct
                  : practice.feedback.incorrect}
              </span>
            </div>
            {practice.questionType === "multiple_choice" && answerState === "incorrect" && selectedChoice && (
              <div className="mt-1 text-[12px] font-medium text-amber-800">
                {language === "fr"
                  ? `Ta réponse ${selectedChoice} n'est pas correcte.`
                  : `Your answer ${selectedChoice} is not correct.`}
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-wrap ${isKidFit ? "gap-1.5" : "gap-2"}`}>
        <Button size="sm" onClick={handleCheck} disabled={!canCheck} className={isKidFit ? "h-9 px-3 text-xs" : ""}>
          {t("exercises.explanation.mini_practice.check")}
        </Button>
        <Button size="sm" variant="outline" onClick={handleHintClick} className={isKidFit ? "h-9 px-3 text-xs" : ""}>
          <HelpCircle className="h-4 w-4" />
          {t("exercises.explanation.mini_practice.hint")}
        </Button>
        {answerState !== "idle" && (
          <Button size="sm" variant="outline" onClick={handleTryAgain} className={isKidFit ? "h-9 px-3 text-xs" : ""}>
            {t("exercises.explanation.mini_practice.try_again")}
          </Button>
        )}
        {!isKidFit && (
          <Button size="sm" variant="ghost" onClick={handleTryAnother}>
          <RefreshCcw className="h-4 w-4" />
          {t("exercises.explanation.mini_practice.try_another")}
          </Button>
        )}
        </div>
      </div>
    </div>
  );
}
