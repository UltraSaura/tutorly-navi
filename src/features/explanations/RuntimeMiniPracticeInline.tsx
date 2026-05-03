import React from "react";
import { HelpCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useAdmin } from "@/context/AdminContext";
import {
  generateRuntimeMiniPractice,
  isMiniPracticeAnswerCorrect,
  type RuntimeMiniPractice,
  type RuntimeMiniPracticeContext,
} from "./runtimeMiniPractice";

interface RuntimeMiniPracticeInlineProps {
  context?: RuntimeMiniPracticeContext;
  fallbackBody: string;
}

type AnswerState = "idle" | "correct" | "incorrect";

export function RuntimeMiniPracticeInline({ context, fallbackBody }: RuntimeMiniPracticeInlineProps) {
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

  const resetInteraction = React.useCallback(() => {
    setSelectedChoice("");
    setShortAnswer("");
    setOrderedIds([]);
    setShowHint(false);
    setAnswerState("idle");
  }, []);

  const loadPractice = React.useCallback(async () => {
    if (!context || context.enabled === false) {
      setPractice(null);
      setFailed(true);
      return;
    }

    setLoading(true);
    setFailed(false);
    resetInteraction();

    const generated = await generateRuntimeMiniPractice({
      ...context,
      modelId: context.modelId || selectedModelId,
    });

    setPractice(generated);
    setFailed(!generated);
    setLoading(false);
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

    setAnswerState(isMiniPracticeAnswerCorrect(practice, answer) ? "correct" : "incorrect");
  };

  const handleTryAgain = () => {
    resetInteraction();
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

  return (
    <div className="space-y-3">
      <p className="font-medium text-foreground">
        {t("exercises.explanation.mini_practice.intro")}
      </p>

      {practice.visualText && (
        <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {practice.visualText}
        </pre>
      )}

      <p className="whitespace-pre-wrap break-words">{practice.prompt}</p>

      {practice.questionType === "multiple_choice" && (
        <div className="grid gap-2">
          {practice.choices?.map(choice => {
            const selected = selectedChoice === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  setSelectedChoice(choice.id);
                  setAnswerState("idle");
                }}
                className={[
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "bg-background hover:bg-muted/70",
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
        />
      )}

      {practice.questionType === "ordering" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {practice.choices?.map(choice => {
              const position = orderedIds.indexOf(choice.id);
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleOrderPick(choice.id)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
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
        <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {practice.hint}
        </div>
      )}

      {answerState !== "idle" && (
        <div
          className={[
            "rounded-lg border p-3 text-sm font-medium whitespace-pre-wrap",
            answerState === "correct"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          {answerState === "correct" ? practice.feedback.correct : practice.feedback.incorrect}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleCheck} disabled={!canCheck}>
          {t("exercises.explanation.mini_practice.check")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowHint(value => !value)}>
          <HelpCircle className="h-4 w-4" />
          {t("exercises.explanation.mini_practice.hint")}
        </Button>
        {answerState !== "idle" && (
          <Button size="sm" variant="outline" onClick={handleTryAgain}>
            {t("exercises.explanation.mini_practice.try_again")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={loadPractice}>
          <RefreshCcw className="h-4 w-4" />
          {t("exercises.explanation.mini_practice.try_another")}
        </Button>
      </div>
    </div>
  );
}
