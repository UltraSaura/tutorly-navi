import React, { useState } from 'react';
import type { Question } from '@/types/quiz-bank';
import { evaluateQuestion } from '@/utils/quizEvaluation';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  onChange?: (value: any) => void;
  onFinish?: (correct: boolean, tries: number) => void;
  onSkip?: () => void;
  allowRetry?: boolean;
}

export function QuestionCard({
  question,
  onChange,
  onFinish,
  onSkip,
  allowRetry = false
}: QuestionCardProps) {
  const [value, setValue] = useState<any>(
    question.kind === "multi" ? [] : ""
  );
  const [tries, setTries] = useState(0);

  const setVal = (v: any) => {
    setValue(v);
    onChange?.(v);
  };

  const submitIfTimeline = () => {
    if (!onFinish) return;
    const ok = evaluateQuestion(question, value);
    if (!ok && allowRetry && tries < 1) {
      setTries(t => t + 1);
      return;
    }
    onFinish(ok, tries);
  };

  const swap = (arr: string[], i: number, j: number) => {
    const x = [...arr];
    [x[i], x[j]] = [x[j], x[i]];
    return x;
  };

  return (
    <div className="max-w-md w-full rounded-2xl bg-white dark:bg-card shadow-xl p-4">
      <h3 className="text-lg font-semibold mb-3">{question.prompt}</h3>
      
      {question.kind === "single" && (
        <div className="space-y-2">
          {question.choices.map(c => (
            <button
              key={c.id}
              onClick={() => setVal(c.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl border transition-all",
                value === c.id
                  ? "border-primary bg-primary/10"
                  : "border-neutral-300 hover:border-primary/50"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {question.kind === "multi" && (
        <div className="space-y-2">
          {question.choices.map(c => {
            const checked = Array.isArray(value) && value.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => {
                  const next = checked
                    ? value.filter((x: string) => x !== c.id)
                    : [...value, c.id];
                  setVal(next);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl border transition-all",
                  checked
                    ? "border-primary bg-primary/10"
                    : "border-neutral-300 hover:border-primary/50"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "numeric" && (
        <input
          className="w-full border rounded-2xl px-3 py-2"
          inputMode="numeric"
          type="number"
          value={value}
          onChange={e => setVal(e.target.value)}
        />
      )}

      {question.kind === "ordering" && (
        <ul className="space-y-2">
          {(value.length ? value : (question as any).items).map(
            (it: string, i: number, arr: string[]) => (
              <li
                key={it}
                className="px-3 py-2 rounded-2xl border border-neutral-300 flex justify-between items-center"
              >
                <span>{it}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => i > 0 && setVal(swap(arr, i, i - 1))}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() =>
                      i < arr.length - 1 && setVal(swap(arr, i, i + 1))
                    }
                  >
                    ↓
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {question.hint && tries > 0 && (
        <p className="text-sm mt-3 opacity-80">Indice: {question.hint}</p>
      )}

      {onFinish && (
        <div className="flex gap-2 justify-end mt-4">
          {onSkip && (
            <button
              className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800"
              onClick={onSkip}
            >
              Passer
            </button>
          )}
          <button
            className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black"
            onClick={submitIfTimeline}
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
}

