import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LessonV2Player } from '@/components/learning/LessonV2Player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageMeta } from '@/components/seo/PageMeta';
import { storedGeometryVisualFixture } from '@/components/admin/learning/geometryLesson.fixture';
import { geometryDraftLesson } from '@/components/admin/learning/geometryDraft';
import { discoverLessonVisuals } from '@/components/admin/learning/GeneratedLessonsPage';
import { assertExplicitStagingTopicId, validateLessonVersion, type LessonVersion } from '@/services/lessonVersionWorkflow';
import { runBulkStagingGeneration, type BulkStagingProgress, type BulkStagingResult } from '@/services/bulkStagingLessonWorkflow';
import type { LessonV2, LessonV21 } from '@/types/lesson-generator';

type Topic = { id: string; name: string; curriculum_level_code: string | null };
type DraftRow = Pick<LessonVersion, 'id' | 'topic_id' | 'status' | 'lesson_content' | 'created_at' | 'updated_at'>;

function parseLesson(value: unknown): LessonV21 | null {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as LessonV21; } catch { return null; }
  }
  return value && typeof value === 'object' ? value as LessonV21 : null;
}

export function playerLesson(level: LessonV21['levels'][number]): LessonV2 {
  return { version: '2.0', ...level.lesson } as LessonV2;
}

export function previewVisualKinds(lesson: unknown): string[] {
  return discoverLessonVisuals(lesson).map(({ visual }) => String(visual.kind));
}

export const providerFreeFourLevelLesson = {
  ...geometryDraftLesson,
  levels: [1, 2, 3, 4].map((levelNumber) => ({ ...geometryDraftLesson.levels[0], id: `provider-free-level-${levelNumber}`, level_number: levelNumber })),
};

function topicIds(topics: Topic[], selected: Set<string>): string[] {
  return topics.filter((topic) => selected.has(topic.id)).map((topic) => topic.id);
}

function diagnostics(result: BulkStagingResult): string {
  if (result.status === 'saved') return `Saved draft ${result.version?.id ?? 'unknown'} · providerCalls=${result.providerCalls ?? 0} · requestId=${result.requestId ?? 'not returned'}${result.build ? ` · build=${result.build}` : ''}${result.promptVersion ? ` · promptVersion=${result.promptVersion}` : ''}`;
  const failure = result.failure;
  return `${failure?.failureStage ?? 'unknown'} · ${failure?.technicalDiagnostic ?? 'No diagnostic'} · providerCalls=${failure?.providerCalls ?? 0}${failure?.requestId ? ` · requestId=${failure.requestId}` : ''}${failure?.build ? ` · build=${failure.build}` : ''}${failure?.promptVersion ? ` · promptVersion=${failure.promptVersion}` : ''}`;
}

function validationSummary(result: BulkStagingResult): string {
  const validation = result.validation;
  if (!validation) return 'Validation metadata unavailable';
  return [
    `canonical=${validation.canonicalValid}`,
    `pedagogical=${validation.pedagogicalValid}`,
    `prerequisite=${validation.prerequisiteValid ?? validation.canonicalValid}`,
    `geometry=${validation.geometryValid}`,
    `interaction=${validation.interactionValid ?? validation.canonicalValid}`,
  ].join(' · ');
}

