import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface TrainingDocument {
  id?: string;
  type: "image" | "table";
  label?: string;
  public_url?: string;
  alt?: string;
  table?: { headers: string[]; rows: string[][] };
}

interface TrainingQuestion {
  id: string;
  label?: string;
  prompt: string;
  expected_answer?: string;
  guidance?: {
    hints?: { level: number; text: string }[];
    correct_feedback?: string;
  };
}

interface TrainingItem {
  id: string;
  source_label: string;
  context?: string;
  documents?: TrainingDocument[];
  questions?: TrainingQuestion[];
}

function DocTable({ doc }: { doc: TrainingDocument }) {
  if (!doc.table) return null;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            {doc.table.headers.map((h, i) => (
              <th key={i} className="border border-border/60 px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.table.rows.map((row, ri) => (
            <tr key={ri} className="even:bg-muted/20">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border/60 px-3 py-2">
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

function DocImage({ doc }: { doc: TrainingDocument }) {
  const [open, setOpen] = useState(false);
  if (!doc.public_url) return null;
  return (
    <>
      <button
        type="button"
        className="block w-full bg-white text-left"
        onClick={() => setOpen(true)}
        title="Cliquer pour agrandir"
      >
        <img
          src={doc.public_url}
          alt={doc.alt ?? doc.label ?? ""}
          className="h-auto w-full object-contain"
          loading="lazy"
        />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background/95 p-4"
          role="dialog"
          onClick={() => setOpen(false)}
        >
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{doc.label}</p>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-md bg-white p-4">
              <img
                src={doc.public_url}
                alt={doc.alt ?? doc.label ?? ""}
                className="mx-auto h-auto max-w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionBlock({ question, exIdx }: { question: TrainingQuestion; exIdx: number }) {
  const [hintsOpen, setHintsOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [value, setValue] = useState("");
  const hints = question.guidance?.hints ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold leading-6">
        {question.label && (
          <span className="mr-2 text-muted-foreground">{question.label}</span>
        )}
        {question.prompt}
      </p>

      <textarea
        className="w-full resize-y rounded-md border border-border/60 bg-background p-3 text-sm outline-none focus:border-primary"
        rows={3}
        placeholder="Votre réponse…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {hints.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setHintsOpen((v) => !v)}
          >
            💡 {hintsOpen ? "Cacher" : "Indice"}
            {hintsOpen ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        )}
        {question.expected_answer && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAnswerOpen((v) => !v)}
          >
            ✓ {answerOpen ? "Cacher" : "Vérifier"}
          </Button>
        )}
      </div>

      {hintsOpen && hints.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          {hints.map((h) => (
            <p key={h.level} className="text-sm leading-6">
              <span className="mr-2 font-semibold">Indice {h.level} :</span>
              {h.text}
            </p>
          ))}
        </div>
      )}

      {answerOpen && question.expected_answer && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm leading-6 dark:border-green-900/50 dark:bg-green-950/30">
          <span className="mr-2 font-semibold">Réponse :</span>
          {question.expected_answer}
        </div>
      )}
    </div>
  );
}

function ExerciseView({ item, index }: { item: TrainingItem; index: number }) {
  const docs = item.documents ?? [];
  const questions = item.questions ?? [];
  const svgOrImageDocs = docs.filter((d) => d.type === "image" && d.public_url);
  const tableDocs = docs.filter((d) => d.type === "table");

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-lg font-bold">{item.source_label}</h2>
      </div>

      {/* Context */}
      {item.context && (
        <div className="border-b border-border/40 px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {item.context}
          </p>
        </div>
      )}

      {/* Tables (shown inline with padding) */}
      {tableDocs.length > 0 && (
        <div className="space-y-4 border-b border-border/40 px-5 py-4">
          {tableDocs.map((doc, i) => (
            <div key={doc.id ?? i}>
              {doc.label && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {doc.label}
                </p>
              )}
              <DocTable doc={doc} />
            </div>
          ))}
        </div>
      )}

      {/* SVG images — full bleed, zero horizontal padding */}
      {svgOrImageDocs.length > 0 && (
        <div className="border-b border-border/60">
          {svgOrImageDocs.map((doc, i) => (
            <div
              key={doc.id ?? i}
              className={i > 0 ? "border-t border-border/40" : ""}
            >
              {doc.label && (
                <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {doc.label}
                </p>
              )}
              <DocImage doc={doc} />
            </div>
          ))}
        </div>
      )}

      {/* Questions */}
      <div className="px-5 py-5">
        <div className="space-y-0">
          {questions.map((q, qi) => (
            <div key={q.id}>
              {qi > 0 && <Separator className="my-5" />}
              <QuestionBlock question={q} exIdx={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DnbSvgPreview() {
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/dnb-2018-preview.json")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.training_items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = items.length;
  const current = items[exerciseIndex] ?? null;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm">
        <p className="text-sm font-semibold">DNB 2018 – Métropole La Réunion</p>
        <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
          SVG preview
        </span>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {loading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : !current ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun exercice chargé.
          </div>
        ) : (
          <ExerciseView key={exerciseIndex} item={current} index={exerciseIndex} />
        )}
      </div>

      {/* Fixed bottom nav */}
      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border/60 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <Button
              variant="outline"
              onClick={() => setExerciseIndex((i) => Math.max(0, i - 1))}
              disabled={exerciseIndex === 0}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Précédent
            </Button>
            <span className="tabular-nums text-sm font-medium text-muted-foreground">
              {exerciseIndex + 1} / {total}
            </span>
            <Button
              variant="outline"
              onClick={() => setExerciseIndex((i) => Math.min(total - 1, i + 1))}
              disabled={exerciseIndex >= total - 1}
            >
              Suivant
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
