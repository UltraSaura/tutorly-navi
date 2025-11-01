import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import * as Icons from 'lucide-react';

const SubjectDashboardPage = () => {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading } = useSubjectDashboard(subjectSlug || '');

  if (isLoading) {
    return (
      <div className="container mx-0 p-4 space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.subject) {
    return (
      <div className="container mx-0 p-4 text-center">
        <p className="text-muted-foreground">{t('learning.subjectNotFound') || 'Subject not found'}</p>
      </div>
    );
  }

  const { subject, categories, overallProgress } = data;

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="w-6 h-6" /> : null;
  };

  return (
    <div className="container mx-0 p-4 space-y-6 max-w-6xl pb-24">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/learning')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{subject.name}</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Search className="w-5 h-5" />
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('learning.overallProgress') || 'Overall Progress'}</h3>
        <Progress value={overallProgress.percentage} className="h-3 mb-3" />
        <p className="text-sm text-muted-foreground">
          {overallProgress.completedTopics}/{overallProgress.totalTopics} {t('learning.topicsMastered') || 'Topics Mastered'}
        </p>
      </Card>

      <div className="space-y-8">
        {categories.map(category => (
          <div key={category.id}>
            <div 
              className="mb-4 pb-2 border-l-4 pl-4"
              style={{ borderColor: subject.color_scheme }}
            >
              <h2 className="text-xl font-semibold">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.topics?.map(topic => (
                <Card
                  key={topic.id}
                  className="p-5 cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden"
                  style={{ borderColor: `${subject.color_scheme}40` }}
                  onClick={() => navigate(`/learning/${subjectSlug}/${topic.slug}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${subject.color_scheme}20` }}
                    >
                      {getIconComponent(category.icon_name)}
                    </div>
                    
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke={subject.color_scheme}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 * (1 - (topic.progress_percentage || 0) / 100)}`}
                          className="transition-all"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                        {topic.progress_percentage || 0}%
                      </span>
                    </div>
                  </div>

                  <h3 className="font-semibold mb-2 line-clamp-2">{topic.name}</h3>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{topic.video_count} {t('learning.videos') || 'Videos'}</span>
                    <span>•</span>
                    <span>{topic.quiz_count} {t('learning.quizzes') || 'Quizzes'}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectDashboardPage;
