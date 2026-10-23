import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
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
import { Link } from 'react-router-dom';
import { formatGenerationErrorDetails, generationErrorMessages, getGenerationErrorDetails, type GenerationErrorDetails } from './generationErrorMapping';
import { geometryDraftLesson } from './geometryDraft';
import { runBulkStagingGeneration, type BulkStagingProgress } from '@/services/bulkStagingLessonWorkflow';
import { deriveBulkLessonStatus, type BulkLessonStatus } from './bulkLessonStatus';

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

type GenStatus = 'idle' | 'generating' | 'validating' | 'saved' | 'failed';

interface GenResult {
  topicId: string;
  name: string;
  status: GenStatus;
  error?: string;
  technicalDetail?: string;
  currentStep?: string;
  progress?: BulkStagingProgress;
  providerCalls?: number;
  failedLevel?: number;
  failureStage?: string;
  httpStatus?: number;
  errorCode?: string;
  requestId?: string;
}

async function getFunctionErrorDetails(err: unknown, response?: Response): Promise<GenerationErrorDetails> {
  const candidateResponse = response || (typeof err === 'object' && err !== null && 'context' in err && (err as { context?: Response }).context instanceof Response
    ? (err as { context?: Response }).context : undefined);
  if (!candidateResponse) return getGenerationErrorDetails(err, 'The generation request could not start.');
  try {
    const payload = await candidateResponse.clone().json();
    return {
      ...getGenerationErrorDetails(payload, 'The Edge Function returned an error.'),
      httpStatus: candidateResponse.status,
      requestId: getGenerationErrorDetails(payload).requestId ?? candidateResponse.headers.get('x-request-id') ?? undefined,
    };
  } catch {
    try {
      const text = await candidateResponse.clone().text();
      return { ...getGenerationErrorDetails(text, 'The Edge Function returned an unreadable error.'), httpStatus: candidateResponse.status, requestId: candidateResponse.headers.get('x-request-id') ?? undefined };
    } catch {
      return { ...getGenerationErrorDetails(err, 'The Edge Function returned an error.'), httpStatus: candidateResponse.status, requestId: candidateResponse.headers.get('x-request-id') ?? undefined };
    }
  }
}

