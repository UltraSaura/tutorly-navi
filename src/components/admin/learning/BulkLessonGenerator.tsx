import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Wand2, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TopicRow {
  id: string;
  name: string;
  lesson_content: unknown | null;
  curriculum_subject_id: string | null;
  curriculum_level_code: string | null;
}

type SubjectRow = {
  id: string;
  name: string;
};

type GenStatus = 'idle' | 'running' | 'done' | 'error';

interface GenResult {
  topicId: string;
  name: string;
  status: GenStatus;
  error?: string;
  currentStep?: string;
}

const GENERATION_TIMEOUT_MS = 120000;

async function getFunctionErrorMessage(err: unknown, response?: Response) {
  let errorMessage =
    err instanceof Error && err.message && err.message !== 'Unknown error'
      ? err.message
      : 'La génération a échoué.';

  const candidateResponse =
    response ||
    (typeof err === 'object' && err !== null && 'context' in err && (err as { context?: Response }).context instanceof Response
      ? (err as { context?: Response }).context
      : undefined);

  if (!candidateResponse) return errorMessage;

  try {
    const payload = await candidateResponse.clone().json();
    return payload?.error || payload?.details || payload?.message || errorMessage;
  } catch {
    try {
      const text = await candidateResponse.clone().text();
      return text || errorMessage;
    } catch {
      return errorMessage;
    }
  }
}

