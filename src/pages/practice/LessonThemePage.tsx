import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { LessonV21Path } from '@/components/learning/LessonV21Path';
import { LegacyThemePath } from '@/components/learning/LegacyThemePath';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { usePracticeTopics } from '@/hooks/usePracticeTopics';
import { buildThemeLessonPlan } from '@/features/practice/lessonThemes';

export default function LessonThemePage() {
  const navigate = useNavigate();
  const { subject, themeId } = useParams<{ subject: string; themeId: string }>();
  const activeSchoolLevel = useActiveSchoolLevel();
  const { themeGroups, isLoading: topicsLoading } = usePracticeTopics(subject ?? '', activeSchoolLevel.normalizedLevel ?? '');
  const isLoading = topicsLoading || activeSchoolLevel.isLoading;
  const theme = themeGroups.find((group) => group.id === themeId);

  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (!theme) return <div className="p-8 text-center">Ce thème n’est pas disponible.</div>;
  const plan = buildThemeLessonPlan(theme);
  const aggregateLesson = plan.v21Levels.length > 0 ? {
    version: '2.1' as const,
    topic_goal: theme.label,
    levels: plan.v21Levels.map((entry, index, all) => ({
      ...entry.level,
      // Keep the first source's persisted level IDs stable; namespace only
      // colliding IDs from another published topic.
      id: all.findIndex((candidate) => candidate.level.id === entry.level.id) === index
        ? entry.level.id
        : `${entry.topicId}:${entry.level.id}`,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-[#F3F6FA] pb-10" data-testid="lesson-theme-page">
      <PageMeta title={theme.label} description="" />
      <header className="border-b border-border bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button type="button" onClick={() => navigate(`/practice/${encodeURIComponent(subject ?? '')}`)} aria-label="Retour" className="rounded-full border p-2"><ArrowLeft className="h-4 w-4" /></button>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thème</p><h1 className="text-xl font-bold text-[#0F172A]">{theme.label}</h1></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-5 sm:px-6">
        <section
          className="rounded-2xl border border-[#EAECEF] bg-white p-3 shadow-sm"
          data-testid="theme-level-list"
          data-topic-ids={theme.topics.map((topic) => topic.id).join(',')}
        >
          {aggregateLesson ? (
            <LessonV21Path
              topicId={theme.topics[0]?.id ?? theme.id}
              topicName=""
              lesson={aggregateLesson}
              levelLabelsOnly
              levelTopicIds={plan.v21Levels.map((entry) => entry.topicId)}
            />
          ) : plan.legacyTopics.length > 0 ? (
            <LegacyThemePath entries={plan.legacyTopics} topicName={theme.label} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Cette leçon publiée n’est pas compatible avec le lecteur.</p>
          )}
        </section>
      </main>
    </div>
  );
}
