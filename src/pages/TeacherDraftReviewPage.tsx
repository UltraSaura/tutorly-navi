import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LessonV2Player } from '@/components/learning/LessonV2Player';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageMeta } from '@/components/seo/PageMeta';
import type { LessonV2 } from '@/types/lesson-generator';

type Draft = {
  id: string;
  topic_id: string;
  topic_name: string;
  curriculum_level_code: string | null;
  created_at: string;
  lesson_content: {
    levels?: Array<{
      id?: string;
      level_number?: number;
      title?: string;
      lesson: LessonV2;
    }>;
  };
};

const dateLabel = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
}).format(new Date(value));

export default function TeacherDraftReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [levelIndex, setLevelIndex] = useState(0);
  // A fragment keeps the bearer key out of HTTP request URLs and Vercel access logs.
  const shareToken = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.hash.slice(1)).get('key') ?? '';

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!shareToken) { setLoadFailed(true); setLoading(false); return; }
      const result = await (supabase as any).rpc('get_teacher_review_drafts', { p_token: shareToken });
      if (!active) return;
      if (result.error || !Array.isArray(result.data)) setLoadFailed(true);
      else {
        const rows = result.data as Draft[];
        setDrafts(rows);
        setSelectedId(rows[0]?.id ?? '');
        if (rows.length === 0) setLoadFailed(true);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [shareToken]);

  const filteredDrafts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    return drafts.filter((draft) => !query || `${draft.topic_name} ${draft.curriculum_level_code ?? ''} ${draft.id}`.toLocaleLowerCase('fr-FR').includes(query));
  }, [drafts, search]);
  const selected = drafts.find((draft) => draft.id === selectedId) ?? filteredDrafts[0];
  const levels = selected?.lesson_content.levels ?? [];
  const current = levels[Math.min(levelIndex, Math.max(0, levels.length - 1))];

  return <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 md:px-8">
    <PageMeta title="Relecture des brouillons de leçons" description="Espace de lecture seule pour examiner les brouillons de leçons de mathématiques CM2." />
    <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
    <header className="space-y-2">
      <Badge variant="outline">RELECTURE ENSEIGNANT · MATHÉMATIQUES · CM2</Badge>
      <h1 className="text-3xl font-bold md:text-4xl">Brouillons de leçons à relire</h1>
      <p className="max-w-3xl text-muted-foreground">Choisissez une leçon à gauche, puis parcourez ses niveaux comme un élève. Cette page est en lecture seule : les versions présentées sont des brouillons et ne sont pas publiées dans Tutorly.</p>
    </header>

    {loading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Chargement des brouillons…</CardContent></Card>
      : loadFailed ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Ce lien de relecture est invalide ou a été désactivé. Demandez au propriétaire de vous partager un lien valide.</CardContent></Card>
        : <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Toutes les versions ({drafts.length})</CardTitle>
              <p className="text-xs text-muted-foreground">Liste actualisée à chaque ouverture à partir des brouillons de staging.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une leçon…" aria-label="Rechercher une leçon" />
              <p className="text-xs text-muted-foreground">{filteredDrafts.length} version{filteredDrafts.length === 1 ? '' : 's'} affichée{filteredDrafts.length === 1 ? '' : 's'}</p>
              <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1" role="list" aria-label="Brouillons de leçons">
                {filteredDrafts.map((draft) => <button
                  key={draft.id}
                  type="button"
                  role="listitem"
                  aria-current={draft.id === selected?.id ? 'true' : undefined}
                  onClick={() => { setSelectedId(draft.id); setLevelIndex(0); }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${draft.id === selected?.id ? 'border-primary bg-primary/5' : 'bg-background'}`}
                >
                  <span className="block font-semibold">{draft.topic_name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{draft.curriculum_level_code?.toUpperCase() ?? 'Niveau non renseigné'} · {dateLabel(draft.created_at)}</span>
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">Version {draft.id.slice(0, 8)}</span>
                </button>)}
                {filteredDrafts.length === 0 && <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">Aucune leçon ne correspond à cette recherche.</p>}
              </div>
            </CardContent>
          </Card>

          {selected && current ? <section className="min-w-0 space-y-4" aria-label={`Leçon ${selected.topic_name}`}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><CardTitle>{selected.topic_name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{selected.curriculum_level_code?.toUpperCase() ?? 'Niveau non renseigné'} · créée le {dateLabel(selected.created_at)} · version {selected.id}</p></div>
                  <Badge variant="outline">BROUILLON · NON PUBLIÉ</Badge>
                </div>
              </CardHeader>
            </Card>
            <nav className="flex flex-wrap gap-2" aria-label="Niveaux de la leçon">
              {levels.map((level, index) => <Button key={level.id ?? index} size="sm" variant={index === levelIndex ? 'default' : 'outline'} onClick={() => setLevelIndex(index)}>
                Niveau {level.level_number ?? index + 1}: {level.title ?? `Leçon ${index + 1}`}
              </Button>)}
            </nav>
            <Card><CardHeader><CardTitle>{current.title ?? `Niveau ${levelIndex + 1}`}</CardTitle></CardHeader><CardContent>
              <LessonV2Player topicId={selected.topic_id} topicName={selected.topic_name} lesson={{ version: '2.0', ...current.lesson } as LessonV2} readOnly />
            </CardContent></Card>
          </section> : <Card><CardContent className="p-8 text-sm text-muted-foreground">Aucun brouillon à afficher.</CardContent></Card>}
        </div>}
  </main>;
}
