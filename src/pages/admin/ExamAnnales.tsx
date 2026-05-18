import { useMemo, useState } from 'react';
import { ExternalLink, FileText, RefreshCw, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageMeta } from '@/components/seo/PageMeta';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useExamExercises,
  useExamFilterOptions,
  useExamPaperDetail,
  useExamPapers,
  useExerciseProgramLinks,
} from '@/hooks/useExamImport';
import type { ExamExercise, ExamPaperFilters, ExamPaperListItem, ExerciseProgramLink } from '@/services/examImportService';

const ALL = 'all';

export default function ExamAnnales() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExamPaperFilters>({ exam: 'dnb' });
  const [search, setSearch] = useState('');
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  const papersQuery = useExamPapers(filters);
  const optionsQuery = useExamFilterOptions();
  const selectedPaper = useMemo(
    () => papersQuery.data?.find((paper) => paper.id === selectedPaperId) ?? null,
    [papersQuery.data, selectedPaperId],
  );

  const visiblePapers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return papersQuery.data ?? [];
    return (papersQuery.data ?? []).filter((paper) =>
      [paper.title, paper.exam, paper.discipline, paper.source_name, paper.session_year, paper.series, paper.variant, paper.parsing_status]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [papersQuery.data, search]);

  const setFilter = (key: keyof ExamPaperFilters, value: string) => {
    setFilters((current) => {
      const next = { ...current };
      if (value === ALL) {
        delete next[key];
      } else {
        switch (key) {
          case 'session_year':
            next.session_year = Number(value);
            break;
          case 'exam':
            next.exam = value;
            break;
          case 'discipline':
            next.discipline = value;
            break;
          case 'series':
            next.series = value;
            break;
          case 'source_name':
            next.source_name = value;
            break;
          case 'parsing_status':
            next.parsing_status = value;
            break;
        }
      }
      return next;
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageMeta title="Annales" description="Consulter les annales d'examens importées." />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Annales
          </h1>
          <p className="text-muted-foreground">
            Consultez les sujets importés, inspectez les exercices et préparez la validation des liens programme.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['exam-import'] })}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Lecture seule. Les liens programme restent au statut proposé tant que la validation n'est pas activée.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <FilterSelect label="Examen" value={filters.exam ?? ALL} onChange={(value) => setFilter('exam', value)} options={[{ value: 'dnb', label: 'DNB' }]} />
          <FilterSelect
            label="Année"
            value={filters.session_year ? String(filters.session_year) : ALL}
            onChange={(value) => setFilter('session_year', value)}
            options={(optionsQuery.data?.years ?? []).map((year) => ({ value: String(year), label: String(year) }))}
          />
          <FilterSelect
            label="Discipline"
            value={Array.isArray(filters.discipline) ? filters.discipline[0] ?? ALL : filters.discipline ?? ALL}
            onChange={(value) => setFilter('discipline', value)}
            options={(optionsQuery.data?.disciplines ?? []).map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Série"
            value={filters.series ?? ALL}
            onChange={(value) => setFilter('series', value)}
            options={(optionsQuery.data?.series ?? []).map((value) => ({ value, label: value === 'none' ? 'Toutes / non renseignée' : value }))}
          />
          <FilterSelect
            label="Source"
            value={filters.source_name ?? ALL}
            onChange={(value) => setFilter('source_name', value)}
            options={(optionsQuery.data?.sources ?? []).map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Parsing"
            value={filters.parsing_status ?? ALL}
            onChange={(value) => setFilter('parsing_status', value)}
            options={(optionsQuery.data?.parsingStatuses ?? []).map((value) => ({ value, label: value }))}
          />
          <div className="space-y-2 md:col-span-3 xl:col-span-6">
            <Label htmlFor="exam-search">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="exam-search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" placeholder="Titre, discipline, source, année..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sujets importés</CardTitle>
          <CardDescription>{visiblePapers.length} sujet(s) affiché(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {papersQuery.isLoading ? (
            <PapersLoading />
          ) : papersQuery.error ? (
            <ErrorState message={papersQuery.error instanceof Error ? papersQuery.error.message : 'Impossible de charger les annales.'} />
          ) : visiblePapers.length === 0 ? (
            <EmptyState />
          ) : (
            <ExamPapersTable papers={visiblePapers} onSelect={setSelectedPaperId} selectedPaperId={selectedPaperId} />
          )}
        </CardContent>
      </Card>

      <ExamPaperDetailPanel
        paperId={selectedPaperId}
        fallbackPaper={selectedPaper}
        open={selectedPaperId !== null}
        onOpenChange={(open) => !open && setSelectedPaperId(null)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExamPapersTable({ papers, selectedPaperId, onSelect }: { papers: ExamPaperListItem[]; selectedPaperId: string | null; onSelect: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Exam</TableHead>
          <TableHead>Année</TableHead>
          <TableHead>Discipline</TableHead>
          <TableHead>Série</TableHead>
          <TableHead>Variante</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Parsing</TableHead>
          <TableHead className="text-right">Exercices</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {papers.map((paper) => (
          <TableRow
            key={paper.id}
            onClick={() => onSelect(paper.id)}
            data-state={selectedPaperId === paper.id ? 'selected' : undefined}
            className="cursor-pointer"
          >
            <TableCell><Badge variant="outline">{paper.exam.toUpperCase()}</Badge></TableCell>
            <TableCell>{paper.session_year}</TableCell>
            <TableCell>{paper.discipline}</TableCell>
            <TableCell>{paper.series ?? '—'}</TableCell>
            <TableCell>{paper.variant}</TableCell>
            <TableCell>{paper.source_name}</TableCell>
            <TableCell><ParsingBadge status={paper.parsing_status} /></TableCell>
            <TableCell className="text-right tabular-nums">{paper.exercise_count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ExamPaperDetailPanel({
  paperId,
  fallbackPaper,
  open,
  onOpenChange,
}: {
  paperId: string | null;
  fallbackPaper: ExamPaperListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useExamPaperDetail(paperId);
  const exercisesQuery = useExamExercises(paperId);
  const exerciseIds = useMemo(() => (exercisesQuery.data ?? []).map((exercise) => exercise.id), [exercisesQuery.data]);
  const linksQuery = useExerciseProgramLinks(exerciseIds);
  const paper = detailQuery.data ?? fallbackPaper;
  const linksByExercise = useMemo(() => {
    const map = new Map<string, ExerciseProgramLink[]>();
    for (const link of linksQuery.data ?? []) {
      const list = map.get(link.exercise_id) ?? [];
      list.push(link);
      map.set(link.exercise_id, list);
    }
    return map;
  }, [linksQuery.data]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>{paper?.title ?? 'Sujet'}</SheetTitle>
          <SheetDescription>
            {paper ? `${paper.exam.toUpperCase()} ${paper.session_year} · ${paper.discipline}` : 'Chargement du sujet'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 pr-4 flex-1">
          {detailQuery.isLoading ? (
            <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>
          ) : detailQuery.error ? (
            <ErrorState message={detailQuery.error instanceof Error ? detailQuery.error.message : 'Impossible de charger le sujet.'} />
          ) : paper ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Traçabilité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <LinkRow label="PDF" href={paper.pdf_url} />
                  <LinkRow label="Source" href={paper.source_url} />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{paper.source_name}</Badge>
                    <ParsingBadge status={paper.parsing_status} />
                    <Badge variant="secondary">{paper.variant}</Badge>
                  </div>
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm">Voir raw_text</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                        {'raw_text' in paper ? (paper.raw_text || 'raw_text vide') : 'raw_text non chargé'}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Exercices</h3>
                {exercisesQuery.isLoading ? (
                  <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
                ) : exercisesQuery.error ? (
                  <ErrorState message={exercisesQuery.error instanceof Error ? exercisesQuery.error.message : 'Impossible de charger les exercices.'} />
                ) : (exercisesQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-md p-4">Aucun exercice enregistré pour ce sujet.</p>
                ) : (
                  (exercisesQuery.data ?? []).map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      links={linksByExercise.get(exercise.id) ?? []}
                      linksLoading={linksQuery.isLoading}
                    />
                  ))
                )}
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ExerciseCard({ exercise, links, linksLoading }: { exercise: ExamExercise; links: ExerciseProgramLink[]; linksLoading: boolean }) {
  const statement = exercise.raw_text || 'Énoncé vide ou non extrait.';
  const parsedRaw = exercise.parsed_content ?? null;
  const parsed =
    parsedRaw !== null &&
    typeof parsedRaw === 'object' &&
    !Array.isArray(parsedRaw) &&
    Object.keys(parsedRaw as object).length > 0
      ? parsedRaw
      : null;
  const confidence = exercise.parsing_confidence ?? (parsed as { confidence?: string } | null)?.confidence ?? null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Exercice {exercise.exercise_number ?? '—'}</CardTitle>
            {exercise.title && <CardDescription>{exercise.title}</CardDescription>}
          </div>
          <ParsingBadge status={exercise.parsing_status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <Label>raw_text</Label>
            <pre className="mt-2 max-h-[28rem] overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">{statement}</pre>
          </div>
          <div>
            <Label>parsed_content (vs raw)</Label>
            <pre className="mt-2 max-h-[28rem] overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {parsed ? JSON.stringify(parsed, null, 2) : '—'}
            </pre>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <InfoBox label="parsing_confidence (colonne)" value={confidence ?? '—'} />
          <InfoBox label="parsing_status" value={exercise.parsing_status} />
          <InfoBox label="raw_text length" value={statement.length} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <InfoBox label="Correction" value={exercise.correction ?? 'Non disponible'} />
          <InfoBox label="Points" value={exercise.points ?? 'Non renseigné'} />
          <InfoBox label="Tags" value={Array.isArray(exercise.tags) && exercise.tags.length > 0 ? exercise.tags.join(', ') : 'Non renseigné'} />
        </div>
        <div className="space-y-2">
          <Label>Propositions de liens programme</Label>
          {linksLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-3">Aucune proposition de lien pour cet exercice.</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{link.program_entry_type}</Badge>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{link.program_entry_id}</code>
                    <Badge variant="secondary">confidence {Number(link.confidence).toFixed(2)}</Badge>
                    <Badge>{link.status ?? 'proposed'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{link.rationale || 'Pas de justification.'}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled>Accepter le lien</Button>
                    <Button size="sm" variant="outline" disabled>Rejeter le lien</Button>
                    <Button size="sm" disabled>Convertir en tâche</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline break-all">
        {href}
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function ParsingBadge({ status }: { status: string }) {
  const variant = status === 'parsed' ? 'default' : status === 'partial' ? 'secondary' : 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
}

function PapersLoading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border rounded-md p-8 text-center">
      <p className="font-medium">Aucune annale trouvée</p>
      <p className="text-sm text-muted-foreground mt-1">Importez un bundle DNB ou ajustez les filtres.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
