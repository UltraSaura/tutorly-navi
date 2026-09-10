import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { ColumnFillQ } from "@/types/quiz-bank";
import { useLearningDragDrop } from "./useLearningDragDrop";

type ColumnFillQuestionViewProps = {
  question: ColumnFillQ;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  submittedAnswer?: Record<string, string>;
};

function blankMap(question: ColumnFillQ) {
  return new Map(question.blanks.map((blank) => [blank.id, blank]));
}

function buildBlankSequence(question: ColumnFillQ) {
  const positions = new Map<string, { row: number; column: number; kind: string }>();

  question.layout.rows.forEach((row, rowIndex) => {
    let columnCursor = 0;
    row.cells.forEach((cell) => {
      const span = cell.colSpan ?? 1;
      if (cell.kind === "blank" && cell.blankId) {
        const kind = question.blanks.find((blank) => blank.id === cell.blankId)?.kind ?? "digit";
        positions.set(cell.blankId, { row: rowIndex, column: columnCursor, kind });
      }
      columnCursor += span;
    });
  });

  const rankForColumnMethod = (kind: string) => {
    if (kind === "carry" || kind === "borrow") return 0;
    if (kind === "digit" || kind === "intermediate") return 1;
    if (kind === "quotient") return 2;
    if (kind === "remainder") return 3;
    return 4;
  };

  return [...question.blanks]
    .sort((a, b) => {
      const posA = positions.get(a.id);
      const posB = positions.get(b.id);
      if (!posA || !posB) return 0;

      if (question.operation === "division") {
        if (a.kind === "quotient" && b.kind !== "quotient") return -1;
        if (a.kind !== "quotient" && b.kind === "quotient") return 1;
        if (a.kind === "quotient" && b.kind === "quotient") {
          return posA.column - posB.column || posA.row - posB.row;
        }
        if (a.kind === "remainder" && b.kind !== "remainder") return 1;
        if (a.kind !== "remainder" && b.kind === "remainder") return -1;
        return posA.row - posB.row || posA.column - posB.column;
      }

      if (posA.column !== posB.column) {
        return posB.column - posA.column;
      }

      const rankDiff = rankForColumnMethod(posA.kind) - rankForColumnMethod(posB.kind);
      if (rankDiff !== 0) return rankDiff;

      return posA.row - posB.row;
    })
    .map((blank) => blank.id);
}

