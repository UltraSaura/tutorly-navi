import { useSubjectLabel } from '@/i18n/useSubjectLabel';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  MapPinned,
  MoreHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { Skeleton } from '@/components/ui/skeleton';
import { useExamPapers, useTrainingItemSubjectCounts } from '@/hooks/useExamImport';
import { useLearningSubjects, usePracticeSubjectButtons } from '@/hooks/useLearningSubjects';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { getSubjectNameForSlug, getSubjectSlugAliases, normalizeDisciplineKey, resolveExamDisciplinesForSubjectSlug, resolveSubjectSlugForExamDiscipline } from '@/utils/examSubjectMapping';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
import type { Subject } from '@/types/learning';
import { getSubjectPastelVisuals, normalizeSubjectKey } from '@/components/learning/subjectPastelVisuals';

const NO_ACTIVE_LEVEL = '__no_active_level__';
const MASCOT_SRC = '/practice-mascot.png';
const FALLBACK_MASCOT_SRC = '/fox-mascot.png';

const getSubjectVisuals = getSubjectPastelVisuals;

const defaultPracticeSubjects = [
  { slug: 'mathematiques', name: 'Maths', icon_name: 'calculator', icon: Calculator },
  { slug: 'francais', name: 'Français', icon_name: 'book-open', icon: BookOpen },
  { slug: 'sciences', name: 'Sciences', icon_name: 'flask-conical', icon: FlaskConical },
  { slug: 'histoire', name: 'Histoire', icon_name: 'landmark', icon: Landmark },
  { slug: 'geographie', name: 'Géographie', icon_name: 'map-pinned', icon: MapPinned },
  { slug: 'anglais', name: 'Autres', icon_name: 'more-horizontal', icon: MoreHorizontal },
] as const;

