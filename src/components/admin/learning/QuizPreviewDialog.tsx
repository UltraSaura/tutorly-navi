import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/quiz-bank';

// ── Per-type correct-answer display ─────────────────────────────────────────

function AnswerDisplay({ question }: { question: Question }) {
  const ui = useInterfaceTranslation();
  switch (question.kind) {

    case 'single':
    case 'multi': {
      return (
        <div className="space-y-2">
          {question.choices.map(c => (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
                c.correct
                  ? 'border-green-400 bg-green-50 dark:bg-green-950/20 font-medium text-green-800 dark:text-green-300'
                  : 'border-border text-muted-foreground'
              )}
            >
              {c.correct && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
              {!c.correct && <span className="h-4 w-4 shrink-0" />}
              {c.label}
            </div>
          ))}
        </div>
      );
    }

    case 'numeric': {
      const q = question as any;
      if (q.answerFormat === 'fraction' && q.fractionAnswer) {
        return (
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="text-3xl font-bold text-green-600">{q.fractionAnswer.numerator}</div>
            <div className="w-12 h-0.5 bg-green-500" />
            <div className="text-3xl font-bold text-green-600">{q.fractionAnswer.denominator}</div>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 text-2xl font-bold text-green-600 py-2">
          <CheckCircle2 className="h-6 w-6" />
          {q.answer}
          {q.range && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {ui("(accepted:")} {q.range.min} – {q.range.max})
            </span>
          )}
        </div>
      );
    }

    case 'ordering': {
      return (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground mb-1">{ui("Correct order:")}</p>
          {question.correctOrder.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 text-sm">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              {item}
            </div>
          ))}
        </div>
      );
    }

    case 'slider': {
      const q = question;
      const pct = ((q.answer - q.min) / (q.max - q.min)) * 100;
      return (
        <div className="space-y-3 py-1">
          <div className="text-3xl font-bold text-green-600 text-center">
            {q.answer}{q.unit}
            {q.tolerance > 0 && (
              <span className="text-base font-normal text-muted-foreground ml-2">± {q.tolerance}</span>
            )}
          </div>
          <div className="relative h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-2">
            <div
              className="absolute left-0 top-0 h-3 rounded-full bg-green-500"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow"
              style={{ left: `calc(${pct}% - 10px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            <span>{q.min}{q.unit}</span>
            <span>{q.max}{q.unit}</span>
          </div>
        </div>
      );
    }

    case 'match': {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{ui("Correct pairs:")}</p>
          {question.pairs.map(pair => (
            <div key={pair.leftId} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 text-sm">
              <span className="font-medium">{pair.left}</span>
              <span className="text-green-500">↔</span>
              <span className="font-medium">{pair.right}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'fill-expr': {
      const q = question;
      const parts = q.template.split(/(_{2,})/g);
      let blankIdx = 0;
      return (
        <div className="space-y-3">
          {/* Expression with answers revealed in blank slots */}
          <div className="px-3 py-3 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 text-lg font-semibold flex flex-wrap items-center justify-center gap-2">
            {parts.map((part, i) => {
              if (/^_{2,}$/.test(part)) {
                const blank = q.blanks[blankIdx] ?? `blank_${blankIdx}`;
                blankIdx++;
                return (
                  <span
                    key={`slot-${i}`}
                    className="inline-flex min-w-[44px] h-10 px-3 rounded-lg bg-green-500 text-white items-center justify-center text-base font-bold"
                  >
                    {q.answers[blank] ?? '?'}
                  </span>
                );
              }
              return <span key={`txt-${i}`}>{part}</span>;
            })}
          </div>

          {/* Suggested-response chips (what the student drags) */}
          {q.chips && q.chips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{ui("Suggested responses (drag targets):")}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {q.chips.map((chip, i) => (
                  <div
                    key={`${chip}-${i}`}
                    className="w-11 h-11 rounded-xl border border-border bg-secondary text-foreground text-base font-semibold flex items-center justify-center shadow-sm"
                  >
                    {chip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer key legend */}
          <div className="flex flex-wrap gap-2 justify-center">
            {q.blanks.map(blank => (
              <Badge key={blank} variant="default" className="text-sm bg-green-500">
                {blank}: {q.answers[blank]}
              </Badge>
            ))}
          </div>
        </div>
      );
    }


    case 'visual': {
      return (
        <div className="text-sm text-muted-foreground border rounded-xl px-3 py-2">
          {ui("Visual question — answer verified by correct segment/angle selection.")}
          {(question.visual as any)?.subtype && (
            <span className="ml-1 font-medium">({(question.visual as any).subtype})</span>
          )}
        </div>
      );
    }

    case 'operation-posee': {
      const q = question;
      const result = q.operation === 'addition' ? q.topNumber + q.bottomNumber : q.topNumber - q.bottomNumber;
      return (
        <div className="text-center space-y-1 font-mono text-2xl font-bold text-green-600 py-2">
          <div>{q.topNumber}</div>
          <div className="flex items-center gap-2 justify-center text-base">
            <span>{q.operation === 'addition' ? '+' : '−'}</span>
            <span>{q.bottomNumber}</span>
          </div>
          <div className="border-t-2 border-green-400 pt-1">= {result}</div>
        </div>
      );
    }

    case 'column-fill': {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {ui("Réponses attendues pour les cases manquantes :")}
          </p>
          <div className="flex flex-wrap gap-2">
            {question.blanks.map((blank) => (
              <Badge key={blank.id} variant="default" className="text-sm bg-green-500">
                {blank.id}: {blank.answer}
              </Badge>
            ))}
          </div>
        </div>
      );
    }

    default:
      return <p className="text-sm text-muted-foreground">{ui("Answer display not available for this type.")}</p>;
  }
}

// ── Main dialog ──────────────────────────────────────────────────────────────

interface QuizPreviewDialogProps {
  questions: Question[];
  open: boolean;
  onClose: () => void;
  onProceedToSave: () => void;
}

export function QuizPreviewDialog({ questions, open, onClose, onProceedToSave }: QuizPreviewDialogProps) {
  const ui = useInterfaceTranslation();
  const [index, setIndex] = useState(0);
  const q = questions[index] ?? null;
  const total = questions.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setIndex(0); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base">{ui("Preview — answers revealed")}</DialogTitle>
            <span className="text-sm text-muted-foreground shrink-0">
              {ui("Question")} {index + 1} / {total}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full mt-2">
            <div
              className="h-1.5 bg-primary rounded-full transition-all"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </DialogHeader>

        {q && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Kind badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">{q.kind}</Badge>
              {(q as any).hide_labels && (
                <Badge variant="outline" className="text-xs">{ui("pie uniquement")}</Badge>
              )}
            </div>

            {/* Prompt */}
            <p className="font-semibold leading-snug">{q.prompt}</p>

            {/* Hint */}
            {q.hint && (
              <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                💡 {q.hint}
              </p>
            )}

            {/* Correct answer */}
            <div>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1.5">
                {ui("✓ Correct answer")}
              </p>
              <AnswerDisplay question={q} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-3 border-t gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {ui("Previous")}
          </Button>

          {index < total - 1 ? (
            <Button size="sm" onClick={() => setIndex(i => i + 1)}>
              {ui("Next")} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => { onProceedToSave(); setIndex(0); }}>
              {ui("Save quiz bank →")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
