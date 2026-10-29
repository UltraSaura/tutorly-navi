import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { getSubjectNameForSlug } from '@/utils/examSubjectMapping';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { groupPublishedLessonTopics } from '@/features/practice/lessonThemes';

export const CANONICAL_THEMES_BUILD_MARKER = 'canonical-themes-v1';

export function learningThemePath(subjectSlug: string, themeId: string): string {
  return `/learning/${encodeURIComponent(subjectSlug)}/theme/${themeId}`;
}

/**
 * The learning library and the practice library intentionally share the same
 * published-theme source. Topic IDs remain inside each theme and are used by
 * the theme reader for routing and progress; child topic titles never become
 * student-facing cards here.
 */
export default function SubjectDashboardPage() {
  const ui = useInterfaceTranslation();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { subjectSlug = '' } = useParams<{ subjectSlug: string }>();
  const { data, isLoading, error } = useSubjectDashboard(subjectSlug);
  const themeGroups = groupPublishedLessonTopics(
    (data?.categories ?? []).flatMap((category) => (category.topics ?? []).map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      topicLabel: topic.name,
      orderIndex: topic.order_index,
      lessonContent: topic.lesson_content,
      domainLabel: category.name,
    }))),
  );
  const subjectName = getSubjectNameForSlug(subjectSlug, i18n.language, data?.subject?.name);

  return (
    <div className="min-h-screen bg-[#F3F6FA] pb-24" data-build-marker={CANONICAL_THEMES_BUILD_MARKER}>
      <PageMeta title={subjectName} description="" />
      <header className="border-b border-border bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">{subjectName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choisis un thème pour apprendre à ton rythme.</p>
          </div>
          <button type="button" onClick={() => navigate('/learning')} className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {ui('Retour')}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 sm:px-6" data-testid="lesson-theme-list">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Tes thèmes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Les thèmes disponibles contiennent une leçon publiée.</p>
        </div>
        {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" aria-label="Chargement" />}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger les leçons.</p>}
        {!isLoading && !error && themeGroups.length === 0 && <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Aucune leçon publiée pour ce niveau.</div>}
        <div className="space-y-3">
          {themeGroups.map((theme) => (
            <button
              key={theme.id}
              type="button"
              data-testid="lesson-theme-tile"
              data-theme-id={theme.id}
              onClick={() => navigate(learningThemePath(subjectSlug, theme.id))}
              className="flex w-full items-center gap-4 rounded-2xl border border-[#EAECEF] bg-white p-4 text-left shadow-sm transition hover:border-[#9FE1CB] hover:bg-[#F2FBF8]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E2F7F1] text-[#085041]"><BookOpen className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-[#0F172A]">{theme.label}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