export default function PracticePage() {
  const subjectLabel = useSubjectLabel();
  const ui = useInterfaceTranslation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const subjectsQuery = useLearningSubjects();
  const practiceButtonsQuery = usePracticeSubjectButtons();
  const activeSchoolLevel = useActiveSchoolLevel();
  const activeLevel = activeSchoolLevel.normalizedLevel ?? NO_ACTIVE_LEVEL;
  const papersQuery = useExamPapers({ exam: 'dnb', level: activeLevel });
  const trainingCountsQuery = useTrainingItemSubjectCounts(activeLevel);

  const papersByDiscipline = useMemo(() => {
    const map = new Map<string, { papers: number; exercises: number }>();
    for (const paper of papersQuery.data ?? []) {
      const key = normalizeDisciplineKey(paper.discipline);
      const current = map.get(key) ?? { papers: 0, exercises: 0 };
      current.papers += 1;
      current.exercises += paper.exercise_count ?? 0;
      map.set(key, current);
    }
    return map;
  }, [papersQuery.data]);

  const subjectCards = useMemo(() => {
    const levelLabel = activeSchoolLevel.activeLevel ?? '—';
    const seenSlugs = new Set<string>();

    const mappedFromCurriculum = (subjectsQuery.data ?? []).flatMap((row) => {
      const subjectSlug = row.subject.slug;
      seenSlugs.add(subjectSlug);
      const disciplineKeys = resolveExamDisciplinesForSubjectSlug(subjectSlug).map((d) =>
        normalizeDisciplineKey(d),
      );
      const counts = disciplineKeys.reduce(
        (acc, key) => {
          const c = papersByDiscipline.get(key) ?? { papers: 0, exercises: 0 };
          return { papers: acc.papers + c.papers, exercises: acc.exercises + c.exercises };
        },
        { papers: 0, exercises: 0 },
      );
      const trainingItems = disciplineKeys.reduce((sum, key) => {
        const direct = trainingCountsQuery.data?.[key] ?? 0;
        const normalized = trainingCountsQuery.data?.[normalizeDisciplineKey(key)] ?? 0;
        return sum + Math.max(direct, normalized);
      }, 0);
      const card = {
        id: row.subject.id,
        slug: subjectSlug,
        name: getSubjectNameForSlug(subjectSlug, i18n.language, row.subject.name),
        levelLabel,
        masteryPercent: 0,
        masteredTopics: 0,
        totalTopics: 0,
        examPapers: counts.papers,
        exercises: trainingItems + row.quizzes_ready,
        sourceExercises: counts.exercises,
        practiceReady: counts.papers > 0 || trainingItems > 0 || row.videos_ready > 0 || row.quizzes_ready > 0,
        displayContext: row.subject.display_context,
      };
      return card.practiceReady && (row.subject.display_context === 'practice' || row.subject.display_context === 'both') ? [card] : [];
    });

    const fallbackCards = [];
    const allDisciplines = new Set([
      ...Array.from(papersByDiscipline.keys()),
      ...Object.keys(trainingCountsQuery.data ?? {})
    ]);

    for (const discipline of allDisciplines) {
      if (!discipline) continue;
      const slug = resolveSubjectSlugForExamDiscipline(discipline);
      if (seenSlugs.has(slug)) continue;

      const keys = resolveExamDisciplinesForSubjectSlug(slug).map(normalizeDisciplineKey);
      
      const counts = keys.reduce(
        (acc, key) => {
          const c = papersByDiscipline.get(key) ?? { papers: 0, exercises: 0 };
          return { papers: acc.papers + c.papers, exercises: acc.exercises + c.exercises };
        },
        { papers: 0, exercises: 0 },
      );
      
      const trainingItems = keys.reduce((sum, key) => {
        const direct = trainingCountsQuery.data?.[key] ?? 0;
        const normalized = trainingCountsQuery.data?.[normalizeDisciplineKey(key)] ?? 0;
        return sum + Math.max(direct, normalized);
      }, 0);

      seenSlugs.add(slug);
      fallbackCards.push({
        id: `fallback-${slug}`,
        slug: slug,
        name: getSubjectNameForSlug(slug, i18n.language),
        levelLabel,
        masteryPercent: 0,
        masteredTopics: 0,
        totalTopics: 0,
        examPapers: counts.papers,
        exercises: trainingItems,
        sourceExercises: counts.exercises,
        practiceReady: true,
        displayContext: 'practice' as const,
      });
    }

    return [...mappedFromCurriculum, ...fallbackCards];
  }, [subjectsQuery.data, activeSchoolLevel.activeLevel, papersByDiscipline, trainingCountsQuery.data, i18n.language]);

  const subjectsByKey = useMemo(() => {
    const map = new Map<string, (typeof subjectCards)[number]>();
    for (const subject of subjectCards) {
      map.set(normalizeSubjectKey(subject.slug), subject);
      map.set(normalizeSubjectKey(subject.name), subject);
    }
    return map;
  }, [subjectCards]);

  const practiceSubjects = useMemo(() => {
    const adminSubjectsBySlug = new Map<string, Subject>();
    const adminSubjectsByAlias = new Map<string, Subject>();

    for (const subject of practiceButtonsQuery.data ?? []) {
      const normalizedSlug = normalizeSubjectKey(subject.slug);
      adminSubjectsBySlug.set(normalizedSlug, subject);
      for (const alias of getSubjectSlugAliases(subject.slug)) {
        const normalizedAlias = normalizeSubjectKey(alias);
        if (!adminSubjectsByAlias.has(normalizedAlias)) {
          adminSubjectsByAlias.set(normalizedAlias, subject);
        }
      }
    }

    return defaultPracticeSubjects.flatMap((fallback) => {
      const normalizedSlug = normalizeSubjectKey(fallback.slug);
      const adminSubject = adminSubjectsBySlug.get(normalizedSlug) || adminSubjectsByAlias.get(normalizedSlug);

      const sourceSubject = [normalizedSlug, ...getSubjectSlugAliases(fallback.slug).map(normalizeSubjectKey)]
        .map((key) => subjectsByKey.get(key))
        .find(Boolean);

      return [{
        ...fallback,
        id: adminSubject?.id ?? fallback.slug,
        slug: adminSubject?.slug ?? fallback.slug,
        name: getSubjectNameForSlug(fallback.slug, i18n.language, adminSubject?.name ?? fallback.name),
        icon_name: adminSubject?.icon_name ?? fallback.icon_name,
        icon_image_url: adminSubject?.icon_image_url ?? null,
        color_scheme: adminSubject?.color_scheme ?? null,
        icon_color: adminSubject?.icon_color ?? null,
        practice_text_color: adminSubject?.practice_text_color ?? adminSubject?.text_color ?? null,
        practice_font_size: adminSubject?.practice_font_size ?? adminSubject?.font_size ?? null,
        practice_font_family: adminSubject?.practice_font_family ?? adminSubject?.font_family ?? null,
      }];
    });
  }, [practiceButtonsQuery.data, subjectsByKey, i18n.language]);

  return (
    <div className="min-h-screen bg-[#F7FAFE] pb-28">
      <PageMeta title={t('practice.title')} description={t('practice.metaDescription')} />
      <div className="mx-auto w-full max-w-[430px] space-y-4 px-5 pb-6 pt-3 sm:max-w-[520px]">
        <section className="relative min-h-[150px] overflow-hidden">
          <div className="relative z-10 max-w-[62%] space-y-2 pt-8">
            <h1 className="text-[32px] font-extrabold leading-none tracking-normal text-[#050B34]">
              {t('practice.title')}
            </h1>
            <p className="text-[18px] font-semibold leading-snug tracking-normal text-[#667085]">
              {t('practice.chooseSubject')} 🚀
            </p>
          </div>
          <span className="absolute right-28 top-[60px] h-3 w-3 rounded-full bg-[#F9D66B]" />
          <span className="absolute right-24 top-[104px] h-3 w-3 rounded-full bg-[#C7B7FF]" />
          <span className="absolute right-32 top-[134px] h-3 w-3 rounded-full bg-[#A8E6D8]" />
          <img
            src={MASCOT_SRC}
            alt=""
            onError={(event) => {
              event.currentTarget.src = FALLBACK_MASCOT_SRC;
            }}
            className="pointer-events-none absolute -right-14 top-0 h-48 w-48 object-contain object-left sm:-right-8 sm:h-52 sm:w-52"
          />
        </section>

        <section className="rounded-[28px] border border-[#BCEFE3] bg-[#E8F8F3] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#087F68]">Maths</p>
              <h2 className="mt-1 text-xl font-extrabold text-[#050B34]">Demi-droite graduée</h2>
              <p className="mt-1 text-sm font-medium text-[#436B65]">Lis, place et range des fractions et des décimaux.</p>
            </div>
            <ArrowRight className="mt-1 h-6 w-6 shrink-0 text-[#087F68]" aria-hidden="true" />
          </div>
          <button type="button" onClick={() => navigate('/practice/number-line')} className="mt-4 min-h-11 w-full rounded-xl bg-[#12C6A0] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0EAD8B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] focus-visible:ring-offset-2">Commencer</button>
        </section>

        <section className="rounded-[24px] border border-[#D9DDF8] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#5145B5]">Maths · nombres</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#050B34]">Count objects</h2>
          <p className="mt-1 text-sm text-[#667085]">Practise counting different objects in groups of ten and ones.</p>
          <button type="button" onClick={() => navigate('/practice/add-up-to-100')} className="mt-4 min-h-11 w-full rounded-xl bg-[#5145B5] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Start counting</button>
        </section>

        <section className="rounded-[24px] border border-[#CBE7DE] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#087F68]">Maths · Calcul mental</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#050B34]">Calculation race</h2>
          <p className="mt-1 text-sm text-[#667085]">Practise addition, subtraction, multiplication, and division. Review missed calculations after the race.</p>
          <button type="button" onClick={() => navigate('/practice/mental-calculation-race')} className="mt-4 min-h-11 w-full rounded-xl bg-[#087F68] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#066B58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] focus-visible:ring-offset-2">Start calculation race</button>
        </section>

        <section className="rounded-[24px] border border-[#CBE7DE] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#087F68]">Maths · quick practice</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#050B34]">Number flashcards</h2>
          <p className="mt-1 text-sm text-[#667085]">Practise one small addition or subtraction at a time.</p>
          <button type="button" onClick={() => navigate('/practice/flashcards/numbers')} className="mt-4 min-h-11 w-full rounded-xl bg-[#087F68] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#066B58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087F68] focus-visible:ring-offset-2">Start flashcards</button>
        </section>

        <section className="rounded-[24px] border border-[#D9DDF8] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#5145B5]">Maths · Numbers and calculation</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#050B34]">Subtract with objects</h2>
          <p className="mt-1 text-sm text-[#667085]">Add scattered objects, take some away, identify the subtraction, and count what remains.</p>
          <button type="button" onClick={() => navigate('/practice/subtraction-within-ten')} className="mt-4 min-h-11 w-full rounded-xl bg-[#5145B5] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Start subtraction practice</button>
        </section>

        <section className="rounded-[24px] border border-[#D9DDF8] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#5145B5]">Maths · tens and ones</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#050B34]">Numbers after ten</h2>
          <p className="mt-1 text-sm text-[#667085]">Build a number with one group of ten and extra single objects.</p>
          <button type="button" onClick={() => navigate('/practice/numbers-after-ten')} className="mt-4 min-h-11 w-full rounded-xl bg-[#5145B5] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#40369B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5145B5] focus-visible:ring-offset-2">Start numbers lesson</button>
        </section>

        <section>
          {(subjectsQuery.isLoading || practiceButtonsQuery.isLoading || activeSchoolLevel.isLoading || papersQuery.isLoading || trainingCountsQuery.isLoading) ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-[178px] rounded-[28px] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="mt-8 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {practiceSubjects.map((subject) => {
                const colors = getSubjectVisuals(subject.slug, subject.color_scheme);
                const sourceSubject = subjectsByKey.get(normalizeSubjectKey(subject.slug));
                const exerciseCount = sourceSubject?.exercises ?? 0;
                const exerciseLabel = t('practice.subjects.exerciseCount', { count: exerciseCount });
                const Icon = subject.icon;
                const subjectTitleFontSize = Math.min(Math.max((subject.practice_font_size ?? 18) + 1, 16), 19);
                const subjectTitleFontFamily = subject.practice_font_family ?? 'Poppins, sans-serif';
                const displaySubjectName = subject.slug === 'mathematiques'
                  ? 'Maths'
                  : subject.slug === 'anglais'
                    ? 'Autres'
                    : subjectLabel(subject.name);

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => navigate(`/practice/${subject.slug}`)}
                    aria-label={displaySubjectName}
                    className="relative flex h-[178px] flex-col items-center justify-between rounded-[28px] p-4 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ backgroundColor: colors.bg, ['--tw-ring-color' as string]: colors.icon }}
                  >
                    <div className="flex w-full justify-center">
                      <span
                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/65 p-3"
                        style={{ color: colors.icon }}
                      >
                        {subject.icon_image_url ? (
                          <img
                            src={subject.icon_image_url}
                            alt=""
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          Icon ? (
                            <Icon className="h-10 w-10 stroke-[2.6]" aria-hidden="true" />
                          ) : (
                            <DynamicIcon name={subject.icon_name} className="h-10 w-10 stroke-[2.6]" />
                          )
                        )}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h2
                        className="font-extrabold leading-tight tracking-normal text-[#162033]"
                        style={{ fontSize: `${subjectTitleFontSize}px`, fontFamily: subjectTitleFontFamily }}
                      >
                        {displaySubjectName}
                      </h2>
                      <p className="text-base font-semibold leading-snug text-[#667085]">
                        {exerciseLabel}
                      </p>
                    </div>
                    <span className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#162033] shadow-[0_8px_20px_rgba(15,23,42,0.09)]">
                      <ArrowRight className="h-5 w-5 stroke-[3]" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
