import { useStudentCurriculum } from '@/hooks/useStudentCurriculum';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ChevronRight, Check, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { CurriculumErrorState } from '@/components/learning/CurriculumErrorState';
import { useAuth } from '@/context/AuthContext';

const LearningRoadmap = () => {
  const { subjects, isLoading, error } = useStudentCurriculum();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Fetch user progress for all topics
  const { data: progressData } = useQuery({
    queryKey: ['user-topic-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Map();

      const { data } = await supabase
        .from('user_learning_progress')
        .select('video_id, topic_id, progress_type')
        .eq('user_id', user.id);

      // Calculate progress per topic
      const topicProgress = new Map();
      data?.forEach(progress => {
        if (!progress.topic_id) return;

        if (!topicProgress.has(progress.topic_id)) {
          topicProgress.set(progress.topic_id, {
            total: 0,
            completed: 0,
          });
        }

        const tp = topicProgress.get(progress.topic_id);
        if (progress.progress_type === 'video_completed') {
          tp.completed++;
        }
        tp.total++;
      });

      return topicProgress;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <CurriculumErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          {t('learning.noContentMessage')}
        </p>
      </div>
    );
  }

  const getTopicStatus = (topicId: string): 'completed' | 'in-progress' | 'upcoming' => {
    if (!progressData) return 'upcoming';
    const progress = progressData.get(topicId);
    if (!progress) return 'upcoming';
    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    if (percentage === 100) return 'completed';
    if (percentage > 0) return 'in-progress';
    return 'upcoming';
  };

  const getTopicProgress = (topicId: string): number => {
    if (!progressData) return 0;
    const progress = progressData.get(topicId);
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.completed / progress.total) * 100);
  };

  const getStatusIcon = (status: 'completed' | 'in-progress' | 'upcoming') => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <div className="container max-w-5xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl">{t('nav.roadmap')}</CardTitle>
            <p className="text-muted-foreground mt-2">
              Track your learning journey through your curriculum
            </p>
          </CardHeader>
        </Card>

        {/* Subject Cards */}
        {subjects.map((subject, subjectIndex) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: subjectIndex * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{subject.subjectLabel}</CardTitle>
                  <Badge variant="secondary">{subject.totalTopics} topics</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Domains */}
                {subject.domains.map(domain => (
                  <div key={domain.domainId} className="space-y-3">
                    <h3 className="font-semibold text-lg text-primary/80">
                      {domain.domainLabel}
                    </h3>
                    {/* Subdomains */}
                    {domain.subdomains.map(subdomain => (
                      <div key={subdomain.subdomainId} className="space-y-2 ml-4">
                        <h4 className="font-medium text-foreground/70">
                          {subdomain.subdomainLabel}
                        </h4>
                        {/* Topics */}
                        <div className="space-y-2">
                          {subdomain.topics.map(topic => {
                            const status = getTopicStatus(topic.id);
                            const progress = getTopicProgress(topic.id);
                            return (
                              <motion.div
                                key={topic.id}
                                whileHover={{ scale: 1.01 }}
                                className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 mt-1">
                                    {getStatusIcon(status)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h4 className="font-semibold text-foreground">
                                          {topic.topicLabel}
                                        </h4>
                                        {topic.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {topic.description}
                                          </p>
                                        )}
                                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                          <span>{topic.videoCount} videos</span>
                                          <span>{topic.quizCount} quizzes</span>
                                          <span>~{topic.estimatedDurationMinutes} min</span>
                                        </div>
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    {status !== 'upcoming' && (
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                          <span className="text-muted-foreground">Progress</span>
                                          <span className="font-medium">{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default LearningRoadmap;
