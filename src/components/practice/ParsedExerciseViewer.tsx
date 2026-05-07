import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

type Confidence = 'high' | 'medium' | 'low';

export interface ParsedExerciseContent {
  title?: string | null;
  context?: string;
  documents?: Array<{
    label: string;
    content?: string;
    type?: 'text' | 'table' | 'image' | 'graph';
  }>;
  questions?: Array<{
    id?: string;
    label?: string;
    text: string;
    points?: number | null;
    subquestions?: Array<{
      id?: string;
      label?: string;
      text: string;
    }>;
  }>;
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

export function ParsedExerciseViewer({
  title,
  parsed,
  variant = 'student',
}: {
  title: string;
  parsed: ParsedExerciseContent;
  variant?: 'student' | 'admin';
}) {
  const { t } = useTranslation();
  const context = (parsed.context ?? '').trim();
  const questions = parsed.questions ?? [];
  const documents = (parsed.documents ?? []).filter((d) => {
    const body = (d.content ?? '').trim();
    return body.length > 0 || (d.type && d.type !== 'text');
  });

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
              {documents.map((doc, idx) => (
                <div key={`${doc.label}-${idx}`} className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <p className="text-sm font-medium">{doc.label}</p>
                  {(doc.content ?? '').trim() ? (
                    <p className="mt-1 whitespace-pre-wrap font-mono text-xs text-muted-foreground sm:text-sm">{doc.content}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {questions.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('practice.parsed.questions')}</p>
            <ol className="space-y-3">
              {questions.map((q, idx) => (
                <li key={q.id ?? String(idx)} className="rounded-md border border-border/60 bg-muted/10 p-3">
                  <p className="text-sm leading-6">
                    <span className="mr-2 font-semibold">{q.label ?? `${idx + 1}.`}</span>
                    <span className="whitespace-pre-wrap">{q.text}</span>
                    {typeof q.points === 'number' ? (
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">({q.points} pts)</span>
                    ) : null}
                  </p>
                  {(q.subquestions ?? []).length > 0 ? (
                    <ol className="mt-3 space-y-2 pl-4">
                      {(q.subquestions ?? []).map((sq, sidx) => (
                        <li key={sq.id ?? `${idx}-${sidx}`} className="text-sm leading-6">
                          <span className="mr-2 font-semibold text-muted-foreground">{sq.label ?? `${String.fromCharCode(97 + sidx)}.`}</span>
                          <span className="whitespace-pre-wrap">{sq.text}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
