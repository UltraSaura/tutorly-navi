import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { useUserCurriculumProfile } from '@/hooks/useUserCurriculumProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';
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
  const { data: subjects, isLoading } = useLearningSubjects();

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

  // Check if user has curriculum profile
  if (!profile?.countryCode || !profile?.levelCode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('learning.setupRequired')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {t('learning.setupMessage')}
            </p>
            <Button onClick={() => navigate('/profile')}>
              {t('learning.goToProfile')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if no subjects available
  if (!subjects || subjects.length === 0) {
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
          
        </div>
        
      </header>

      {/* Subject List */}
      <main className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {subjects?.map(({
        subject,
        videos_ready
      }) => {
        const isReady = videos_ready > 0;
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
                    <DynamicIcon name={subject.icon_name} className="h-[5.5rem] w-[5.5rem] text-slate-800 sm:h-[6.6rem] sm:w-[6.6rem]" />
                  )}
                </div>

                <div className="w-full rounded-xl bg-white/80 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
                  <span className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900 sm:text-base">
                    {subject.name}
                  </span>
                </div>
              </div>
            </div>;
      })}
      </main>
    </div>;
};
export default LearningPage;
