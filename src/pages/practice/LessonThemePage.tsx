import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { LessonV21Path } from '@/components/learning/LessonV21Path';
import { parseLessonV21 } from '@/types/lesson-generator';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { usePracticeTopics } from '@/hooks/usePracticeTopics';
import { CANONICAL_LEVEL_LABELS } from '@/features/practice/lessonThemes';

export default function LessonThemePage() {
  const navigate = useNavigate();
  const { subject, themeId } = useParams<{ subject: string; themeId: string }>();
  const activeSchoolLevel = useActiveSchoolLevel();
  const { themeGroups, isLoading: topicsLoading } = usePracticeTopics(subject ?? '', activeSchoolLevel.normalizedLevel ?? '');
  const isLoading = topicsLoading || activeSchoolLevel.isLoading;
  const theme = themeGroups.find((group) => group.id === themeId);

  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (!theme) return <div className="p-8 text-center">Ce thème n’est pas disponible.</div>;
  const sourceTopic = theme.topics.find((topic) => {
    const lesson = parseLessonV21(topic.lessonContent);
    return lesson?.levels.length === 4;
  }) ?? theme.topics[0];
  const lesson = sourceTopic ? parseLessonV21(sourceTopic.lessonContent) : null;

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
          {lesson && sourceTopic && lesson.levels.length === 4 ? (
            <LessonV21Path topicId={sourceTopic.id} topicName="" lesson={lesson} levelLabelsOnly />
          ) : (
            <div className="space-y-3">
              {CANONICAL_LEVEL_LABELS.map((label, index) => (
                <div key={label} data-testid="lesson-level-card" className="flex items-center gap-3 rounded-2xl border bg-white p-4 opacity-60">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <span className="font-bold">{label}</span>
                  {index > 0 && <span className="ml-auto text-xs text-slate-500">Termine le niveau précédent</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