export function StagingLessonWorkflowPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [progress, setProgress] = useState<BulkStagingProgress | null>(null);
  const [results, setResults] = useState<BulkStagingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dryRun = searchParams.get('dryRun') === '1';

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: queryError } = await supabase.from('topics').select('id,name,curriculum_level_code').order('name');
      if (!active) return;
      if (queryError) setError(queryError.message);
      else setTopics((data ?? []) as Topic[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const selectedTopics = useMemo(() => topics.filter((topic) => selected.has(topic.id)), [topics, selected]);
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const run = async () => {
    setError(null); setResults([]); setProgress(null);
    try {
      if (selected.size === 0) throw new Error('staging_topic_id_required: choose at least one topic explicitly.');
      if (mode === 'single' && selected.size !== 1) throw new Error('single_topic_required: select exactly one topic.');
      const ids = topicIds(topics, selected);
      ids.forEach((id) => assertExplicitStagingTopicId(id));
      const output = await runBulkStagingGeneration(selectedTopics, setProgress, {
        dryRun,
        dryRunContent: providerFreeFourLevelLesson,
      });
      setResults(output);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : JSON.stringify(runError));
    }
  };

  return <div className="space-y-6">
    <PageMeta title="Staging lesson versions" description="Generate isolated validated lesson-version drafts" />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Badge variant="outline">ADMIN · STAGING ONLY</Badge><h1 className="mt-2 text-3xl font-bold">New lesson-version workflow</h1><p className="text-muted-foreground">Independent from the legacy bulk generator. Drafts are saved only to topic_lesson_versions.</p></div>
      <Button asChild variant="outline"><Link to="/admin/generated-lessons">Legacy generator and reviews</Link></Button>
    </div>
    <Card><CardHeader><CardTitle>1. Choose explicit topic UUIDs</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex gap-2"><Button variant={mode === 'single' ? 'default' : 'outline'} onClick={() => setMode('single')}>Single topic</Button><Button variant={mode === 'bulk' ? 'default' : 'outline'} onClick={() => setMode('bulk')}>Bulk topics</Button></div>
      {loading ? <p>Loading topics…</p> : <div className="grid gap-2 md:grid-cols-2">{topics.map((topic) => <label key={topic.id} className="flex items-start gap-3 rounded border p-3"><input type="checkbox" checked={selected.has(topic.id)} onChange={() => toggle(topic.id)} /><span><span className="block font-medium">{topic.name}</span><span className="block text-xs text-muted-foreground">{topic.id} · {topic.curriculum_level_code ?? '—'}</span></span></label>)}</div>}
      <p className="text-xs text-muted-foreground">Explicit topic UUIDs are required. Fixture topics are rejected before any provider call.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button onClick={run} disabled={loading || progress?.status === 'generating' || progress?.status === 'validating'}>{dryRun ? 'Run provider-free dry-run' : mode === 'single' ? 'Generate one draft' : 'Generate selected drafts'}</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>2. Progress and diagnostics</CardTitle></CardHeader><CardContent className="space-y-3">
      {progress && <div data-testid="staging-progress" className="rounded border p-3 text-sm"><p>Topic {progress.topicIndex} of {progress.totalTopics}</p><p>Level {progress.level} of {progress.totalLevels}</p><p>Provider calls: {progress.providerCalls}</p><p>Status: {progress.status}</p><p className="text-xs text-muted-foreground">{progress.topicId} · {progress.topicTitle}</p></div>}
      {results.map((result) => <div key={result.topicId} className="rounded border p-3 text-sm"><p className="font-medium">{result.topicTitle} · {result.topicId}</p><p>Status: {result.status}</p><p>{diagnostics(result)}</p>{result.status === 'saved' && <p className="text-xs text-muted-foreground">{validationSummary(result)}</p>}{result.levelResults && <div className="mt-2 space-y-1 text-xs" data-testid={`level-results-${result.topicId}`}><p className="font-medium">Per-level results</p>{result.levelResults.map((level) => <p key={String(level.level)}>Level {String(level.level)}: {String(level.status)} · calls={String(level.providerCalls)} · canonical={String(level.canonicalValid ?? 'n/a')} · pedagogical={String(level.pedagogicalValid ?? 'n/a')} · prerequisite={String(level.prerequisiteValid ?? 'n/a')} · geometry={String(level.geometryValid ?? 'n/a')} · interaction={String(level.interactionValid ?? 'n/a')}{Array.isArray(level.diagnostics) && level.diagnostics.length > 0 ? ` · ${level.diagnostics.join(' | ')}` : ''}</p>)}</div>}{result.version && <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate(`/admin/staging-lessons/preview/${result.version?.id}`)}>Open draft preview</Button>}</div>)}
      {!progress && results.length === 0 && <p className="text-sm text-muted-foreground">No run started.</p>}
    </CardContent></Card>
  </div>;
}

