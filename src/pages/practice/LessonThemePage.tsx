import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { LessonV21Path } from '@/components/learning/LessonV21Path';
import { LessonContentStudent } from '@/components/learning/LessonContentStudent';
import { parseLessonV21 } from '@/types/lesson-generator';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { usePracticeTopics } from '@/hooks/usePracticeTopics';
import { getThemeTopicDisplayLabels } from '@/features/practice/lessonThemes';

export default function LessonThemePage() {
  const navigate = useNavigate();
  const { subject, themeId } = useParams<{ subject: string; themeId: string }>();
  const activeSchoolLevel = useActiveSchoolLevel();
  const { themeGroups, isLoading: topicsLoading } = usePracticeTopics(subject ?? '', activeSchoolLevel.normalizedLevel ?? '');
  const isLoading = topicsLoading || activeSchoolLevel.isLoading;
  const theme = themeGroups.find((group) => group.id === themeId);

  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (!theme) return <div className="p-8 text-center">Ce thème n’est pas disponible.</div>;
  const topicDisplayLabels = getThemeTopicDisplayLabels(theme.topics);

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
        {theme.topics.map((topic, index) => {
          const lesson = parseLessonV21(topic.lessonContent);
          return (
            <section key={topic.id} className="rounded-2xl border border-[#EAECEF] bg-white p-3 shadow-sm" data-testid="theme-topic-lesson" data-topic-id={topic.id}>
              {theme.topics.length > 1 && <h2 className="px-2 pb-2 text-base font-bold text-[#0F172A]">{topicDisplayLabels[index]}</h2>}
              {lesson ? <LessonV21Path topicId={topic.id} topicName={topic.topicLabel} lesson={lesson} /> : <LessonContentStudent topicId={topic.id} />}
            </section>
          );
        })}
      </main>
    </div>
  );
}
