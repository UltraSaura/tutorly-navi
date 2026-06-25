import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { SessionProgress } from '@/components/practice/SessionProgress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTrainingItems } from '@/hooks/useExamImport';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import {
  saveTrainingItemAnswer,
  trainingAnswerTypeFromItemType,
  type ExamTrainingItem,
  type TrainingDocument,
} from '@/services/examImportService';
import {
  applyCheckFeedback,
  evaluateTrainingAnswer,
  initialQuestionState,
  questionStateKey,
  revealNextHint,
  updateQuestionAnswer,
  type GuidanceQuestionState,
  type GuidanceStateMap,
  type TrainingQuestion,
} from '@/lib/trainingGuidance';

function normalizeChoices(value: unknown[] | null): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((choice) => {
      if (typeof choice === 'string') return choice;
      if (choice && typeof choice === 'object' && 'label' in choice) return String(choice.label);
      return '';
    })
    .filter((choice) => choice.trim().length > 0);
}

function DocumentTable({ document }: { document: TrainingDocument }) {
  if (!document.table) return null;

  return (
    <div className="mt-2 max-w-full overflow-x-auto rounded-md border border-border/60 bg-background">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs sm:text-sm">
        {document.caption ? (
          <caption className="caption-top px-3 py-2 text-left text-sm font-medium text-foreground">
            {document.caption}
          </caption>
        ) : null}
        <thead className="bg-muted/60">
          <tr>
            {document.table.headers.map((header, index) => (
              <th key={`${header}-${index}`} scope="col" className="border-b border-r border-border/60 px-2 py-2 font-semibold last:border-r-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {document.table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="border-r border-t border-border/50 px-2 py-2 last:border-r-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentImage({ document }: { document: TrainingDocument }) {
  const [open, setOpen] = useState(false);
  const src = document.public_url ?? document.local_path;
  if (!src) return null;

  return (
    <>
      <button
        type="button"
        className="mt-2 block w-full overflow-hidden rounded-md border border-border/60 bg-background text-left"
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={document.alt ?? document.label ?? 'Document'} className="h-auto w-full object-contain" loading="lazy" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] bg-background/95 p-3" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-5xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{document.label ?? 'Document'}</p>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <img src={src} alt={document.alt ?? document.label ?? 'Document'} className="mx-auto h-auto max-w-none sm:max-w-full" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TrainingDocuments({ documents }: { documents: TrainingDocument[] }) {
  const visibleDocuments = documents.filter((document) => !document.fallback);
  const fallbackDocuments = documents.filter((document) => document.fallback);
  if (visibleDocuments.length === 0 && fallbackDocuments.length === 0) return null;

  return (
    <section className="space-y-2">
      {visibleDocuments.map((document, index) => {
        const isImageFirst = document.render_mode === 'image_first' && (document.public_url || document.local_path);

        return (
          <div key={document.id ?? `${document.label}-${index}`} className="rounded-md border border-border/60 bg-muted/20 p-3">
            <p className="text-sm font-medium">{document.label ?? 'Document'}</p>
            {isImageFirst ? (
              <div className="space-y-3">
                <DocumentImage document={document} />
                {document.table && (
                  <details className="mt-2 rounded-md border border-dashed border-border/70 p-2">
                    <summary className="cursor-pointer text-sm font-medium">Voir en tableau accessible</summary>
                    <div className="mt-2">
                      <DocumentTable document={document} />
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <>
                {document.type === 'table' ? <DocumentTable document={document} /> : null}
                {document.type === 'image' ? <DocumentImage document={document} /> : null}
              </>
            )}
            {document.content && !isImageFirst ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{document.content}</p>
            ) : null}
          </div>
        );
      })}
      {fallbackDocuments.length > 0 ? (
        <details className="rounded-md border border-dashed border-border/70 bg-muted/10 p-3">
          <summary className="cursor-pointer text-sm font-medium">Voir la source visuelle</summary>
          <div className="mt-3 space-y-3">
            {fallbackDocuments.map((document, index) => (
              <DocumentImage key={document.id ?? `${document.label}-fallback-${index}`} document={document} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function AnswerControl({
  question,
  value,
  onChange,
}: {
  question: TrainingQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const choices = normalizeChoices(question.choices ?? null);

  if (question.answer_type === 'multiple_choice' && choices.length > 0) {
    return (
      <RadioGroup value={value} onValueChange={onChange} className="space-y-2">
        {choices.map((choice, index) => (
          <Label key={`${choice}-${index}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 text-sm">
            <RadioGroupItem value={choice} className="mt-0.5" />
            <span>{choice}</span>
          </Label>
        ))}
      </RadioGroup>
    );
  }

  if (question.answer_type === 'free_response') {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="Ta réponse"
        className="min-h-32"
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      inputMode={question.answer_type === 'numeric' || question.answer_type === 'math' ? 'decimal' : 'text'}
      placeholder="Ta réponse"
    />
  );
}

function questionsForItem(item: ExamTrainingItem): TrainingQuestion[] {
  if (Array.isArray(item.questions) && item.questions.length > 0) return item.questions;
  return [
    {
      id: 'q1',
      label: '1.',
      prompt: item.prompt,
      answer_type: trainingAnswerTypeFromItemType(item.item_type),
      choices: item.choices,
      expected_answer: item.expected_answer,
      guidance: {
        hints: [],
        correct_feedback: 'Bonne réponse.',
        almost_feedback: 'Tu es proche.',
        incorrect_feedback: 'Essaie d’abord de répondre à cette question.',
      },
    },
  ];
}

export function shouldPersistTrainingAnswer(isPreviewing: boolean): boolean {
  return !isPreviewing;
}

export function TrainingQuestionBlock({
  itemId,
  question,
  state,
  onAnswerChange,
  onCheck,
  onHint,
}: {
  itemId: string;
  question: TrainingQuestion;
  state: GuidanceQuestionState;
  onAnswerChange: (value: string) => void;
  onCheck: () => void;
  onHint: () => void;
}) {
  const { t } = useTranslation();
  const hints = question.guidance?.hints ?? [];
  const visibleHints = hints.filter((hint) => hint.level <= state.hint_level);
  const hasNextHint = state.hint_level < hints.length;

  return (
    <section className="space-y-3 rounded-md border border-border/60 bg-muted/10 p-3" data-item-id={itemId} data-question-id={question.id}>
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-6">
          {question.label ? <span className="mr-2 text-muted-foreground">{question.label}</span> : null}
          <span>{question.prompt}</span>
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Réponse</p>
        <AnswerControl question={question} value={state.answer} onChange={onAnswerChange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onCheck}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          {t('practice.guidance.checkAnswer')}
        </Button>
        <Button type="button" variant="outline" onClick={onHint} disabled={!hasNextHint}>
          <Lightbulb className="mr-1 h-4 w-4" />
          {state.hint_level > 0 ? t('practice.guidance.nextHint') : t('practice.guidance.hint')}
        </Button>
        <span className="self-center text-xs text-muted-foreground">
          {state.hint_level} / {hints.length}
        </span>
      </div>

      {visibleHints.length > 0 ? (
        <div className="space-y-2">
          {visibleHints.map((hint) => (
            <div key={hint.level} className="rounded-md border border-border/60 bg-background p-3 text-sm leading-6">
              <span className="mr-2 font-semibold">{t('practice.guidance.hint')} {hint.level}</span>
              {hint.text}
            </div>
          ))}
        </div>
      ) : null}

      {state.feedback ? (
        <div className="rounded-md border border-border/60 bg-background p-3 text-sm leading-6" role="status">
          {state.feedback}
        </div>
      ) : null}
    </section>
  );
}

export default function TrainingSessionPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') ?? undefined;
  const sourcePaperId = searchParams.get('sourcePaperId') ?? undefined;
  const activeSchoolLevel = useActiveSchoolLevel();
  const activeLevel = activeSchoolLevel.isPreviewing
    ? activeSchoolLevel.normalizedLevel ?? '__no_active_level__'
    : searchParams.get('level') ?? activeSchoolLevel.normalizedLevel ?? '__no_active_level__';
  const limit = Number(searchParams.get('limit') ?? '10');
  const itemsQuery = useTrainingItems({
    subject_slug: subject,
    paper_id: sourcePaperId,
    level: activeLevel,
    status: 'published',
    limit: Number.isFinite(limit) ? limit : 10,
  });
  const [index, setIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<GuidanceStateMap>({});

  const items = itemsQuery.data ?? [];
  const item = items[index] ?? null;
  const questions = useMemo(() => (item ? questionsForItem(item) : []), [item]);

  function goTo(nextIndex: number) {
    setIndex(Math.max(0, Math.min(nextIndex, Math.max(items.length - 1, 0))));
  }

  function stateForQuestion(itemId: string, questionId: string): GuidanceQuestionState {
    return questionStates[questionStateKey(itemId, questionId)] ?? initialQuestionState();
  }

  function handleAnswerChange(itemId: string, questionId: string, value: string) {
    setQuestionStates((current) => updateQuestionAnswer(current, questionStateKey(itemId, questionId), value));
  }

  async function handleHint(item: ExamTrainingItem, question: TrainingQuestion) {
    const itemId = item.id;
    const key = questionStateKey(itemId, question.id);
    const maxHintLevel = question.guidance?.hints?.length ?? 0;
    const currentState = questionStates[key] ?? initialQuestionState();
    const nextHintLevel = Math.min(currentState.hint_level + 1, Math.max(maxHintLevel, 0));
    setQuestionStates((current) => revealNextHint(current, key, maxHintLevel));

    if (!shouldPersistTrainingAnswer(activeSchoolLevel.isPreviewing)) return;

    try {
      await saveTrainingItemAnswer({
        item_id: item.id,
        question_id: question.id,
        answer_text: currentState.answer,
        hint_level: nextHintLevel,
        guidance_feedback: currentState.feedback,
        is_correct: currentState.is_correct,
      });
    } catch {
      // La sauvegarde ne bloque pas le guidage local.
    }
  }

  async function handleCheck(item: ExamTrainingItem, question: TrainingQuestion) {
    const key = questionStateKey(item.id, question.id);
    const state = questionStates[key] ?? initialQuestionState();
    const result = evaluateTrainingAnswer({
      answer: state.answer,
      expectedAnswer: question.expected_answer,
      guidance: question.guidance,
      fallbackCorrect: t('practice.guidance.correct'),
      fallbackAlmost: t('practice.guidance.almost'),
      fallbackIncorrect: t('practice.guidance.tryFirst'),
    });

    setQuestionStates((current) => applyCheckFeedback(current, key, result));

    if (!shouldPersistTrainingAnswer(activeSchoolLevel.isPreviewing)) return;

    try {
      await saveTrainingItemAnswer({
        item_id: item.id,
        question_id: question.id,
        answer_text: state.answer,
        hint_level: state.hint_level,
        guidance_feedback: result.feedback,
        is_correct: result.isCorrect,
      });
    } catch {
      // La sauvegarde ne bloque pas le guidage local.
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageMeta title="Session d'entraînement" description="Exercices interactifs issus des annales normalisées." />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(subject ? `/practice/${encodeURIComponent(subject)}` : '/practice')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          {item ? <Badge variant="secondary">{item.source_label ?? item.exam_style ?? 'Entraînement'}</Badge> : null}
        </div>

        {itemsQuery.isLoading ? (
          <Card>
            <CardContent className="space-y-4 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : itemsQuery.isError ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base">Impossible de charger les exercices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                La table des entraînements n'est peut-être pas encore migrée ou publiée.
              </p>
            </CardContent>
          </Card>
        ) : !item ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Aucun exercice publié</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Les items importés commencent en brouillon sauf validation explicite.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <SessionProgress current={index + 1} total={items.length} />
            <Card className="border-border/80">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{item.item_type.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{item.difficulty}</Badge>
                  {item.source_year ? <Badge variant="outline">{item.source_year}</Badge> : null}
                </div>
                <CardTitle className="text-lg leading-7">{item.prompt}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {activeSchoolLevel.isPreviewing ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    Les réponses ne sont pas enregistrées en mode aperçu.
                  </div>
                ) : null}
                {item.context ? <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.context}</p> : null}
                <TrainingDocuments documents={item.documents ?? []} />

                <div className="space-y-3">
                  {questions.map((question) => (
                    <TrainingQuestionBlock
                      key={question.id}
                      itemId={item.id}
                      question={question}
                      state={stateForQuestion(item.id, question.id)}
                      onAnswerChange={(value) => handleAnswerChange(item.id, question.id, value)}
                      onHint={() => void handleHint(item, question)}
                      onCheck={() => void handleCheck(item, question)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                onClick={() => setQuestionStates((current) => {
                  const next = { ...current };
                  for (const question of questions) next[questionStateKey(item.id, question.id)] = initialQuestionState();
                  return next;
                })}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Effacer
              </Button>
              <Button onClick={() => goTo(index + 1)} disabled={index >= items.length - 1}>
                Suivant
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
