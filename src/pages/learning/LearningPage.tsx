import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import { useActiveSchoolLevel } from '@/hooks/useActiveSchoolLevel';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
import { CompactStreakChip } from '@/components/game';
import { useStudentStats } from '@/hooks/useStudentStats';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { toast } from 'sonner';
import { PageMeta } from '@/components/seo/PageMeta';

const getSubjectTileBackground = (colorScheme?: string | null) => {
  if (!colorScheme || colorScheme.startsWith('bg-')) {
    return '#dbeafe';
  }

  return colorScheme;
};

const LearningPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      <PageMeta title="Learning Library" description="Browse subjects, topics, and video lessons in your Stuwy learning library." />
      {/* Header */}
      <header className="pt-6 pr-6 pb-4 pl-[20px] bg-[#253c7b] shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="font-extrabold text-white text-xl">
            {t('learning.chooseSubject') || 'Choose Your Subject'}
          </h1>
          <CompactStreakChip
            days={stats?.currentStreak ?? 0}
            active={Boolean(stats && (stats.activeToday || stats.streakAtRisk))}
            className="bg-white/15 text-white"
          />
        </div>
        
      </header>

      {/* Subject List */}
      <main className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {subjects?.map(({
        subject,
        videos_ready,
        lessons_completed
      }) => {
        const isReady = videos_ready > 0;
        const subjectTitleFontSize = Math.max(subject.font_size ?? 18, 12);
        const subjectTitleFontFamily = subject.font_family ?? 'Poppins, sans-serif';
        return <div 
          key={subject.id} 
          onClick={() => {
            if (isReady) {
              navigate(`/learning/${subject.slug}`);
            } else {
              toast.info(`${subject.name} is coming soon!`, {
                description: "We're working hard to bring you this content."
              });
            }
          }} 
          className={`
            aspect-square rounded-2xl border border-white/70 px-4 py-4
            shadow-sm cursor-pointer
            transition-transform transform
            hover:scale-[1.01] active:scale-[0.99]
            ${!isReady ? 'opacity-60 cursor-not-allowed' : ''}
          `}
          style={{ backgroundColor: getSubjectTileBackground(subject.color_scheme) }}
        >
              <div className="flex h-full flex-col items-center justify-center gap-2 pb-3">
                <div className="flex min-h-0 items-center justify-center">
                  {subject.icon_image_url ? (
                    <img
                      src={subject.icon_image_url}
                      alt=""
                      className="max-h-28 max-w-full object-contain sm:max-h-32"
                      loading="lazy"
                    />
                  ) : (
                    <DynamicIcon name={subject.icon_name} className="h-[5.5rem] w-[5.5rem] sm:h-[6.6rem] sm:w-[6.6rem]" style={{ color: subject.icon_color ?? '#1e3a5f' }} />
                  )}
                </div>

                <div className="w-full rounded-xl bg-white/80 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
                  <span
                    className="line-clamp-2 font-semibold leading-tight"
                    style={{ color: subject.text_color ?? '#050B34', fontSize: `${subjectTitleFontSize}px`, fontFamily: subjectTitleFontFamily }}
                  >
                    {subject.name}
                  </span>
                  {videos_ready > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ height: 3, background: 'rgba(15,23,42,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: '#12C6A0',
                          borderRadius: 999,
                          width: `${Math.round((lessons_completed / Math.max(videos_ready, 1)) * 100)}%`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <p style={{ fontSize: 9, color: 'rgba(15,23,42,0.5)', margin: '2px 0 0', fontFamily: 'Poppins, sans-serif' }}>
                        {lessons_completed}/{videos_ready} lecons
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>;
      })}
      </main>
    </div>;
};
export default LearningPage;