export function StagingLessonDraftPreviewPage() {
  const { versionId } = useParams();
  const [row, setRow] = useState<DraftRow | null>(null);
  const [topic, setTopic] = useState<{ name: string; curriculum_subject_id: string | null } | null>(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!versionId) { setError('Draft version ID is required.'); setLoading(false); return; }
      const result = await supabase.from('topic_lesson_versions').select('id,topic_id,status,lesson_content,created_at,updated_at').eq('id', versionId).maybeSingle();
      if (!active) return;
      if (result.error) setError(result.error.message);
      else if (!result.data) setError('Draft version not found.');
      else if (result.data.status !== 'draft') setError('Only draft versions can be opened in this preview.');
      else {
        setRow(result.data as DraftRow);
        const topicResult = await supabase.from('topics').select('name,curriculum_subject_id').eq('id', result.data.topic_id).maybeSingle();
        if (topicResult.error) setError(topicResult.error.message);
        else setTopic(topicResult.data);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [versionId]);

  if (loading) return <div className="p-6">Loading draft preview…</div>;
  if (error || !row || !topic) return <div className="space-y-4"><PageMeta title="Draft preview" description="Protected staging draft preview" /><p role="alert" className="text-destructive">{error ?? 'Draft unavailable.'}</p><Button asChild variant="outline"><Link to="/admin/staging-lessons">Back to staging workflow</Link></Button></div>;
  const lesson = parseLesson(row.lesson_content);
  if (!lesson) return <p role="alert">Draft lesson content is not valid JSON.</p>;
  const levels = Array.isArray(lesson.levels) ? lesson.levels : [];
  const current = levels[levelIndex];
  const validation = validateLessonVersion(row.lesson_content);
  const kinds = levels.flatMap((level) => previewVisualKinds(level.lesson));
  if (!current) return <p role="alert">Draft has no lesson levels.</p>;
  return <div className="space-y-6">
    <PageMeta title={`Draft preview · ${topic.name}`} description="Protected admin preview using the student lesson player" />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="outline">PROTECTED ADMIN DRAFT</Badge><h1 className="mt-2 text-3xl font-bold">{topic.name}</h1><p className="text-xs text-muted-foreground">{row.id} · topic {row.topic_id} · status={row.status}</p></div><Button asChild variant="outline"><Link to="/admin/staging-lessons">Back to staging workflow</Link></Button></div>
    <Card><CardHeader><CardTitle>Validation and visual inventory</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Canonical: {String(validation.canonicalValid)} · pedagogical: {String(validation.pedagogicalValid)} · prerequisite: {String(validation.prerequisiteValid ?? validation.canonicalValid)} · geometry: {String(validation.geometryValid)} · interaction: {String(validation.interactionValid ?? validation.canonicalValid)}</p><p>All levels: {levels.length} · visuals: {kinds.length}</p><p data-testid="draft-visual-kinds">{kinds.join(', ')}</p></CardContent></Card>
    <div className="flex flex-wrap gap-2">{levels.map((level, index) => <Button key={level.id ?? index} size="sm" variant={index === levelIndex ? 'default' : 'outline'} onClick={() => setLevelIndex(index)}>Niveau {level.level_number ?? index + 1}: {level.title}</Button>)}</div>
    <Card><CardHeader><CardTitle>{current.title}</CardTitle></CardHeader><CardContent><div className="min-h-[600px]"><LessonV2Player topicId={row.topic_id} subjectId={topic.curriculum_subject_id} topicName={topic.name} lesson={playerLesson(current)} readOnly /></div></CardContent></Card>
  </div>;
}

export default StagingLessonWorkflowPage;
