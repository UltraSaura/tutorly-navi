import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Zap } from 'lucide-react';
import { useSubjectDashboard } from '@/hooks/useSubjectDashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { CurriculumLocation } from '@/components/admin/curriculum/CurriculumLocation';
import * as Icons from 'lucide-react';
const SubjectDashboardPage = () => {
  const {
    subjectSlug
  } = useParams<{
    subjectSlug: string;
  }>();
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const {
    data,
    isLoading
  } = useSubjectDashboard(subjectSlug || '');
  if (isLoading) {
    return <div className="container mx-auto p-4 space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>;
  }
  if (!data?.subject) {
    return <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">{t('learning.subjectNotFound') || 'Subject not found'}</p>
      </div>;
  }
  const {
    subject,
    categories,
    overallProgress
  } = data;
  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="w-6 h-6" /> : null;
  };
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div 
        className="flex items-center gap-4 px-4 py-3 border-b"
        style={{ backgroundColor: subject.color_scheme }}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/learning')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1 text-white">{subject.name}</h1>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="pb-24">
          {/* Topics List */}
          <div className="py-4">
            <h2 className="text-xl font-bold text-foreground mx-4 mt-2 mb-3">
              {t('learning.learningTopics') || 'Learning Topics'}
            </h2>

            <div className="space-y-3 px-4">
              {categories.map(category => 
                category.topics?.map(topic => {
                  const Icon = (Icons as any)[category.icon_name] || Play;
                  const progressColor = topic.progress_percentage === 100 
                    ? 'bg-green-500' 
                    : topic.progress_percentage && topic.progress_percentage > 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500';

                  return (
                    <Card
                      key={topic.id}
                      className="p-4 cursor-pointer transition-all hover:shadow-lg border-2"
                      style={{ borderColor: `${subject.color_scheme}40` }}
                      onClick={() => navigate(`/learning/${subjectSlug}/${topic.slug}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${subject.color_scheme}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: subject.color_scheme }} />
                          </div>
                          <h3 className="text-lg font-bold text-foreground">{topic.name}</h3>
                        </div>
                        
                        <div className="flex items-center text-sm font-semibold text-muted-foreground ml-2">
                          <Zap className="w-4 h-4 mr-1" style={{ color: subject.color_scheme }} />
                          {topic.video_count} {t('learning.videos') || 'videos'}
                        </div>
                      </div>

                      {/* Curriculum Location */}
                      {topic.curriculum_country_code && (
                        <div className="mb-2">
                          <CurriculumLocation
                            countryId={topic.curriculum_country_code}
                            levelId={topic.curriculum_level_code}
                            subjectId={topic.curriculum_subject_id}
                            domainId={topic.curriculum_domain_id}
                            subdomainId={topic.curriculum_subdomain_id}
                            variant="compact"
                            locale="en"
                          />
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${progressColor} transition-all`}
                          style={{ width: `${topic.progress_percentage || 0}%` }}
                        />
                      </div>
                      <div className="text-right text-sm font-medium mt-1 text-muted-foreground">
                        {topic.progress_percentage || 0}% {t('learning.complete') || 'Complete'}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
export default SubjectDashboardPage;