export function ColumnFillQuestionView({
  question,
  value,
  onChange,
  submittedAnswer,
}: ColumnFillQuestionViewProps) {
  const ui = useInterfaceTranslation();
  const blankSequence = useMemo(() => buildBlankSequence(question), [question]);
  const [selectedBlankId, setSelectedBlankId] = useState<string | null>(blankSequence[0] ?? null);
  const blanksById = useMemo(() => blankMap(question), [question]);
  const { getDragSourceProps, getDropTargetProps } = useLearningDragDrop();
  const activeValue = submittedAnswer ?? value;
  const isSubmitted = submittedAnswer !== undefined;

  const findNextBlankId = (currentId?: string | null) => {
    const firstEmpty = blankSequence.find((blankId) => !String(value?.[blankId] ?? "").trim());
    if (!currentId) return firstEmpty ?? blankSequence[0] ?? null;

    const currentIndex = blankSequence.findIndex((blankId) => blankId === currentId);
    if (currentIndex === -1) return firstEmpty ?? blankSequence[0] ?? null;

    for (let index = currentIndex + 1; index < blankSequence.length; index += 1) {
      const blankId = blankSequence[index];
      if (!String(value?.[blankId] ?? "").trim()) return blankId;
    }

    return firstEmpty ?? currentId;
  };

  useEffect(() => {
    setSelectedBlankId((current) => {
      if (current && blankSequence.includes(current)) return current;
      return findNextBlankId(current);
    });
  }, [blankSequence]);

  useEffect(() => {
    if (isSubmitted) return;
    if (!selectedBlankId || String(value?.[selectedBlankId] ?? "").trim()) {
      setSelectedBlankId(findNextBlankId(selectedBlankId));
    }
  }, [value, selectedBlankId, isSubmitted]);

  const setBlankValue = (blankId: string, nextValue: string) => {
    onChange({
      ...value,
      [blankId]: nextValue,
    });
    setSelectedBlankId(findNextBlankId(blankId));
  };

  const clearBlankValue = (blankId: string) => {
    const next = { ...value };
    delete next[blankId];
    onChange(next);
    setSelectedBlankId(blankId);
  };

  const getBlankState = (blankId: string) => {
    const expected = blanksById.get(blankId)?.answer ?? "";
    const studentValue = String(activeValue?.[blankId] ?? "").trim();
    const selected = selectedBlankId === blankId;

    if (!isSubmitted) {
      return {
        border: selected ? "#94A3B8" : "#D9E1EA",
        bg: selected ? "#F8FAFC" : "#FFFFFF",
        color: "#0F172A",
      };
    }

    if (!studentValue) {
      return {
        border: "#F7C1C1",
        bg: "#FFF7F7",
        color: "#C0121A",
      };
    }

    if (studentValue === expected) {
      return {
        border: "#9FE1CB",
        bg: "#EAF6EE",
        color: "#166534",
      };
    }

    return {
      border: "#F7C1C1",
      bg: "#FCEBEB",
      color: "#C0121A",
    };
  };

  const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  return (
    <div className="mt-4 space-y-4">
      {question.instructions && (
        <p className="text-sm text-slate-600">{question.instructions}</p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div
          className="mx-auto grid w-fit gap-y-1"
          style={{ gridTemplateColumns: `repeat(${question.layout.columns}, minmax(34px, 44px))` }}
        >
          {question.layout.rows.flatMap((row, rowIndex) =>
            row.cells.map((cell, cellIndex) => {
              const key = `${rowIndex}-${cellIndex}-${cell.kind}-${cell.blankId ?? cell.text ?? "spacer"}`;
              const span = cell.colSpan ?? 1;
              const baseClass = cn(
                "flex min-h-[40px] items-center justify-center text-[28px] font-extrabold text-slate-900",
                cell.className
              );
              const style: CSSProperties = {
                gridColumn: span > 1 ? `span ${span} / span ${span}` : undefined,
                justifyContent:
                  cell.align === "left" ? "flex-start" : cell.align === "right" ? "flex-end" : "center",
                borderTop: cell.borderTop ? "2px solid #0F172A" : undefined,
                borderBottom: cell.borderBottom ? "2px solid #0F172A" : undefined,
                borderLeft: cell.borderLeft ? "2px solid #0F172A" : undefined,
              };

              if (cell.kind === "spacer") {
                return <div key={key} className={baseClass} style={style} />;
              }

              if (cell.kind === "text") {
                return (
                  <div key={key} className={baseClass} style={style}>
                    {cell.text}
                  </div>
                );
              }

              const blankId = cell.blankId ?? "";
              const state = getBlankState(blankId);
              const displayValue = activeValue?.[blankId] ?? "";

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isSubmitted}
                  className={cn(
                    "flex min-h-[40px] items-center justify-center rounded-xl border-2 text-[28px] font-extrabold transition-colors",
                    !isSubmitted && "cursor-pointer"
                  )}
                  style={{
                    ...style,
                    borderColor: state.border,
                    background: state.bg,
                    color: state.color,
                  }}
                  onClick={() => setSelectedBlankId(blankId)}
                  {...(!isSubmitted
                    ? getDropTargetProps(
                        (digit) => {
                          if (!/^\d$/.test(digit)) return;
                          setBlankValue(blankId, digit);
                        },
                        () => setSelectedBlankId(blankId)
                      )
                    : {})}
                >
                  {displayValue || " "}
                </button>
              );
            })
          )}
        </div>
      </div>

      {!isSubmitted && (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {keypadDigits.map((digit) => (
              <button
                key={digit}
                type="button"
                className="h-12 rounded-xl border border-slate-200 bg-white text-xl font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
                {...getDragSourceProps(digit)}
                onClick={() => {
                  if (!selectedBlankId) return;
                  setBlankValue(selectedBlankId, digit);
                }}
              >
                {digit}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={() => {
                if (!selectedBlankId) return;
                clearBlankValue(selectedBlankId);
              }}
            >
              {ui("Effacer la case")}
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              onClick={() => {
                const currentIndex = blankSequence.findIndex((blankId) => blankId === selectedBlankId);
                if (currentIndex <= 0) {
                  setSelectedBlankId(blankSequence[0] ?? null);
                  return;
                }
                setSelectedBlankId(blankSequence[currentIndex - 1]);
              }}
            >
              {ui("Case précédente")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
