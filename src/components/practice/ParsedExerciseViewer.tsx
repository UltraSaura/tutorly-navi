import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

type Confidence = 'high' | 'medium' | 'low';
type AnswerType = 'short_text' | 'numeric' | 'math' | 'multiple_choice' | 'free_text';

export type ParsedExamQuestion = {
  id?: string;
  label?: string;
  text: string;
  points?: number | null;
  answer_type?: AnswerType;
  expected_answer?: string | null;
  student_answer?: string | null;
  options?: string[];
  subquestions?: Array<{
    id?: string;
    label?: string;
    text: string;
  }>;
};

export interface ParsedExercisePart {
  label: string;
  context?: string;
  questions: ParsedExamQuestion[];
}

export interface ParsedExerciseContent {
  title?: string | null;
  context?: string;
  parts?: ParsedExercisePart[];
  documents?: Array<{
    id?: string;
    label: string;
    caption?: string;
    content?: string;
    type?: 'text' | 'table' | 'image' | 'graph';
    table?: {
      headers: string[];
      rows: string[][];
    };
    source?: {
      page?: number;
    };
    local_path?: string;
    storage_path?: string;
    public_url?: string | null;
    alt?: string;
    page_number?: number | null;
    sort_order?: number;
    fallback?: boolean;
    render_mode?: 'image_first' | 'table_first' | 'image_only' | 'table_only';
  }>;
  questions?: ParsedExamQuestion[];
  raw_excerpt?: string;
  confidence?: Confidence;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getParsedContent(value: unknown | null | undefined): ParsedExerciseContent | null {
  if (!isRecord(value)) return null;
  return value as ParsedExerciseContent;
}

function AnswerField({ question }: { question: ParsedExamQuestion }) {
  const [value, setValue] = useState(question.student_answer ?? '');
  const answerType = question.answer_type ?? 'free_text';
  const options = question.options ?? [];

  if (answerType === 'multiple_choice' && options.length > 0) {
    return (
      <div className="mt-3 space-y-2">
        {options.map((option, index) => (
          <label key={`${question.id ?? 'q'}-${index}`} className="flex items-start gap-2 rounded-md border border-border/60 p-2 text-sm">
            <input
              type="radio"
              name={`answer-${question.id ?? 'q'}`}
              value={option}
              checked={value === option}
              onChange={(event) => setValue(event.currentTarget.value)}
              className="mt-1"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (answerType === 'free_text') {
    return (
      <Textarea
        className="mt-3"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder="Ta réponse"
      />
    );
  }

  return (
    <Input
      className="mt-3"
      inputMode={answerType === 'numeric' || answerType === 'math' ? 'decimal' : 'text'}
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      placeholder="Ta réponse"
    />
  );
}

function QuestionList({ questions, interactive }: { questions: ParsedExamQuestion[]; interactive: boolean }) {
  const { t } = useTranslation();
  if (questions.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('practice.parsed.questions')}</p>
      <ol className="space-y-3">
        {questions.map((q, idx) => (
          <li key={q.id ?? String(idx)} className="rounded-md border border-border/60 bg-muted/10 p-3">
            <p className="text-sm leading-6">
              <span className="mr-2 font-semibold">{q.label ?? `${idx + 1}.`}</span>
              <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{q.text}</span>
              {typeof q.points === 'number' ? (
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">({q.points} pts)</span>
              ) : null}
            </p>
            {(q.subquestions ?? []).length > 0 ? (
              <ol className="mt-3 space-y-2 pl-4">
                {(q.subquestions ?? []).map((sq, sidx) => (
                  <li key={sq.id ?? `${idx}-${sidx}`} className="text-sm leading-6">
                    <span className="mr-2 font-semibold text-muted-foreground">{sq.label ?? `${String.fromCharCode(97 + sidx)}.`}</span>
                    <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{sq.text}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {interactive ? (
              <>
                <AnswerField question={q} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled>
                    Valider ma réponse
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    Demander un indice
                  </Button>
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function VisualDocument({
  doc,
  idx,
}: {
  doc: NonNullable<ParsedExerciseContent['documents']>[number];
  idx: number;
}) {
  const [open, setOpen] = useState(false);
  const src = doc.public_url ?? doc.local_path;
  if (!src) return null;
  const alt = doc.alt ?? doc.label ?? `Document ${idx + 1}`;

  return (
    <>
      <button
        type="button"
        className="block w-full overflow-hidden rounded-md border border-border/60 bg-background text-left"
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} className="h-auto w-full object-contain" loading="lazy" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] bg-background/95 p-3" role="dialog" aria-modal="true">
          <div className="mx-auto flex h-full max-w-5xl flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{doc.label}</p>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <img src={src} alt={alt} className="mx-auto h-auto max-w-none sm:max-w-full" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TableDocument({ doc }: { doc: NonNullable<ParsedExerciseContent['documents']>[number] }) {
  if (!doc.table) return null;

  return (
    <div className="mt-2 max-w-full overflow-x-auto rounded-md border border-border/60 bg-background">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs sm:text-sm">
        {doc.caption ? (
          <caption className="caption-top px-3 py-2 text-left text-sm font-medium text-foreground">
            {doc.caption}
          </caption>
        ) : null}
        <thead className="bg-muted/60">
          <tr>
            {doc.table.headers.map((header, index) => (
              <th key={`${header}-${index}`} scope="col" className="border-b border-r border-border/60 px-2 py-2 font-semibold last:border-r-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.table.rows.map((row, rowIndex) => (
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

export function ParsedExerciseViewer({
  title,
  parsed,
  variant = 'student',
  interactive = false,
}: {
  title: string;
  parsed: ParsedExerciseContent;
  variant?: 'student' | 'admin';
  interactive?: boolean;
}) {
  const { t } = useTranslation();
  const context = (parsed.context ?? '').trim();
  const questionsFlat = parsed.questions ?? [];
  const parts = parsed.parts ?? [];
  const useParts = parts.length > 0;

  const documents = (parsed.documents ?? []).filter((d) => {
    const body = (d.content ?? '').trim();
    return body.length > 0 || Boolean(d.table) || (d.type && d.type !== 'text') || Boolean(d.public_url || d.local_path);
  });
  const hasStructuredTable = documents.some((doc) => doc.type === 'table' && doc.table);
  const primaryDocuments = documents.filter((doc) => !(doc.type === 'image' && doc.fallback && hasStructuredTable));
  const fallbackImages = documents.filter((doc) => doc.type === 'image' && doc.fallback && hasStructuredTable);

  let questionsSection: ReactNode = null;
  if (useParts) {
    questionsSection = (
      <div className="space-y-8">
        {parts.map((part, pIdx) => (
          <section key={`${part.label}-${pIdx}`} className="space-y-3 rounded-md border border-border/40 bg-muted/5 p-3">
            <h3 className="text-sm font-semibold">{part.label}</h3>
            {(part.context ?? '').trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{part.context}</p>
            ) : null}
            <QuestionList questions={part.questions} interactive={interactive} />
          </section>
        ))}
      </div>
    );
  } else if (questionsFlat.length > 0) {
    questionsSection = <QuestionList questions={questionsFlat} interactive={interactive} />;
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base leading-snug">{title}</CardTitle>
          {variant === 'admin' && parsed.confidence ? (
            <Badge variant={parsed.confidence === 'high' ? 'default' : parsed.confidence === 'medium' ? 'secondary' : 'outline'}>
              {parsed.confidence}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {context ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('practice.parsed.context')}</p>
            <p className="whitespace-pre-wrap text-sm leading-6">{context}</p>
          </section>
        ) : null}

        {documents.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('practice.parsed.documents')}</p>
            <div className="space-y-2">
              {primaryDocuments.map((doc, idx) => {
                const isImageFirst = doc.render_mode === 'image_first' && (doc.public_url || doc.local_path);
                return (
                  <div key={`${doc.label}-${idx}`} className="rounded-md border border-border/60 bg-muted/20 p-3">
                    <p className="text-sm font-medium">{doc.label}</p>
                    {isImageFirst ? (
                      <div className="space-y-3">
                        <div className="mt-2"><VisualDocument doc={doc} idx={idx} /></div>
                        {doc.table && (
                          <details className="mt-2 rounded-md border border-dashed border-border/70 p-2">
                            <summary className="cursor-pointer text-sm font-medium">Voir en tableau accessible</summary>
                            <div className="mt-2">
                              <TableDocument doc={doc} />
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <>
                        {doc.type === 'table' && doc.table ? <TableDocument doc={doc} /> : null}
                        {doc.type === 'image' ? <div className="mt-2"><VisualDocument doc={doc} idx={idx} /></div> : null}
                      </>
                    )}
                    {(doc.content ?? '').trim() && !isImageFirst ? (
                      <p className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground sm:text-sm">{doc.content}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {fallbackImages.length > 0 ? (
              <details className="rounded-md border border-dashed border-border/70 bg-muted/10 p-3">
                <summary className="cursor-pointer text-sm font-medium">Voir la capture originale</summary>
                <div className="mt-3 space-y-3">
                  {fallbackImages.map((doc, idx) => (
                    <VisualDocument key={`${doc.label}-fallback-${idx}`} doc={doc} idx={idx} />
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        {questionsSection}
      </CardContent>
    </Card>
  );
}
