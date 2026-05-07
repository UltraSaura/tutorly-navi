import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Circle, FileUp, HelpCircle, Loader2, RotateCcw, Send, XCircle } from 'lucide-react';
import { ProblemJustificationAttachment, ProblemRowStatus, ProblemSubmission, GroupedAnswerPayload } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { processJustificationAttachment } from '@/utils/documentProcessor';
import { cleanGroupedProblemDisplayText } from '@/utils/problemSubmission';

interface GroupedChoiceProblemCardProps {
  problem: ProblemSubmission;
  onSubmitAnswers?: (problemId: string, payload: GroupedAnswerPayload) => Promise<void>;
  onShowExplanation?: (problem: ProblemSubmission, rowId: string) => void;
}

const statusStyles: Record<ProblemRowStatus, string> = {
  correct: 'border-green-200 bg-green-50 text-green-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-800',
  incorrect: 'border-red-200 bg-red-50 text-red-800',
  incomplete: 'border-slate-200 bg-slate-50 text-slate-700',
  ungraded: 'border-blue-200 bg-blue-50 text-blue-800',
};

const StatusIcon = ({ status }: { status?: ProblemRowStatus }) => {
  if (status === 'correct') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'incorrect') return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === 'partial') return <AlertCircle className="h-4 w-4 text-amber-600" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
};

const normalizeJustificationAttachments = (
  attachments: ProblemJustificationAttachment[] = []
): ProblemJustificationAttachment[] =>
  attachments.map(attachment => ({
    ...attachment,
    extractionStatus: attachment.extractionStatus || (attachment.extractedText ? 'extracted' : 'failed'),
    error: attachment.error,
  }));

function normalizeDisplayKey(text?: string): string {
  return cleanGroupedProblemDisplayText(text).replace(/\s+/g, ' ').trim().toLowerCase();
}

type RowAnswerState = {
  selected?: boolean;
  selectedOption?: string;
  answer?: string;
  justification?: string;
  justificationAttachments?: ProblemJustificationAttachment[];
};

