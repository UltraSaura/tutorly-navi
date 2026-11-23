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
import { useTranslation } from 'react-i18next';
import { useSubjectLabel } from '@/i18n/useSubjectLabel';
import { getSchoolLevelLabel, normalizeSchoolLevel } from '@/domain/schoolLevels';

type Draft = {
  id: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
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

const dateLabel = (value: string, language = 'fr') => new Intl.DateTimeFormat(language.startsWith('fr') ? 'fr-FR' : 'en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
}).format(new Date(value));

export default function TeacherDraftReviewPage() {
  const { i18n } = useTranslation();
  const subjectLabel = useSubjectLabel();
  const isEnglish = (i18n.resolvedLanguage || i18n.language || 'fr').startsWith('en');
  const copy = isEnglish ? {
    badge: 'TEACHER REVIEW · LESSON DRAFTS', title: 'Lesson drafts for review',
    intro: 'Choose a lesson on the left, then browse its levels as a student. This page is read-only; these drafts are not published in Tutorly. Page labels follow your app language; lesson content stays in the language it was written in.',
    allDrafts: 'Lesson drafts', refresh: 'Drafts are loaded from staging whenever this page opens.',
    search: 'Search lessons…', searchLabel: 'Search lessons', allSubjects: 'All subjects', allLevels: 'All levels',
    shown: 'shown', version: 'version', versions: 'versions', noMatch: 'No lessons match these filters.',
    noLevel: 'Level not specified', created: 'created', draft: 'DRAFT · UNPUBLISHED',
    lesson: 'Lesson', noDrafts: 'No draft to display.', invalid: 'This review link is invalid or has been disabled. Ask the owner to share a valid link.', loading: 'Loading drafts…',
    level: 'Level', versionTag: 'Version', levels: 'Lesson levels', draftsList: 'Lesson drafts',
  } : {
    badge: 'RELECTURE ENSEIGNANT · BROUILLONS DE LEÇONS', title: 'Brouillons de leçons à relire',
    intro: 'Choisissez une leçon à gauche, puis parcourez ses niveaux comme un élève. Cette page est en lecture seule : ces brouillons ne sont pas publiés dans Tutorly. Les libellés suivent la langue de l’application ; le contenu d’une leçon reste dans sa langue de rédaction.',
    allDrafts: 'Brouillons de leçons', refresh: 'Les brouillons sont chargés depuis le staging à chaque ouverture.',
    search: 'Rechercher une leçon…', searchLabel: 'Rechercher une leçon', allSubjects: 'Toutes les matières', allLevels: 'Tous les niveaux',
    shown: 'affichée', version: 'version', versions: 'versions', noMatch: 'Aucune leçon ne correspond à ces filtres.',
    noLevel: 'Niveau non renseigné', created: 'créée le', draft: 'BROUILLON · NON PUBLIÉ',
    lesson: 'Leçon', noDrafts: 'Aucun brouillon à afficher.', invalid: 'Ce lien de relecture est invalide ou a été désactivé. Demandez au propriétaire de vous partager un lien valide.', loading: 'Chargement des brouillons…',
    level: 'Niveau', versionTag: 'Version', levels: 'Niveaux de la leçon', draftsList: 'Brouillons de leçons',
  };
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
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
    return drafts.filter((draft) => {
      const matchesQuery = !query || `${draft.topic_name} ${draft.subject_name} ${draft.curriculum_level_code ?? ''} ${draft.id}`.toLocaleLowerCase('fr-FR').includes(query);
      const matchesSubject = subjectFilter === 'all' || draft.subject_name === subjectFilter;
      const matchesLevel = levelFilter === 'all' || normalizeSchoolLevel(draft.curriculum_level_code) === levelFilter;
      return matchesQuery && matchesSubject && matchesLevel;
    });
  }, [drafts, search, subjectFilter, levelFilter]);
  const subjects = useMemo(() => [...new Set(drafts.map((draft) => draft.subject_name).filter(Boolean))].sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), i18n.resolvedLanguage || 'fr')), [drafts, i18n.resolvedLanguage, subjectLabel]);
  const levelsOptions = useMemo(() => [...new Set(drafts.map((draft) => normalizeSchoolLevel(draft.curriculum_level_code)).filter((level): level is string => Boolean(level)))].sort((a, b) => getSchoolLevelLabel(a, i18n.resolvedLanguage || 'fr').localeCompare(getSchoolLevelLabel(b, i18n.resolvedLanguage || 'fr'), i18n.resolvedLanguage || 'fr')), [drafts, i18n.resolvedLanguage]);
  const selected = filteredDrafts.find((draft) => draft.id === selectedId) ?? filteredDrafts[0];
  const levels = selected?.lesson_content.levels ?? [];
  const current = levels[Math.min(levelIndex, Math.max(0, levels.length - 1))];

  return <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 md:px-8">
    <PageMeta title={isEnglish ? 'Teacher review of lesson drafts' : 'Relecture des brouillons de leçons'} description={isEnglish ? 'Read-only review of Tutorly lesson drafts.' : 'Espace de lecture seule pour examiner les brouillons de leçons Tutorly.'} />
    <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
    <header className="space-y-2">
      <Badge variant="outline">{copy.badge}</Badge>
      <h1 className="text-3xl font-bold md:text-4xl">{copy.title}</h1>
      <p className="max-w-3xl text-muted-foreground">{copy.intro}</p>
    </header>

    {loading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">{copy.loading}</CardContent></Card>
      : loadFailed ? <Card><CardContent className="p-6 text-sm text-muted-foreground">{copy.invalid}</CardContent></Card>
        : <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{copy.allDrafts} ({filteredDrafts.length}/{drafts.length})</CardTitle>
              <p className="text-xs text-muted-foreground">{copy.refresh}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} aria-label={copy.searchLabel} />
              <label className="block space-y-1 text-sm"><span>{isEnglish ? 'Subject' : 'Matière'}</span><select className="w-full rounded-md border bg-background px-3 py-2" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} aria-label={isEnglish ? 'Filter by subject' : 'Filtrer par matière'}><option value="all">{copy.allSubjects}</option>{subjects.map((subject) => <option key={subject} value={subject}>{subjectLabel(subject)}</option>)}</select></label>
              <label className="block space-y-1 text-sm"><span>{isEnglish ? 'Curriculum level' : 'Niveau scolaire'}</span><select className="w-full rounded-md border bg-background px-3 py-2" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} aria-label={isEnglish ? 'Filter by level' : 'Filtrer par niveau'}><option value="all">{copy.allLevels}</option>{levelsOptions.map((level) => <option key={level} value={level}>{getSchoolLevelLabel(level, i18n.resolvedLanguage || 'fr') || level}</option>)}</select></label>
              <p className="text-xs text-muted-foreground">{filteredDrafts.length} {filteredDrafts.length === 1 ? copy.version : copy.versions} {copy.shown}</p>
              <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1" role="list" aria-label={copy.draftsList}>
                {filteredDrafts.map((draft) => <button
                  key={draft.id}
                  type="button"
                  role="listitem"
                  aria-current={draft.id === selected?.id ? 'true' : undefined}
                  onClick={() => { setSelectedId(draft.id); setLevelIndex(0); }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${draft.id === selected?.id ? 'border-primary bg-primary/5' : 'bg-background'}`}
                >
                  <span className="block font-semibold">{draft.topic_name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{subjectLabel(draft.subject_name)} · {getSchoolLevelLabel(draft.curriculum_level_code, i18n.resolvedLanguage || 'fr') || copy.noLevel} · {dateLabel(draft.created_at, i18n.resolvedLanguage || 'fr')}</span>
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{copy.versionTag} {draft.id.slice(0, 8)}</span>
                </button>)}
                {filteredDrafts.length === 0 && <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">{copy.noMatch}</p>}
              </div>
            </CardContent>
          </Card>

          {selected && current ? <section className="min-w-0 space-y-4" aria-label={`${copy.lesson} ${selected.topic_name}`}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><CardTitle>{selected.topic_name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{subjectLabel(selected.subject_name)} · {getSchoolLevelLabel(selected.curriculum_level_code, i18n.resolvedLanguage || 'fr') || copy.noLevel} · {copy.created} {dateLabel(selected.created_at, i18n.resolvedLanguage || 'fr')} · {copy.version} {selected.id}</p></div>
                  <Badge variant="outline">{copy.draft}</Badge>
                </div>
              </CardHeader>
            </Card>
            <nav className="flex flex-wrap gap-2" aria-label={copy.levels}>
              {levels.map((level, index) => <Button key={level.id ?? index} size="sm" variant={index === levelIndex ? 'default' : 'outline'} onClick={() => setLevelIndex(index)}>
                {copy.level} {level.level_number ?? index + 1}: {level.title ?? `${copy.lesson} ${index + 1}`}
              </Button>)}
            </nav>
            <Card><CardHeader><CardTitle>{current.title ?? `Niveau ${levelIndex + 1}`}</CardTitle></CardHeader><CardContent>
              <LessonV2Player topicId={selected.topic_id} topicName={selected.topic_name} lesson={{ version: '2.0', ...current.lesson } as LessonV2} readOnly />
            </CardContent></Card>
          </section> : <Card><CardContent className="p-8 text-sm text-muted-foreground">{copy.noDrafts}</CardContent></Card>}
        </div>}
  </main>;
}
