import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { SubjectMasteryCard } from './SubjectMasteryCard';
import LearningRoadmap from './LearningRoadmap';
import GradeDashboard from './GradeDashboard';
import SkillMastery from './SkillMastery';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const UnifiedDashboard = () => {
  const { t } = useLanguage();

  // Calculate overall progress across all subjects
  const { data: overallProgress } = useQuery({
    queryKey: ['overall-subject-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { percentage: 0, completedTopics: 0, totalTopics: 0 };

      // Get all subjects
      const { data: subjects } = await supabase
        .from('learning_subjects')
        .select('id')
        .eq('is_active', true);

      if (!subjects || subjects.length === 0) {
        return { percentage: 0, completedTopics: 0, totalTopics: 0 };
      }

      // Get all topics for all subjects
      const { data: categories } = await supabase
        .from('learning_categories')
        .select(`
          topics:learning_topics(id)
        `)
        .in('subject_id', subjects.map(s => s.id))
        .eq('is_active', true);

      const allTopics = categories?.flatMap(c => c.topics || []) || [];
      const topicIds = allTopics.map(t => t.id);

      if (topicIds.length === 0) {
        return { percentage: 0, completedTopics: 0, totalTopics: 0 };
      }

      // Get videos for all topics
      const { data: videos } = await supabase
        .from('learning_videos')
        .select('id, topic_id')
        .in('topic_id', topicIds)
        .eq('is_active', true);

      const videoIds = videos?.map(v => v.id) || [];

      if (videoIds.length === 0) {
        return { percentage: 0, completedTopics: 0, totalTopics: allTopics.length };
      }

      // Check completed videos
      const { count: completedCount } = await supabase
        .from('user_learning_progress')
        .select('video_id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('progress_type', 'video_completed')
        .in('video_id', videoIds);

      // Calculate completed topics (topics where all videos are completed)
      const topicsByVideoCount = new Map();
      videos?.forEach(v => {
        const current = topicsByVideoCount.get(v.topic_id) || 0;
        topicsByVideoCount.set(v.topic_id, current + 1);
      });

      let completedTopics = 0;
      for (const topicId of topicIds) {
        const topicVideoCount = topicsByVideoCount.get(topicId) || 0;
        if (topicVideoCount === 0) continue;

        const { count: topicCompletedCount } = await supabase
          .from('user_learning_progress')
          .select('video_id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('progress_type', 'video_completed')
          .in('video_id', videos?.filter(v => v.topic_id === topicId).map(v => v.id) || []);

        if ((topicCompletedCount || 0) >= topicVideoCount) {
          completedTopics++;
        }
      }

      const percentage = allTopics.length > 0 
        ? Math.round((completedTopics / allTopics.length) * 100)
        : 0;

      return {
        percentage,
        completedTopics,
        totalTopics: allTopics.length,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      {/* Subject Mastery Card */}
      {overallProgress && (
        <SubjectMasteryCard
          percentage={overallProgress.percentage}
          completedTopics={overallProgress.completedTopics}
          totalTopics={overallProgress.totalTopics}
        />
      )}

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roadmap">{t('dashboard.roadmap')}</TabsTrigger>
          <TabsTrigger value="grades">{t('dashboard.grades')}</TabsTrigger>
          <TabsTrigger value="skills">{t('dashboard.skills')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roadmap" className="mt-6">
          <LearningRoadmap />
        </TabsContent>
        
        <TabsContent value="grades" className="mt-6">
          <GradeDashboard />
        </TabsContent>
        
        <TabsContent value="skills" className="mt-6">
          <SkillMastery />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedDashboard;