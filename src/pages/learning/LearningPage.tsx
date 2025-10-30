import { useNavigate } from 'react-router-dom';
import { useLearningSubjects } from '@/hooks/useLearningSubjects';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';

const LearningPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: subjects, isLoading } = useLearningSubjects();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
        <h1 className="text-3xl font-bold">{t('learning.chooseSubject') || 'Choose Your Subject'}</h1>
      </div>

      <div className="grid gap-4">
        {subjects?.map(({ subject, videos_ready, videos_completed, progress_percentage }) => (
          <Card
            key={subject.id}
            className="relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg border-2"
            style={{
              background: `linear-gradient(135deg, ${subject.color_scheme}20, ${subject.color_scheme}10)`,
              borderColor: `${subject.color_scheme}40`,
            }}
            onClick={() => navigate(`/learning/${subject.slug}`)}
          >
            <div className="p-6 flex items-center gap-6">
              <div className="text-6xl flex-shrink-0">{subject.icon_name}</div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">{subject.name}</h2>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {videos_ready}
                    </div>
                    <span>{t('learning.ready') || 'ready'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300">
                      {videos_completed}
                    </div>
                    <span>{t('learning.completed') || 'completed'}</span>
                  </div>
                </div>

                {progress_percentage > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progress_percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LearningPage;