export function BulkLessonGenerator() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [results, setResults] = useState<GenResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isRunning || runStartedAt === null) return;

    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - runStartedAt);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, runStartedAt]);

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics-bulk-lesson'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, lesson_content, curriculum_subject_id, curriculum_level_code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as TopicRow[];
    },
    enabled: open,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-bulk-lesson'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as SubjectRow[];
    },
    enabled: open,
  });

  const levels = useMemo(
    () => [...new Set(topics.map((t) => t.curriculum_level_code).filter(Boolean))].sort() as string[],
    [topics],
  );

  const visible = useMemo(
    () =>
      topics.filter((t) => {
        if (filterSubject !== 'all' && t.curriculum_subject_id !== filterSubject) return false;
        if (filterLevel !== 'all' && t.curriculum_level_code !== filterLevel) return false;
        if (onlyMissing && t.lesson_content) return false;
        return true;
      }),
    [topics, filterSubject, filterLevel, onlyMissing],
  );

  const toggle = (id: string) => {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const handleDeleteOne = async (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer la leçon générée pour ce sujet ?')) return;
    setDeletingIds(prev => new Set([...prev, topicId]));
    const { error } = await supabase
      .from('topics')
      .update({ lesson_content: null })
      .eq('id', topicId);
    setDeletingIds(prev => { const n = new Set(prev); n.delete(topicId); return n; });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['topics-bulk-lesson'] });
      queryClient.invalidateQueries({ queryKey: ['topic-lesson-content'] });
    }
  };

  const handleDeleteSelected = async () => {
    const toDelete = selected.filter(id => topics.find(t => t.id === id)?.lesson_content);
    if (!toDelete.length) return;
    if (!window.confirm(`Supprimer les leçons de ${toDelete.length} sujet(s) ?`)) return;
    setDeletingIds(new Set(toDelete));
    await Promise.all(
      toDelete.map(id =>
        supabase.from('topics').update({ lesson_content: null }).eq('id', id)
      )
    );
    setDeletingIds(new Set());
    setSelected([]);
    queryClient.invalidateQueries({ queryKey: ['topics-bulk-lesson'] });
    queryClient.invalidateQueries({ queryKey: ['topic-lesson-content'] });
  };

  const handleGenerate = async () => {
    if (!selected.length) return;

    const batch = topics.filter((t) => selected.includes(t.id));
    setResults(batch.map((t) => ({ topicId: t.id, name: t.name, status: 'idle' })));
    setIsRunning(true);
    setRunStartedAt(Date.now());
    setElapsedMs(0);

    for (const topic of batch) {
      setResults((p) => p.map((r) => (r.topicId === topic.id ? { ...r, status: 'running' } : r)));
      try {
        const result = await Promise.race([
          supabase.functions.invoke('generate-lesson-content', { body: { topicId: topic.id, language } }),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('La génération a dépassé 120 secondes.')), GENERATION_TIMEOUT_MS)),
        ]);
        const { data: fnData, error: fnError } = result;
        if (fnError) throw new Error(fnError.message ?? 'Erreur réseau');
        if (fnData?.error) throw new Error(fnData.error);
        const stepCount = fnData?.lesson_content?.steps?.length;
        setResults((p) => p.map((r) => r.topicId === topic.id ? {
          ...r, status: 'done',
          currentStep: stepCount ? `${stepCount} étapes` : undefined,
        } : r));
      } catch (err) {
        const errorMessage = await getFunctionErrorMessage(err);
        setResults((p) => p.map((r) => r.topicId === topic.id ? { ...r, status: 'error', error: errorMessage } : r));
      }
    }

    setIsRunning(false);
    setRunStartedAt(null);
    queryClient.invalidateQueries({ queryKey: ['topics-bulk-lesson'] });
    queryClient.invalidateQueries({ queryKey: ['topic-lesson-content'] });
    setSelected([]);
  };

  const done = results.filter((r) => r.status === 'done').length;
  const showResults = results.length > 0;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setResults([]);
          setSelected([]);
          setIsRunning(false);
          setRunStartedAt(null);
          setElapsedMs(0);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="mr-2 h-4 w-4" />
          Générer des leçons
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Générer des leçons en masse
          </DialogTitle>
        </DialogHeader>

        {showResults ? (
          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="font-medium">
                  {isRunning ? 'Génération en cours…' : `Terminé — ${done} / ${results.length}`}
                </span>
                {isRunning && (
                  <span className="text-xs text-muted-foreground">
                    {elapsedSeconds}s écoulées
                  </span>
                )}
              </div>
              {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <Progress value={results.length ? (done / results.length) * 100 : 0} className="h-2" />
            <div className="mt-2 space-y-1">
              {results.map((r) => (
                <div key={r.topicId} className="flex items-center gap-3 border-b py-2 text-sm last:border-0">
                  {r.status === 'running' && (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
                  )}
                  {r.status === 'done' && (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                  )}
                  {r.status === 'error' && <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />}
                  {r.status === 'idle' && <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-muted" />}
                  <span className="flex-1 truncate">{r.name}</span>
                  {r.status === 'done' && r.currentStep && (
                    <span className="text-xs text-green-600 font-medium">{r.currentStep}</span>
                  )}
                  {r.error && <span className="max-w-[160px] truncate text-xs text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
            {!isRunning && (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  setResults([]);
                  setSelected([]);
                }}
              >
                Retour à la sélection
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-8 w-40 text-sm">
                  <SelectValue placeholder="Matière" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les matières</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={language} onValueChange={(v) => setLanguage(v as 'fr' | 'en')}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>

              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <Checkbox checked={onlyMissing} onCheckedChange={(v) => setOnlyMissing(Boolean(v))} />
                Sans leçon
              </label>

            </div>

            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setSelected(visible.filter((t) => !t.lesson_content).map((t) => t.id))}
                className="text-primary hover:underline"
              >
                Sélectionner sans leçon
              </button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setSelected(visible.map((t) => t.id))} className="text-primary hover:underline">
                Tout sélectionner
              </button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setSelected([])} className="text-muted-foreground hover:underline">
                Désélectionner
              </button>
            </div>

            <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-lg border">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Aucun sujet trouvé</p>
              ) : (
                visible.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => toggle(topic.id)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
                  >
                    <Checkbox checked={selected.includes(topic.id)} onCheckedChange={() => toggle(topic.id)} />
                    <span className="flex-1 truncate text-sm">{topic.name}</span>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {topic.curriculum_level_code && (
                        <Badge variant="outline" className="h-5 text-xs">
                          {topic.curriculum_level_code}
                        </Badge>
                      )}
                      {topic.lesson_content ? (
                        <>
                          <Badge className="h-5 border-green-200 bg-green-50 text-xs text-green-700 hover:bg-green-50">
                            Leçon ✓
                          </Badge>
                          <button
                            onClick={(e) => handleDeleteOne(topic.id, e)}
                            disabled={deletingIds.has(topic.id)}
                            title="Supprimer la leçon"
                            className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                          >
                            {deletingIds.has(topic.id)
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      ) : (
                        <Badge variant="outline" className="h-5 text-xs text-muted-foreground">
                          Pas de leçon
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">
                {selected.length} sélectionné{selected.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                {selected.some(id => topics.find(t => t.id === id)?.lesson_content) && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteSelected}
                    disabled={isRunning || deletingIds.size > 0}
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer les leçons
                  </Button>
                )}
                <Button onClick={handleGenerate} disabled={!selected.length || isRunning} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  {`Générer ${selected.length > 0 ? `${selected.length} leçon${selected.length !== 1 ? 's' : ''}` : ''}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
