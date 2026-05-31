import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTrainingItems } from '@/hooks/useExamImport';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import {
  saveTrainingItemAnswer,
  validateTrainingAnswer,
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
    <div className="max-w-full overflow-x-auto rounded-md border border-border/60 bg-background">
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
        className="flex w-full justify-center overflow-hidden rounded-md border border-border/60 bg-background p-2"
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={document.alt ?? document.label ?? 'Document'}
          className="mx-auto max-h-[300px] w-auto max-w-full object-contain sm:max-h-[380px]"
          loading="lazy"
        />
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

function ExerciseDocuments({ documents }: { documents: TrainingDocument[] }) {
  const visibleDocuments = documents.filter((doc) => !doc.fallback);
  const fallbackDocuments = documents.filter((doc) => doc.fallback);
  if (visibleDocuments.length === 0 && fallbackDocuments.length === 0) return null;

  return (
    <div className="space-y-4">
      {visibleDocuments.map((document, index) => {
        const isImageFirst = document.render_mode === 'image_first' && (document.public_url || document.local_path);
        return (
          <div key={document.id ?? `${document.label}-${index}`}>
            {document.label ? (
              <p className="mb-1 text-sm font-medium text-muted-foreground">{document.label}</p>
            ) : null}
            {isImageFirst ? (
              <div className="space-y-2">
                <DocumentImage document={document} />
                {document.table ? (
                  <details className="rounded-md border border-dashed border-border/70 p-2">
                    <summary className="cursor-pointer text-sm">Voir en tableau accessible</summary>
                    <div className="mt-2">
                      <DocumentTable document={document} />
                    </div>
                  </details>
                ) : null}
              </div>
            ) : (
              <>
                {document.type === 'table' ? <DocumentTable document={document} /> : null}
                {document.type === 'image' ? <DocumentImage document={document} /> : null}
                {document.content ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{document.content}</p>
                ) : null}
              </>
            )}
          </div>
        );
      })}
      {fallbackDocuments.length > 0 ? (
        <details className="rounded-md border border-dashed border-border/70 p-2">
          <summary className="cursor-pointer text-sm">Source visuelle</summary>
          <div className="mt-2 space-y-2">
            {fallbackDocuments.map((doc, i) => (
              <DocumentImage key={doc.id ?? `fallback-${i}`} document={doc} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
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
        placeholder="Votre réponse"
        className="min-h-28"
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      inputMode={question.answer_type === 'numeric' || question.answer_type === 'math' ? 'decimal' : 'text'}
      placeholder="Votre réponse"
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
        incorrect_feedback: "Essaie d'abord de répondre à cette question.",
      },
    },
  ];
}

function displayQuestionLabel(question: TrainingQuestion): string | undefined {
  const childId = question.id.replace(/^\d+-/, '');
  if (/^\d+[a-z]$/i.test(childId)) return `${childId}.`;
  return question.label;
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
  const label = displayQuestionLabel(question);

  return (
    <div className="space-y-3" data-item-id={itemId} data-question-id={question.id}>
      <p className="text-sm font-semibold leading-6">
        {label ? <span className="mr-2 text-muted-foreground">{label}</span> : null}
        <span>{question.prompt}</span>
      </p>

      <div className="space-y-2">
        <AnswerControl question={question} value={state.answer} onChange={onAnswerChange} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onCheck}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          {t('practice.guidance.checkAnswer')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onHint} disabled={!hasNextHint}>
          <Lightbulb className="mr-1 h-4 w-4" />
          {state.hint_level > 0 ? t('practice.guidance.nextHint') : t('practice.guidance.hint')}
        </Button>
        {hints.length > 0 ? (
          <span className="self-center text-xs text-muted-foreground">
            {state.hint_level} / {hints.length}
          </span>
        ) : null}
      </div>

      {visibleHints.length > 0 ? (
        <div className="space-y-2">
          {visibleHints.map((hint) => (
            <div key={hint.level} className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm leading-6">
              <span className="mr-2 font-semibold">{t('practice.guidance.hint')} {hint.level}</span>
              {hint.text}
            </div>
          ))}
        </div>
      ) : null}

      {state.feedback ? (
        <div
          className={[
            "rounded-md border p-3 text-sm leading-6",
            state.is_correct === true
              ? "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100"
              : state.is_correct === false
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
                : "border-border/60 bg-background",
          ].join(" ")}
          role="status"
        >
          <p className="whitespace-pre-wrap">{state.feedback}</p>
        </div>
      ) : null}
    </div>
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
    ? activeSchoolLevel.normalizedLevel ?? undefined
    : searchParams.get('level') ?? activeSchoolLevel.normalizedLevel ?? undefined;
  // When browsing a specific paper, load all its items (a paper rarely has >100 items).
  // When browsing by subject/level without a paper, keep the default cap at 10.
  const defaultLimit = sourcePaperId ? '100' : '10';
  const limit = Number(searchParams.get('limit') ?? defaultLimit);
  const itemsQuery = useTrainingItems({
    subject_slug: subject,
    paper_id: sourcePaperId,
    level: activeLevel,
    status: 'published',
    limit: Number.isFinite(limit) ? limit : 10,
  });
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<GuidanceStateMap>({});

  const items = itemsQuery.data ?? [];

  // Group items by source_label to build exercise groups, then order the groups
  // by exercise number (parsed from the label, e.g. "… - Exercice 4 (14 points)")
  // so exercises always appear in their natural 1, 2, 3… order rather than the
  // order the items happen to come back from the query.
  const exerciseGroups = useMemo(() => {
    const groups: Map<string, ExamTrainingItem[]> = new Map();
    const firstSeen: Map<string, number> = new Map();
    let seq = 0;
    for (const item of items) {
      const key = item.source_label ?? item.id;
      if (!groups.has(key)) {
        groups.set(key, []);
        firstSeen.set(key, seq++);
      }
      groups.get(key)!.push(item);
    }
    const exerciseNumber = (label: string | null | undefined): number => {
      const m = /exercice\s+(\d+)/i.exec(label ?? '');
      return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
    };
    return Array.from(groups.entries())
      .sort(([aKey], [bKey]) => {
        const aNum = exerciseNumber(aKey);
        const bNum = exerciseNumber(bKey);
        if (aNum !== bNum) return aNum - bNum;
        // Fallback: preserve original first-seen order for ungroupable labels.
        return (firstSeen.get(aKey) ?? 0) - (firstSeen.get(bKey) ?? 0);
      })
      .map(([, group]) => group);
  }, [items]);

  const exerciseGroup = exerciseGroups[exerciseIndex] ?? [];
  const firstItem = exerciseGroup[0] ?? null;
  const exerciseLabel = firstItem?.source_label ?? null;
  const exerciseContext = firstItem?.context ?? null;

  // Collect unique documents across the whole exercise group.
  // A document is keyed by public_url (or label as fallback) to detect duplicates.
  // Documents that appear on EVERY item are "exercise-level" and shown once at the top.
  // Documents unique to a single item are "per-question" and shown inline near that item.
  const { exerciseDocuments, itemDocumentMap } = useMemo(() => {
    // Use just the filename from the URL so that the same image stored under
    // different item-scoped paths (e.g. /item-id/diagram-1.webp) is treated as one.
    const docKey = (d: TrainingDocument) => {
      const url: string = (d as any).public_url ?? (d as any).storage_path ?? '';
      if (url) {
        const filename = url.split('/').pop() ?? url;
        return filename;
      }
      return d.label ?? d.type ?? '';
    };
    // Collect all docs with their item IDs
    const allDocKeys = new Map<string, { doc: TrainingDocument; itemIds: Set<string> }>();
    for (const item of exerciseGroup) {
      for (const doc of (item.documents ?? []) as TrainingDocument[]) {
        const k = docKey(doc);
        if (!allDocKeys.has(k)) allDocKeys.set(k, { doc, itemIds: new Set() });
        allDocKeys.get(k)!.itemIds.add(item.id);
      }
    }
    // Exercise-level: doc appears on more than one item (shared)
    const exerciseLevelDocs: TrainingDocument[] = [];
    // Per-item: doc unique to a single item
    const perItemDocs = new Map<string, TrainingDocument[]>(); // item.id → docs
    for (const [, { doc, itemIds }] of allDocKeys) {
      if (itemIds.size > 1) {
        exerciseLevelDocs.push(doc);
      } else {
        const [onlyItemId] = [...itemIds];
        if (!perItemDocs.has(onlyItemId)) perItemDocs.set(onlyItemId, []);
        perItemDocs.get(onlyItemId)!.push(doc);
      }
    }
    return { exerciseDocuments: exerciseLevelDocs, itemDocumentMap: perItemDocs };
  }, [exerciseGroup]);

  // Flatten questions from all items in the current exercise group
  const exerciseQuestions = useMemo(
    () => exerciseGroup.flatMap((item) => questionsForItem(item).map((question) => ({ item, question }))),
    [exerciseGroup],
  );

  function goToExercise(nextIndex: number) {
    setExerciseIndex(Math.max(0, Math.min(nextIndex, Math.max(exerciseGroups.length - 1, 0))));
  }

  function stateForQuestion(itemId: string, questionId: string): GuidanceQuestionState {
    return questionStates[questionStateKey(itemId, questionId)] ?? initialQuestionState();
  }

  function handleAnswerChange(itemId: string, questionId: string, value: string) {
    setQuestionStates((current) => updateQuestionAnswer(current, questionStateKey(itemId, questionId), value));
  }

  function clearExercise() {
    setQuestionStates((current) => {
      const next = { ...current };
      for (const { item, question } of exerciseQuestions) {
        next[questionStateKey(item.id, question.id)] = initialQuestionState();
      }
      return next;
    });
  }

  async function handleHint(item: ExamTrainingItem, question: TrainingQuestion) {
    const key = questionStateKey(item.id, question.id);
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
    const shouldPersist = shouldPersistTrainingAnswer(activeSchoolLevel.isPreviewing);
    let result: { isCorrect: boolean | null; feedback: string };

    try {
      const server = await validateTrainingAnswer({
        item_id: item.id,
        question_id: question.id,
        user_answer: state.answer,
      });
      result = {
        isCorrect: server.is_correct ?? null,
        feedback: server.feedback ?? (server.is_correct ? t('practice.guidance.correct') : t('practice.guidance.almost')),
      };
    } catch {
      result = evaluateTrainingAnswer({
        answer: state.answer,
        expectedAnswer: null,
        guidance: question.guidance,
        fallbackCorrect: t('practice.guidance.correct'),
        fallbackAlmost: t('practice.guidance.almost'),
        fallbackIncorrect: t('practice.guidance.tryFirst'),
      });
    }

    setQuestionStates((current) => applyCheckFeedback(current, key, result));

    if (!shouldPersist) return;

    try {
      await saveTrainingItemAnswer({
        item_id: item.id,
        question_id: question.id,
        answer_text: state.answer,
        hint_level: state.hint_level,
        guidance_feedback: result.feedback,
        feedback: result.feedback,
        is_correct: result.isCorrect,
      });
    } catch {
      // La sauvegarde ne bloque pas le guidage local.
    }
  }

  return (
    <div className="min-h-screen bg-background pb-40 md:pb-32">
      <PageMeta title="Session d'entraînement" description="Exercices interactifs issus des annales normalisées." />
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(subject ? `/practice/${encodeURIComponent(subject)}` : '/practice')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          {firstItem ? (
            <Badge variant="secondary">{firstItem.exam_style ?? 'Entraînement'}</Badge>
          ) : null}
        </div>

        {/* Loading */}
        {itemsQuery.isLoading ? (
          <Card>
            <CardContent className="space-y-4 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-48 w-full" />
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
        ) : exerciseGroups.length === 0 ? (
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
            {/* Preview warning */}
            {activeSchoolLevel.isPreviewing ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                Les réponses ne sont pas enregistrées en mode aperçu.
              </div>
            ) : null}

            {/* Exercise card */}
            <Card className="border-border/80">
              {/* Exercise header */}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{exerciseLabel ?? 'Exercice'}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5 pt-0">
                {/* Context paragraph */}
                {exerciseContext ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{exerciseContext}</p>
                ) : null}

                {/* Documents — full width, no card wrapper */}
                <ExerciseDocuments documents={exerciseDocuments} />

                <Separator />

                {/* Questions */}
                <div className="space-y-6">
                  {(() => {
                    // Track which items have already had their per-question docs shown.
                    const renderedPerItemDocs = new Set<string>();
                    return exerciseQuestions.map(({ item, question }, idx) => {
                      const perDocs = itemDocumentMap.get(item.id) ?? [];
                      const showPerDocs = perDocs.length > 0 && !renderedPerItemDocs.has(item.id);
                      if (showPerDocs) renderedPerItemDocs.add(item.id);
                      return (
                        <div key={`${item.id}-${question.id}`}>
                          {idx > 0 ? <Separator className="mb-6 border-dashed" /> : null}
                          {showPerDocs ? (
                            <div className="mb-3">
                              <ExerciseDocuments documents={perDocs} />
                            </div>
                          ) : null}
                          <TrainingQuestionBlock
                            itemId={item.id}
                            question={question}
                            state={stateForQuestion(item.id, question.id)}
                            onAnswerChange={(value) => handleAnswerChange(item.id, question.id, value)}
                            onHint={() => void handleHint(item, question)}
                            onCheck={() => void handleCheck(item, question)}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Fixed bottom navigation */}
      {exerciseGroups.length > 0 ? (
        <div
          className="fixed bottom-16 left-0 right-0 z-[51] border-t border-border/60 bg-background/95 backdrop-blur-sm md:bottom-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToExercise(exerciseIndex - 1)}
              disabled={exerciseIndex === 0}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Précédent</span>
            </Button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {exerciseIndex + 1} / {exerciseGroups.length}
              </span>
              <Button variant="ghost" size="sm" onClick={clearExercise} title="Effacer les réponses">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToExercise(exerciseIndex + 1)}
              disabled={exerciseIndex >= exerciseGroups.length - 1}
              className="shrink-0"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ArrowRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
