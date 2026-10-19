import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  generateStagingDraft,
  saveDraftVersion,
  validateSavedDraft,
  publishValidatedDraft,
  assertExplicitStagingTopicId,
  classifyStagingTopic,
  type LessonVersion,
} from '@/services/lessonVersionWorkflow';
import { formatAdminGenerationError } from './generationErrorMapping';

type TopicOption = { id: string; name: string; curriculum_level_code: string | null };

export function formatStagingTopicLabel(topic: TopicOption): string {
  return `${topic.name} · ${topic.curriculum_level_code ?? '—'}`;
}

export function StagingLessonVersionPanel({ topics }: { topics: TopicOption[] }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topicId, setTopicId] = useState('');
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topicNames = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics]);
  const topicKindOf = (id: string | null | undefined) => classifyStagingTopic(id ? topicNames.get(id)?.name : undefined);
  const selectedKind = topicId ? topicKindOf(topicId) : null;

  const refresh = async () => {
    const { data, error: queryError } = await supabase
      .from('topic_lesson_versions')
      .select('*')
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setVersions((data ?? []) as unknown as LessonVersion[]);
  };

  useEffect(() => { void refresh(); }, []);

  const run = async (action: string, fn: () => Promise<void>) => {
    setBusy(action); setError(null);
    try { await fn(); }
    catch (actionError) { const message = formatAdminGenerationError(actionError); setError(message); toast({ title: 'Staging workflow failed', description: message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const generate = () => run('generate', async () => {
    assertExplicitStagingTopicId(topicId);
    const topic = topicNames.get(topicId);
    if (!topic) throw new Error(`Topic ${topicId} is not in the loaded topic list.`);
    const existing = await supabase.from('topic_lesson_versions').select('id,status').eq('topic_id', topic.id).in('status', ['draft', 'validated', 'published']).limit(1);
    if (existing.error) throw new Error(`Duplicate draft check failed: ${existing.error.message}`);
    if ((existing.data ?? []).length > 0) throw new Error(`A staging lesson version already exists for ${topic.name}. Generation blocked to preserve draft history.`);
    if (!window.confirm(`Generate a staging draft for:\n${topic.name}\n${topic.id}\n\nThis calls the AI (up to 4 calls).`)) return;
    const generated = await generateStagingDraft(topicId, undefined, null);
    const saved = await saveDraftVersion(topicId, generated.lesson_content, generated.topic_id, null);
    await refresh();
    navigate(`/admin/generated-lessons?version=${encodeURIComponent(saved.id)}`);
  });

  const validate = (version: LessonVersion) => run(`validate:${version.id}`, async () => {
    await validateSavedDraft(version);
    await refresh();
  });

  const publish = (version: LessonVersion) => run(`publish:${version.id}`, async () => {
    if (version.status !== 'validated') throw new Error('Only a validated draft can be published.');
    if (!window.confirm('Publish this validated lesson version to the selected topic? This updates the topic for learners.')) return;
    await publishValidatedDraft(version.id, version.topic_id, version.lesson_content, true);
    await refresh();
  });

  return <Card data-testid="staging-lesson-version-workflow">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><CardTitle>Staging lesson versions</CardTitle><p className="mt-1 text-sm text-muted-foreground">Generates one provider result, saves a separate draft, and never overwrites topic content.</p></div>
        <Badge variant="outline">STAGING ONLY</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger className="w-[300px]"><SelectValue placeholder="Choose a topic" /></SelectTrigger>
          <SelectContent>{topics.map((topic) => <SelectItem key={topic.id} value={topic.id}>{formatStagingTopicLabel(topic)}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={generate} disabled={busy !== null || !topicId} data-testid="generate-draft">{busy === 'generate' ? 'Generating…' : 'Generate draft'}</Button>
        <Button asChild variant="outline"><Link to="/admin/generated-lessons?draft=geometry">Preview geometry draft</Link></Button>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="selected-topic">
        Selected: {topicId ? `${topicNames.get(topicId)?.name ?? '?'} · ${topicId}` : 'none'}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2" data-testid="lesson-version-list">
        {versions.length === 0 && <p className="text-sm text-muted-foreground">No saved staging versions yet.</p>}
        {versions.map((version) => <div key={version.id} className="flex flex-wrap items-center gap-2 rounded border p-3">
          <div className="min-w-0 flex-1"><p className="font-medium">{topicNames.get(version.topic_id)?.name ?? version.topic_id}</p><p className="text-xs text-muted-foreground">{version.id} · {new Date(version.created_at).toLocaleString()}</p></div>
          <Badge variant={version.status === 'published' ? 'default' : 'outline'}>{version.status}</Badge>
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/generated-lessons?version=${encodeURIComponent(version.id)}`)}>Preview draft</Button>
          {version.status === 'draft' && <Button size="sm" variant="outline" onClick={() => validate(version)} disabled={busy !== null}>Validate draft</Button>}
          {version.status === 'validated' && <Button size="sm" onClick={() => publish(version)} disabled={busy !== null}>Publish draft</Button>}
        </div>)}
      </div>
    </CardContent>
  </Card>;
}