export function BulkLessonGenerator() {
  const ui = useInterfaceTranslation();
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
  const [dryRun, setDryRun] = useState(false);
  const [showLegacyControls, setShowLegacyControls] = useState(false);

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

  const topicIds = useMemo(() => topics.map((topic) => topic.id), [topics]);
  const { data: stagingVersions = [], isLoading: isLoadingStagingVersions } = useQuery({
    queryKey: ['topic-lesson-versions-bulk-lesson', topicIds],
    queryFn: async () => {
      if (!topicIds.length) return [] as Array<{ topic_id: string; status: string }>;
      const { data, error } = await supabase
        .from('topic_lesson_versions')
        .select('topic_id, status')
        .in('topic_id', topicIds)
        .in('status', ['draft', 'validated']);
      if (error) throw error;
      return (data ?? []) as Array<{ topic_id: string; status: string }>;
    },
    enabled: open && topicIds.length > 0,
  });

  const stagingStatusesByTopic = useMemo(() => {
    const statuses = new Map<string, string[]>();
    stagingVersions.forEach((version) => {
      const current = statuses.get(version.topic_id) ?? [];
      current.push(version.status);
      statuses.set(version.topic_id, current);
    });
    return statuses;
  }, [stagingVersions]);

  const statusForTopic = (topic: TopicRow): BulkLessonStatus => deriveBulkLessonStatus({
    lessonContent: topic.lesson_content,
    stagingStatuses: stagingStatusesByTopic.get(topic.id) ?? [],
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
        if (onlyMissing && statusForTopic(t) !== 'none') return false;
        return true;
      }),
    [topics, filterSubject, filterLevel, onlyMissing, stagingStatusesByTopic],
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

    try {
      const workflowResults = await runBulkStagingGeneration(
        batch,
        (progress) => setResults((previous) => previous.map((result) => result.topicId === progress.topicId ? {
          ...result,
          status: progress.status,
          providerCalls: progress.providerCalls,
          progress,
        } : result)),
        { dryRun, dryRunContent: geometryDraftLesson, language },
      );
      setResults((previous) => previous.map((result) => {
        const workflowResult = workflowResults.find((candidate) => candidate.topicId === result.topicId);
        if (!workflowResult) return result;
        if (workflowResult.status === 'saved') return { ...result, status: 'saved', providerCalls: result.providerCalls ?? (dryRun ? 0 : 4) };
        return {
          ...result,
          status: 'failed',
          error: workflowResult.failure?.message ?? 'The staging generation failed.',
          technicalDetail: workflowResult.failure?.technicalDiagnostic,
          providerCalls: workflowResult.failure?.providerCalls ?? 0,
          failedLevel: workflowResult.failure?.failedLevel,
          failureStage: workflowResult.failure?.failureStage,
          httpStatus: workflowResult.failure?.httpStatus,
          errorCode: workflowResult.failure?.code,
          requestId: workflowResult.failure?.requestId,
        };
      }));
    } catch (err) {
      const details = await getFunctionErrorDetails(err);
      setResults((previous) => previous.map((result) => selected.includes(result.topicId) ? {
        ...result,
        status: 'failed',
        error: details.message,
        technicalDetail: details.technicalDetail,
        providerCalls: details.providerCalls ?? 0,
        failedLevel: details.level,
        failureStage: details.stage ?? 'pre_generation',
        httpStatus: details.httpStatus,
        errorCode: details.code,
        requestId: details.requestId,
      } : result));
    }

    setIsRunning(false);
    setRunStartedAt(null);
    queryClient.invalidateQueries({ queryKey: ['topics-bulk-lesson'] });
    queryClient.invalidateQueries({ queryKey: ['topic-lesson-content'] });
    setSelected([]);
  };

  const handleLegacyGenerate = async () => {
    if (!selected.length) return;
    const batch = topics.filter((topic) => selected.includes(topic.id));
    setResults(batch.map((topic) => ({ topicId: topic.id, name: topic.name, status: 'idle' })));
    setIsRunning(true);
    setRunStartedAt(Date.now());
    setElapsedMs(0);
    for (const topic of batch) {
      setResults((previous) => previous.map((result) => result.topicId === topic.id ? { ...result, status: 'generating' } : result));
      try {
        const { data, error, response } = await supabase.functions.invoke('generate-lesson-content', { body: { topicId: topic.id, language } });
        if (error) {
          const details = await getFunctionErrorDetails(error, response);
          throw Object.assign(new Error(details.message), details);
        }
        if (data?.error) throw Object.assign(new Error(getGenerationErrorDetails(data).message), getGenerationErrorDetails(data));
        setResults((previous) => previous.map((result) => result.topicId === topic.id ? { ...result, status: 'saved' } : result));
      } catch (error) {
        const details = getGenerationErrorDetails(error);
        setResults((previous) => previous.map((result) => result.topicId === topic.id ? {
          ...result,
          status: 'failed',
          error: details.message,
          technicalDetail: details.technicalDetail,
          providerCalls: details.providerCalls ?? 0,
          failedLevel: details.level,
          failureStage: details.stage ?? 'pre_generation',
          httpStatus: details.httpStatus,
          errorCode: details.code,
          requestId: details.requestId,
        } : result));
      }
    }
    setIsRunning(false);
    setRunStartedAt(null);
    setSelected([]);
  };

  const done = results.filter((r) => r.status === 'saved').length;
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
          {ui("Générer des leçons")}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {ui("Générer des leçons en masse")}
          </DialogTitle>
        </DialogHeader>

        {showResults ? (
          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="font-medium">
                {isRunning ? 'Génération staging en cours…' : `Terminé — ${done} / ${results.length}`}
                </span>
                {isRunning && (
                  <span className="text-xs text-muted-foreground">
                    {elapsedSeconds}{ui("s écoulées")}
                  </span>
                )}
              </div>
              {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <Progress value={results.length ? (done / results.length) * 100 : 0} className="h-2" />
            <div className="mt-2 space-y-1">
              {results.map((r) => {
                const formattedErrorMessage = r.error ? formatGenerationErrorDetails({
                  message: r.error,
                  technicalDetail: r.technicalDetail,
                  stage: r.failureStage,
                }) : undefined;
                const visibleErrorMessage = formattedErrorMessage &&
                  typeof formattedErrorMessage === 'string' &&
                  formattedErrorMessage.trim() &&
                  !formattedErrorMessage.includes('[object Object]')
                  ? formattedErrorMessage
                  : r.error ? generationErrorMessages.unknown : undefined;
                if (import.meta.env.DEV && r.error) {
                  console.debug('[BulkLessonGenerator] visible row error payload', {
                    topicName: r.name,
                    rawError: r.error,
                    formatted: visibleErrorMessage,
                  });
                }
                return (
                <div key={r.topicId} className="flex items-center gap-3 border-b py-2 text-sm last:border-0">
                  {(r.status === 'generating' || r.status === 'validating') && (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
                  )}
                  {r.status === 'saved' && (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                  )}
                  {r.status === 'failed' && <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />}
                  {r.status === 'idle' && <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-muted" />}
                  <span className="flex-1 truncate">{r.name}</span>
                  {r.progress && <span className="text-xs text-muted-foreground">Topic {r.progress.topicIndex} of {r.progress.totalTopics} · Level {r.progress.level} of 4 · Provider calls: {r.providerCalls ?? 0} · Status: {r.progress.status}</span>}
                  {r.status === 'failed' && <span className="text-xs text-red-500">{r.topicId} · Level {r.failedLevel ?? '?'} · {r.failureStage ?? 'failed'}{r.httpStatus ? ` · HTTP ${r.httpStatus}` : ''}</span>}
                  {visibleErrorMessage && <span title={r.technicalDetail ?? visibleErrorMessage} className="max-w-[360px] break-words text-right text-xs text-red-500">{visibleErrorMessage}</span>}
                  {r.status === 'failed' && <span className="max-w-[360px] break-words text-right text-[11px] text-muted-foreground">{[r.errorCode, r.requestId, `providerCalls=${r.providerCalls ?? 0}`, r.technicalDetail].filter(Boolean).join(' · ')}</span>}
                </div>
                );
              })}
            </div>
            {!isRunning && (
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link to="/admin/generated-lessons?workflow=staging">Voir les versions staging</Link>
              </Button>
            )}
            {!isRunning && (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  setResults([]);
                  setSelected([]);
                }}
              >
                {ui("Retour à la sélection")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-8 w-40 text-sm">
                  <SelectValue placeholder={ui("Matière")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ui("Toutes les matières")}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue placeholder={ui("Niveau")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ui("Tous")}</SelectItem>
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
                {ui("Sans leçon")}
              </label>
              {import.meta.env.DEV && <label className="flex cursor-pointer items-center gap-1.5 text-sm text-amber-700">
                <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(Boolean(v))} />
                Dry-run staging (0 appels, aucune écriture)
              </label>}
            </div>

            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setSelected(visible.filter((t) => statusForTopic(t) === 'none').map((t) => t.id))}
                className="text-primary hover:underline"
              >
                {ui("Sélectionner sans leçon")}
              </button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setSelected(visible.map((t) => t.id))} className="text-primary hover:underline">
                {ui("Tout sélectionner")}
              </button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setSelected([])} className="text-muted-foreground hover:underline">
                {ui("Désélectionner")}
              </button>
            </div>

            <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-lg border">
              {isLoading || isLoadingStagingVersions ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{ui("Aucun sujet trouvé")}</p>
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
                      {statusForTopic(topic) === 'staging' ? (
                        <Badge className="h-5 border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-50">
                          {ui("Brouillon staging")}
                        </Badge>
                      ) : topic.lesson_content ? (
                        <>
                          <Badge className="h-5 border-green-200 bg-green-50 text-xs text-green-700 hover:bg-green-50">
                            {ui("Leçon publiée")}
                          </Badge>
                          {showLegacyControls && <button
                            onClick={(e) => handleDeleteOne(topic.id, e)}
                            disabled={deletingIds.has(topic.id)}
                            title={ui("Supprimer la leçon")}
                            className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                          >
                            {deletingIds.has(topic.id)
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>}
                        </>
                      ) : (
                        <Badge variant="outline" className="h-5 text-xs text-muted-foreground">
                          {ui("Aucune version")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">
                {selected.length} {ui("sélectionné")}{selected.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                {showLegacyControls && selected.some(id => topics.find(t => t.id === id)?.lesson_content) && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteSelected}
                    disabled={isRunning || deletingIds.size > 0}
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {ui("Supprimer les leçons")}
                  </Button>
                )}
                <Button onClick={handleGenerate} disabled={!selected.length || isRunning} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  {`${dryRun ? 'Tester' : 'Générer'} ${selected.length > 0 ? `${selected.length} leçon${selected.length !== 1 ? 's' : ''}` : ''} (staging)`}
                </Button>
                <Button variant="ghost" onClick={() => setShowLegacyControls((value) => !value)} aria-expanded={showLegacyControls}>
                  {showLegacyControls ? 'Masquer les contrôles legacy' : 'Afficher les contrôles legacy'}
                </Button>
                {showLegacyControls && <Button variant="ghost" onClick={handleLegacyGenerate} disabled={!selected.length || isRunning} title="Ancien générateur; utilise l'ancien contrat et peut modifier le contenu public.">
                  Générateur legacy (modifie topics.lesson_content)
                </Button>}
              </div>
            </div>
            {showLegacyControls && <p className="text-xs text-amber-700">Legacy uniquement : ces contrôles peuvent modifier ou supprimer topics.lesson_content. Le bouton staging ci-dessus n’utilise jamais cette persistance.</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