const GroupedChoiceProblemCard = ({ problem, onSubmitAnswers, onShowExplanation }: GroupedChoiceProblemCardProps) => {
  const { language } = useLanguage();
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [answers, setAnswers] = useState<Record<string, RowAnswerState>>(() => {
    const initial: Record<string, RowAnswerState> = {};
    problem.sections.forEach(section => {
      section.rows.forEach(row => {
        initial[row.id] = {
          selected: !!row.selected || !!row.selectedOption,
          selectedOption: row.selectedOption,
          answer: row.studentAnswer || '',
          justification: row.justification || '',
          justificationAttachments: normalizeJustificationAttachments(row.justificationAttachments),
        };
      });
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingRowIds, setRetryingRowIds] = useState<Set<string>>(new Set());

  const allRows = useMemo(() => problem.sections.flatMap(section => section.rows), [problem.sections]);
  const isMultipart = problem.type === 'grouped_problem';
  const isEvaluating = problem.status === 'evaluating';
  const isEvaluated = problem.status === 'evaluated';
  const isRetrying = retryingRowIds.size > 0;
  const hasError = problem.status === 'error';
  const hasEvaluationDetails = allRows.some(row => !!row.evaluation) || !!problem.overallFeedback;
  const retryableRows = allRows.filter(row =>
    row.evaluation && row.evaluation.status !== 'correct'
  );
  const canRetry = isEvaluated && retryableRows.length > 0 && !isRetrying;
  const selectedAnswers = allRows
    .map(row => answers[row.id])
    .filter((answer, index) => !isRetrying || retryingRowIds.has(allRows[index].id))
    .filter((answer): answer is RowAnswerState => isMultipart
      ? !!answer && (!!answer.answer?.trim() || (answer.justificationAttachments || []).length > 0)
      : !!answer?.selected);
  const hasPendingJustificationAttachment = selectedAnswers.some(answer =>
    (answer.justificationAttachments || []).some(file => file.extractionStatus === 'pending')
  );
  const hasUnreadableJustificationWithoutTypedText = (answer: RowAnswerState): boolean => {
    const typedJustification = (answer.justification || '').trim();
    const attachments = answer.justificationAttachments || [];
    const hasExtractedAttachment = attachments.some(file =>
      file.extractionStatus === 'extracted' && !!file.extractedText?.trim()
    );
    const hasFailedAttachment = attachments.some(file => file.extractionStatus === 'failed');

    return !typedJustification && !hasExtractedAttachment && hasFailedAttachment;
  };
  const hasUnreadableSelectedJustification = selectedAnswers.some(hasUnreadableJustificationWithoutTypedText);
  const submitDisabled =
    isSubmitting ||
    isEvaluating ||
    !onSubmitAnswers ||
    (isRetrying
      ? !Array.from(retryingRowIds).some(rowId => {
          const answer = answers[rowId];
          return !!answer?.selected || !!answer?.answer?.trim() || (answer?.justificationAttachments || []).length > 0;
        })
      : isMultipart && selectedAnswers.length === 0) ||
    hasPendingJustificationAttachment ||
    hasUnreadableSelectedJustification;

  const rowIsRetrying = (rowId: string) => retryingRowIds.has(rowId);
  const rowDisabled = (rowId: string) =>
    isSubmitting ||
    isEvaluating ||
    (isEvaluated && !rowIsRetrying(rowId));

  const startRetry = () => {
    const retryIds = new Set(retryableRows.map(row => row.id));
    setRetryingRowIds(retryIds);
    setAnswers(prev => {
      const next = { ...prev };
      retryableRows.forEach(row => {
        next[row.id] = {
          ...next[row.id],
          selected: true,
          selectedOption: row.selectedOption || next[row.id]?.selectedOption || (isMultipart ? undefined : 'selected'),
          answer: next[row.id]?.answer ?? row.studentAnswer ?? '',
          justification: next[row.id]?.justification ?? row.justification ?? '',
          justificationAttachments: next[row.id]?.justificationAttachments ?? normalizeJustificationAttachments(row.justificationAttachments),
        };
      });
      return next;
    });
  };

  const createAttachment = (file: File): ProblemJustificationAttachment => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: file.type.startsWith('image/')
      ? 'image'
      : file.type === 'application/pdf'
        ? 'pdf'
        : file.type.includes('word')
          ? 'document'
          : 'other',
    filename: file.name,
    url: URL.createObjectURL(file),
    extractionStatus: 'pending',
    uploadedAt: new Date().toISOString(),
  });

  const updateAttachment = (
    rowId: string,
    attachmentId: string,
    patch: Partial<ProblemJustificationAttachment>
  ) => {
    setAnswers(prev => {
      const current = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...current,
          justificationAttachments: (current.justificationAttachments || []).map(attachment =>
            attachment.id === attachmentId ? { ...attachment, ...patch } : attachment
          ),
        },
      };
    });
  };

  const addJustificationFile = async (rowId: string, file?: File) => {
    if (!file) return;
    const targetRow = allRows.find(row => row.id === rowId);
    const targetSection = problem.sections.find(section => section.rows.some(row => row.id === rowId));
    const attachment = createAttachment(file);
    setAnswers(prev => {
      const current = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...current,
          selected: true,
          selectedOption: 'selected',
          justificationAttachments: [
            ...(current.justificationAttachments || []),
            attachment,
          ],
        },
      };
    });

    const result = await processJustificationAttachment(file, undefined, {
      rowPrompt: targetRow?.prompt,
      problemContext: [targetSection?.context, targetRow?.relatedContext, problem.sharedContext, problem.statement, problem.rawText]
        .filter(Boolean)
        .join('\n\n'),
    });
    if (result.rawText.trim()) {
      updateAttachment(rowId, attachment.id, {
        extractionStatus: 'extracted',
        extractedText: result.rawText,
        normalizedText: result.normalizedText,
        ocrConfidence: result.confidence,
        ocrWarnings: result.warnings,
        error: undefined,
      });
    } else {
      updateAttachment(rowId, attachment.id, {
        extractionStatus: 'failed',
        extractedText: undefined,
        error: result.error || (
          language === 'fr'
            ? 'Impossible de lire cette justification.'
            : 'Could not read this justification.'
        ),
      });
    }
  };

  const submit = async () => {
    if (!onSubmitAnswers) return;
    setIsSubmitting(true);
    try {
      const payload: GroupedAnswerPayload = {
        problemId: problem.id,
        isRetry: isRetrying,
        retryRowIds: isRetrying ? Array.from(retryingRowIds) : undefined,
        answers: allRows
          .filter(row => isRetrying
            ? retryingRowIds.has(row.id)
            : isMultipart
            ? (!!answers[row.id]?.answer?.trim() || (answers[row.id]?.justificationAttachments || []).length > 0)
            : answers[row.id]?.selected)
          .map(row => ({
            rowId: row.id,
            label: row.label,
            selected: true,
            selectedOption: isMultipart ? undefined : 'selected',
            answer: answers[row.id]?.answer || '',
            doNotGrade: false,
            justification: answers[row.id]?.justification || '',
            justificationAttachments: answers[row.id]?.justificationAttachments || [],
          })),
      };
      await onSubmitAnswers(problem.id, payload);
      setRetryingRowIds(new Set());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full rounded-lg border border-neutral-border bg-neutral-surface shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-border bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-neutral-text break-words">
              {problem.title || (language === 'fr' ? 'Problème groupé' : 'Grouped problem')}
            </h2>
            <p className="mt-2 text-sm text-neutral-muted whitespace-pre-wrap break-words">
              {problem.selectionMode === 'select_correct'
                ? (language === 'fr'
                  ? 'Sélectionne les affirmations que tu penses correctes, puis explique ton choix.'
                  : 'Select the assertions you think are correct, then explain your choice.')
                : isMultipart
                  ? (problem.instructions || (language === 'fr'
                    ? 'Réponds aux questions, puis ajoute une preuve pour les constructions.'
                    : 'Answer the questions, then add proof for construction tasks.'))
                  : problem.instructions}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {problem.selectionMode === 'select_correct'
              ? (language === 'fr' ? 'Sélection' : 'Select')
              : isMultipart ? (language === 'fr' ? 'Problème groupé' : 'Grouped problem')
              : problem.answerType === 'true_false' ? 'Vrai / Faux' : problem.answerType || 'Grouped'}
          </Badge>
        </div>

        {problem.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {problem.attachments.map(attachment => (
              <Badge key={attachment.id} variant="secondary" className="max-w-full truncate">
                {attachment.filename}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-5">
        {isMultipart && cleanGroupedProblemDisplayText(problem.sharedContext) && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-neutral-muted whitespace-pre-wrap break-words">
              {cleanGroupedProblemDisplayText(problem.sharedContext)}
            </p>
          </div>
        )}

        {problem.sections.map((section, sectionIndex) => (
          <section key={section.id} className="space-y-3">
            {(() => {
              const sectionTitle = cleanGroupedProblemDisplayText(section.title);
              const sectionContext = cleanGroupedProblemDisplayText(section.context);
              const sharedKey = normalizeDisplayKey(problem.sharedContext);
              const titleKey = normalizeDisplayKey(sectionTitle);
              const contextKey = normalizeDisplayKey(sectionContext);
              const showContext = !!sectionContext &&
                contextKey !== sharedKey &&
                contextKey !== titleKey &&
                !sharedKey.includes(contextKey);

              return (sectionTitle || showContext) ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                {sectionTitle && (
                  <h3 className="text-sm font-semibold text-neutral-text mb-1">
                    {sectionTitle}
                  </h3>
                )}
                {showContext && (
                  <p className="text-sm text-neutral-muted whitespace-pre-wrap break-words">
                    {sectionContext}
                  </p>
                )}
              </div>
              ) : null;
            })()}

            <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(190px,0.5fr)_minmax(220px,0.9fr)] gap-3 px-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <div>{isMultipart ? (language === 'fr' ? 'Question' : 'Question') : (language === 'fr' ? 'Affirmation' : 'Assertion')}</div>
              <div>{isMultipart ? (language === 'fr' ? 'Réponse' : 'Answer') : (language === 'fr' ? 'Sélection' : 'Selection')}</div>
              <div>{isMultipart ? (language === 'fr' ? 'Preuve' : 'Evidence') : (language === 'fr' ? 'Justification' : 'Justification')}</div>
            </div>

            <div className="space-y-3">
              {section.rows.map(row => {
                const rowAnswer = answers[row.id] || {};
                const evaluation = row.evaluation;
                const hideEvaluation = rowIsRetrying(row.id);
                const status = hideEvaluation ? undefined : evaluation?.status;
                return (
                  <div key={row.id} className={cn(
                    'rounded-md border p-3 transition-colors',
                    status ? statusStyles[status] : 'border-neutral-border bg-white'
                  )}>
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(190px,0.5fr)_minmax(220px,0.9fr)] gap-3">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0">
                            {row.label || sectionIndex + 1}
                          </Badge>
                          <p className="text-sm font-medium text-neutral-text whitespace-pre-wrap break-words">
                            {cleanGroupedProblemDisplayText(row.prompt)}
                          </p>
                        </div>
                      </div>

                      {isMultipart ? (
                        <>
                          <div className="space-y-2">
                            <Textarea
                              value={rowAnswer.answer ?? row.studentAnswer ?? ''}
                              onChange={(event) => setAnswers(prev => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  answer: event.target.value,
                                  selected: !!event.target.value.trim(),
                                },
                              }))}
                              placeholder={row.rowKind === 'construction'
                                ? (language === 'fr' ? 'Décris ta construction...' : 'Describe your construction...')
                                : (language === 'fr' ? 'Écris ta réponse...' : 'Write your answer...')}
                              className="min-h-[76px] resize-y bg-white"
                              disabled={rowDisabled(row.id)}
                            />
                          </div>
                          <div className="space-y-2">
                            {row.rowKind === 'construction' ? (
                              <>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="outline" size="sm" disabled={rowDisabled(row.id)} onClick={() => cameraInputsRef.current[row.id]?.click()}>
                                    <Camera className="h-4 w-4 mr-1" />
                                    {language === 'fr' ? 'Photo' : 'Photo'}
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" disabled={rowDisabled(row.id)} onClick={() => fileInputsRef.current[row.id]?.click()}>
                                    <FileUp className="h-4 w-4 mr-1" />
                                    {language === 'fr' ? 'Fichier' : 'File'}
                                  </Button>
                                  <input
                                    ref={(node) => { cameraInputsRef.current[row.id] = node; }}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(event) => {
                                      void addJustificationFile(row.id, event.target.files?.[0]);
                                      event.currentTarget.value = '';
                                    }}
                                  />
                                  <input
                                    ref={(node) => { fileInputsRef.current[row.id] = node; }}
                                    type="file"
                                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    className="hidden"
                                    onChange={(event) => {
                                      void addJustificationFile(row.id, event.target.files?.[0]);
                                      event.currentTarget.value = '';
                                    }}
                                  />
                                </div>
                                {(rowAnswer.justificationAttachments || []).length === 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    {language === 'fr'
                                      ? 'Ajoute une photo ou un fichier de ta construction.'
                                      : 'Add a photo or file of your construction.'}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {language === 'fr' ? 'Aucune preuve nécessaire.' : 'No evidence needed.'}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${problem.id}-${row.id}-selected`}
                              checked={!!rowAnswer.selected}
                              onCheckedChange={(checked) => setAnswers(prev => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  selected: checked === true,
                                  selectedOption: checked === true ? 'selected' : undefined,
                                },
                              }))}
                              disabled={rowDisabled(row.id)}
                            />
                            <Label htmlFor={`${problem.id}-${row.id}-selected`} className="text-sm cursor-pointer">
                              {language === 'fr' ? 'Sélectionner cette affirmation' : 'Select this assertion'}
                            </Label>
                          </div>

                          <div className="space-y-2">
                            {rowAnswer.selected ? (
                          <>
                            <Textarea
                              value={rowAnswer.justification ?? row.justification ?? ''}
                              onChange={(event) => setAnswers(prev => ({
                                ...prev,
                                [row.id]: { ...prev[row.id], justification: event.target.value },
                              }))}
                              placeholder={language === 'fr' ? 'Explique ton choix...' : 'Explain your choice...'}
                              className="min-h-[76px] resize-y bg-white"
                              disabled={rowDisabled(row.id)}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" disabled={rowDisabled(row.id)} onClick={() => cameraInputsRef.current[row.id]?.click()}>
                                <Camera className="h-4 w-4 mr-1" />
                                {language === 'fr' ? 'Photo' : 'Photo'}
                              </Button>
                              <Button type="button" variant="outline" size="sm" disabled={rowDisabled(row.id)} onClick={() => fileInputsRef.current[row.id]?.click()}>
                                <FileUp className="h-4 w-4 mr-1" />
                                {language === 'fr' ? 'Fichier' : 'File'}
                              </Button>
                              <input
                                ref={(node) => { cameraInputsRef.current[row.id] = node; }}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(event) => {
                                  void addJustificationFile(row.id, event.target.files?.[0]);
                                  event.currentTarget.value = '';
                                }}
                              />
                              <input
                                ref={(node) => { fileInputsRef.current[row.id] = node; }}
                                type="file"
                                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={(event) => {
                                  void addJustificationFile(row.id, event.target.files?.[0]);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </div>
                            {(rowAnswer.justificationAttachments || []).length > 0 && (
                              <div className="space-y-1">
                                {rowAnswer.justificationAttachments?.map(file => (
                                  <div key={file.id} className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="max-w-full truncate">
                                      {file.filename}
                                    </Badge>
                                    {file.extractionStatus === 'pending' && (
                                      <Badge variant="outline" className="gap-1 text-blue-700 border-blue-200">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {language === 'fr' ? 'Lecture de l’image...' : 'Reading image...'}
                                      </Badge>
                                    )}
                                    {file.extractionStatus === 'extracted' && (
                                      <Badge variant="success">
                                        {language === 'fr' ? 'Image lue' : 'Image read'}
                                      </Badge>
                                    )}
                                    {file.extractionStatus === 'extracted' && (
                                      (typeof file.ocrConfidence === 'number' && file.ocrConfidence < 0.65) ||
                                      (file.ocrWarnings || []).length > 0 ||
                                      /\?/.test(file.extractedText || '')
                                    ) && (
                                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                                        {language === 'fr' ? 'À vérifier' : 'Check OCR'}
                                      </Badge>
                                    )}
                                    {file.extractionStatus === 'failed' && (
                                      <Badge variant="outline" className="text-red-700 border-red-200">
                                        {language === 'fr' ? 'Image illisible' : 'Unreadable image'}
                                      </Badge>
                                    )}
                                    {file.extractionStatus === 'failed' && file.error && (
                                      <p className="basis-full text-xs text-red-700">
                                        {file.error}
                                      </p>
                                    )}
                                    {file.extractionStatus === 'extracted' && file.extractedText && (
                                      <p className="basis-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">
                                        {file.extractedText}
                                      </p>
                                    )}
                                    {file.extractionStatus === 'extracted' && (file.ocrWarnings || []).length > 0 && (
                                      <p className="basis-full text-xs text-amber-700">
                                        {(file.ocrWarnings || []).join(' ')}
                                      </p>
                                    )}
                                  </div>
                                ))}
                                {hasUnreadableJustificationWithoutTypedText(rowAnswer) && (
                                  <p className="text-xs text-amber-700">
                                    {language === 'fr'
                                      ? 'Ajoute une justification lisible, reprends la photo ou écris ton explication.'
                                      : 'Add a readable justification, retake the photo, or type your explanation.'}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {language === 'fr'
                              ? 'Aucune justification nécessaire si tu ne sélectionnes pas cette affirmation.'
                              : 'No justification is needed if you do not select this assertion.'}
                          </p>
                        )}
                      </div>
                        </>
                      )}
                    </div>

                    {isMultipart && (rowAnswer.justificationAttachments || []).length > 0 && (
                      <div className="mt-3 space-y-1">
                        {rowAnswer.justificationAttachments?.map(file => (
                          <div key={file.id} className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="max-w-full truncate">
                              {file.filename}
                            </Badge>
                            {file.extractionStatus === 'pending' && (
                              <Badge variant="outline" className="gap-1 text-blue-700 border-blue-200">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {language === 'fr' ? 'Lecture de l’image...' : 'Reading image...'}
                              </Badge>
                            )}
                            {file.extractionStatus === 'extracted' && (
                              <Badge variant="success">
                                {language === 'fr' ? 'Image lue' : 'Image read'}
                              </Badge>
                            )}
                            {file.extractionStatus === 'failed' && (
                              <Badge variant="outline" className="text-red-700 border-red-200">
                                {language === 'fr' ? 'Image illisible' : 'Unreadable image'}
                              </Badge>
                            )}
                            {file.extractionStatus === 'extracted' && file.extractedText && (
                              <p className="basis-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">
                                {file.extractedText}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {evaluation && !hideEvaluation && (
                      <div className="mt-3 rounded-md bg-white/80 border border-current/10 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 font-medium">
                            <StatusIcon status={status} />
                            {evaluation.selectedAnswer && (
                              <span>{isMultipart ? (language === 'fr' ? 'Réponse envoyée' : 'Submitted answer') : (language === 'fr' ? 'Affirmation sélectionnée' : 'Selected assertion')}</span>
                            )}
                          </div>
                          {onShowExplanation && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => onShowExplanation(problem, row.id)}
                              title={language === 'fr' ? 'Explication' : 'Explanation'}
                              aria-label={language === 'fr' ? `Explication question ${row.label}` : `Explanation for question ${row.label}`}
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {evaluation.feedback && <p className="mt-2">{evaluation.feedback}</p>}
                        {evaluation.explanation && <p className="mt-2 text-muted-foreground">{evaluation.explanation}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {problem.overallFeedback && !isRetrying && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            {problem.overallFeedback}
          </div>
        )}

        {isEvaluating && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            {language === 'fr' ? 'Correction en cours...' : 'Grading in progress...'}
          </div>
        )}

        {hasError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {problem.error || (language === 'fr'
                ? 'La correction a échoué. Tes réponses sont conservées.'
                : 'Grading failed. Your answers are preserved.')}
            </span>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {canRetry && (
            <Button variant="default" onClick={startRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Réessayer' : 'Try again'}
            </Button>
          )}

          {(!isEvaluated || isRetrying) && (
            <Button onClick={submit} disabled={submitDisabled}>
              {isSubmitting || isEvaluating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : hasError ? (
                <RotateCcw className="h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {hasError
                ? (language === 'fr' ? 'Réessayer la correction' : 'Retry grading')
                : hasPendingJustificationAttachment
                  ? (language === 'fr' ? 'Lecture de la justification...' : 'Reading justification...')
                  : hasUnreadableSelectedJustification
                    ? (language === 'fr' ? 'Justification illisible' : 'Unreadable justification')
                : isRetrying
                  ? (language === 'fr' ? 'Soumettre à nouveau' : 'Submit again')
                  : (language === 'fr' ? 'Soumettre mes réponses' : 'Submit answers')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupedChoiceProblemCard;
