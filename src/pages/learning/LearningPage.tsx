import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { getSubjectNameForSlug } from '@/utils/examSubjectMapping';
import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { SubjectPastelCard } from '@/components/learning/SubjectPastelCard';
import { CompactStreakChip } from '@/components/game';
import { useStudentStats } from '@/hooks/useStudentStats';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { PageMeta } from '@/components/seo/PageMeta';

const LearningPage = () => {
  const ui = useInterfaceTranslation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile } = useUserCurriculumProfile();
  const activeSchoolLevel = useActiveSchoolLevel();
  const { data: subjects, isLoading, isError } = useLearningSubjects();
  const { data: stats } = useStudentStats();

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
        <div className="p-6 pb-4 bg-white dark:bg-card shadow-md">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="py-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 mx-6 my-2 rounded-xl" />)}
        </div>
      </div>;
  }

  // Check if user has curriculum profile — show onboarding wizard instead of dead-end card
  if ((!profile?.countryCode || !profile?.levelCode) && !activeSchoolLevel.isPreviewing) {
    return <OnboardingWizard />;
  }

  // Check if no subjects available
  if (isError || !subjects || subjects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('learning.noContent')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('learning.noContentMessage')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="min-h-screen bg-gray-50 dark:bg-background pb-20 mx-[5px]">
      <PageMeta title={t('learning.libraryTitle')} description={t('learning.libraryDescription')} />
      {/* Header */}
      <header className="pt-6 pr-6 pb-4 pl-[20px] bg-[#253c7b] shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="font-extrabold text-white text-xl">
            {t('learning.chooseSubject') || ui("Choose Your Subject")}
          </h1>
          <CompactStreakChip
            days={stats?.currentStreak ?? 0}
            active={Boolean(stats && (stats.activeToday || stats.streakAtRisk))}
            className="bg-white/15 text-white"
          />
        </div>
        
      </header>

      {/* Subject List */}
      <main className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4">
        {subjects?.filter(({ subject, lessons_ready }) =>
          lessons_ready > 0 && (subject.display_context === 'learn' || subject.display_context === 'both')
        ).map(({
        subject,
        videos_ready,
        lessons_ready,
        lessons_completed
      }) => {
        const subjectName = getSubjectNameForSlug(subject.slug, language, subject.name);
        const subjectTitleFontSize = Math.max(subject.lesson_font_size ?? subject.font_size ?? 18, 12);
        const subjectTitleFontFamily = subject.lesson_font_family ?? subject.font_family ?? 'Poppins, sans-serif';
        return <SubjectPastelCard
          key={subject.id}
          slug={subject.slug}
          title={subjectName}
          iconName={subject.icon_name}
          iconImageUrl={subject.icon_image_url}
          colorScheme={subject.color_scheme}
          textColor={subject.lesson_text_color ?? subject.text_color}
          titleFontSize={subjectTitleFontSize}
          titleFontFamily={subjectTitleFontFamily}
          progress={videos_ready > 0 ? { completed: lessons_completed, total: videos_ready } : undefined}
          meta={videos_ready > 0 ? <p className="text-[10px] font-semibold text-slate-900/50">{lessons_completed}/{videos_ready} {t('learning.lessons')}</p> : undefined}
          onClick={() => navigate(`/learning/${subject.slug}`)}
        />;
      })}
      </main>
    </div>;
};
export default LearningPage;
