import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  MapPinned,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/components/seo/PageMeta';
import { Skeleton } from '@/components/ui/skeleton';
import { useExamPapers, useTrainingItemSubjectCounts } from '@/hooks/useExamImport';
import { useLearningSubjects, usePracticeSubjectButtons } from '@/hooks/useLearningSubjects';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { normalizeDisciplineKey, resolveExamDisciplinesForSubjectSlug, resolveSubjectSlugForExamDiscipline, getSubjectNameForSlug } from '@/utils/examSubjectMapping';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';

const NO_ACTIVE_LEVEL = '__no_active_level__';
const MASCOT_SRC = '/practice-mascot.png';
const FALLBACK_MASCOT_SRC = '/fox-mascot.png';

const subjectColors = {
  mathematiques: {
    bg: "#E8F8F3",
    icon: "#12C6A0",
    iconBg: "#DDF8F0",
  },
  histoire: {
    bg: "#F0EDFF",
    icon: "#F5A623",
    iconBg: "#FFF1D6",
  },
  sciences: {
    bg: "#EAF5FF",
    icon: "#2F9BFF",
    iconBg: "#E2F1FF",
  },
  geographie: {
    bg: "#ECFBEA",
    icon: "#5EC84D",
    iconBg: "#E6F8DE",
  },
  francais: {
    bg: "#F2EDFF",
    icon: "#8B5CF6",
    iconBg: "#EEE6FF",
  },
  anglais: {
    bg: "#FFF0F5",
    icon: "#F55783",
    iconBg: "#FFE4EE",
  },
  default: {
    bg: "#F3F6FA",
    icon: "#667085",
    iconBg: "#E8ECF2",
  },
};

const normalizeSubjectKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const getSubjectVisuals = (slug: string, colorScheme?: string | null) => {
  const key = normalizeSubjectKey(slug) as keyof typeof subjectColors;
  const mapped = subjectColors[key] ?? subjectColors.default;

  return {
    ...mapped,
    iconBg: colorScheme && !colorScheme.startsWith('bg-') ? colorScheme : mapped.iconBg,
  };
};

const defaultPracticeSubjects = [
  { slug: 'mathematiques', name: 'Maths', icon_name: 'calculator', icon: Calculator },
  { slug: 'francais', name: 'Français', icon_name: 'languages', icon: Languages },
  { slug: 'sciences', name: 'Sciences', icon_name: 'flask-conical', icon: FlaskConical },
  { slug: 'histoire', name: 'Histoire', icon_name: 'landmark', icon: Landmark },
  { slug: 'geographie', name: 'Géographie', icon_name: 'map-pinned', icon: MapPinned },
  { slug: 'anglais', name: 'Anglais', icon_name: 'globe-2', icon: Globe2 },
] as const;

export default function PracticePage() {
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
        name: row.subject.name,
        levelLabel,
        masteryPercent: 0,
        masteredTopics: 0,
        totalTopics: 0,
        examPapers: counts.papers,
        exercises: trainingItems,
        sourceExercises: counts.exercises,
      };
      return [card];
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
      });
    }

    return [...mappedFromCurriculum, ...fallbackCards];
  }, [subjectsQuery.data, activeSchoolLevel.activeLevel, papersByDiscipline, trainingCountsQuery.data]);

  const subjectsByKey = useMemo(() => {
    const map = new Map<string, (typeof subjectCards)[number]>();
    for (const subject of subjectCards) {
      map.set(normalizeSubjectKey(subject.slug), subject);
      map.set(normalizeSubjectKey(subject.name), subject);
    }
    return map;
  }, [subjectCards]);

  const practiceSubjects = useMemo(() => {
    const adminSubjectsBySlug = new Map(
      (practiceButtonsQuery.data ?? []).map((subject) => [normalizeSubjectKey(subject.slug), subject])
    );

    return defaultPracticeSubjects.map((fallback) => ({
      ...fallback,
      id: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.id ?? fallback.slug,
      slug: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.slug ?? fallback.slug,
      name: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.name ?? fallback.name,
      icon_name: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.icon_name ?? fallback.icon_name,
      icon_image_url: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.icon_image_url ?? null,
      color_scheme: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.color_scheme ?? null,
      icon_color: adminSubjectsBySlug.get(normalizeSubjectKey(fallback.slug))?.icon_color ?? null,
    }));
  }, [practiceButtonsQuery.data]);

  return (
    <div className="min-h-screen bg-[#F7FAFE] pb-28">
      <PageMeta title={t('practice.title')} description={t('practice.metaDescription')} />
      <div className="mx-auto w-full max-w-[430px] space-y-4 px-5 pb-6 pt-3 sm:max-w-[520px]">
        <section className="relative min-h-[150px] overflow-hidden">
          <div className="relative z-10 max-w-[62%] space-y-2 pt-8">
            <h1 className="text-[32px] font-extrabold leading-none tracking-normal text-[#050B34]">
              S&apos;exercer
            </h1>
            <p className="text-[18px] font-semibold leading-snug tracking-normal text-[#667085]">
              Choisis une matière pour t&apos;entraîner 🚀
            </p>
          </div>
          <span className="absolute right-28 top-[60px] h-3 w-3 rounded-full bg-[#F9D66B]" />
          <span className="absolute right-24 top-[104px] h-3 w-3 rounded-full bg-[#C7B7FF]" />
          <span className="absolute right-32 top-[134px] h-3 w-3 rounded-full bg-[#A8E6D8]" />
          <img
            src={MASCOT_SRC}
            alt="Mascotte"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_MASCOT_SRC;
            }}
            className="pointer-events-none absolute -right-14 top-0 h-48 w-48 object-contain object-left sm:-right-8 sm:h-52 sm:w-52"
          />
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
            <div className="grid grid-cols-2 gap-4">
              {practiceSubjects.map((subject) => {
                const colors = getSubjectVisuals(subject.slug, subject.color_scheme);
                const sourceSubject = subjectsByKey.get(normalizeSubjectKey(subject.slug));
                const exerciseCount = sourceSubject?.exercises ?? 0;
                const exerciseLabel = `${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}`;
                const Icon = subject.icon;

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => navigate(`/practice/${subject.slug}`)}
                    className="relative flex h-[178px] flex-col justify-between rounded-[28px] bg-white p-5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12C6A0] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start">
                      <span
                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full p-3"
                        style={{ backgroundColor: colors.iconBg, color: subject.icon_color ?? colors.icon }}
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
                      <h2 className="text-[22px] font-extrabold leading-tight tracking-normal text-[#050B34]">
                        {subject.name}
                      </h2>
                      <p className="text-base font-semibold leading-snug text-[#667085]">
                        {exerciseLabel}
                      </p>
                    </div>
                    <span className="absolute bottom-6 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#050B34] shadow-[0_8px_20px_rgba(15,23,42,0.09)]">
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
