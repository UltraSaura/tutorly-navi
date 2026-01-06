import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { useAllBanks } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { CurriculumLocation } from '@/components/admin/curriculum/CurriculumLocation';
import { QuizOverlayController } from '@/components/learning/QuizOverlayController';
import { TopicTabsLayout } from '@/components/learning/TopicTabsLayout';
import { TopicLearnTab } from '@/components/learning/TopicLearnTab';
import { TopicTranscriptTab } from '@/components/learning/TopicTranscriptTab';
import { TopicLessonTab } from '@/components/learning/TopicLessonTab';
import type { LessonContent } from '@/types/learning';

const CoursePlaylistPage = () => {
  const { subjectSlug, topicSlug } = useParams<{ subjectSlug: string; topicSlug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data, isLoading } = useCoursePlaylist(topicSlug || '');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Auto-select featured video when data loads
  useEffect(() => {
    if (data?.featuredVideo && !playingVideoId) {
      setPlayingVideoId(data.featuredVideo.id);
    }
  }, [data?.featuredVideo, playingVideoId]);

  // Fetch completed video IDs for the current user
  const { data: completedVideoIds = [] } = useQuery({
    queryKey: ['completed-videos', data?.topic?.id, user?.id],
    queryFn: async () => {
      if (!user || !data?.topic?.id) return [];
      const { data: rows, error } = await supabase
        .from('user_learning_progress')
        .select('video_id')
        .eq('user_id', user.id)
        .eq('progress_type', 'video_completed')
        .not('video_id', 'is', null);
      if (error) throw error;
      return (rows || []).map(r => r.video_id).filter(Boolean) as string[];
    },
    enabled: !!user && !!data?.topic?.id,
    staleTime: 120000,
  });

  // Fetch all quiz banks
  const { data: allBanks } = useAllBanks(
    data?.topic?.id || '',
    playingVideoId || '',
    completedVideoIds,
    user?.id || ''
  );

  // Handle video end - auto-play next
  const handleVideoEnd = useCallback(() => {
    if (!data?.videos) return;
    const currentIndex = data.videos.findIndex(v => v.id === playingVideoId);
    if (currentIndex !== -1 && currentIndex < data.videos.length - 1) {
      setPlayingVideoId(data.videos[currentIndex + 1].id);
    }
  }, [data?.videos, playingVideoId]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data?.topic) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-muted-foreground">{t('learning.topicNotFound') || 'Topic not found'}</p>
      </div>
    );
  }

  const { topic, videos } = data;
  const lessonContent = topic.lesson_content as LessonContent | null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Sticky */}
      <div className="flex items-center gap-4 px-4 py-3 bg-card border-b sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/learning/${subjectSlug}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{topic.name}</h1>
          {topic.curriculum_country_code && (
            <CurriculumLocation
              countryId={topic.curriculum_country_code}
              levelId={topic.curriculum_level_code}
              subjectId={topic.curriculum_subject_id}
              domainId={topic.curriculum_domain_id}
              subdomainId={topic.curriculum_subdomain_id}
              variant="compact"
              locale="en"
            />
          )}
        </div>
      </div>

      {/* Scrollable Content with Tabs */}
      <ScrollArea className="flex-1">
        <div className="pb-24">
          <TopicTabsLayout
            learnContent={
              <TopicLearnTab
                topicId={topic.id}
                videos={videos}
                playingVideoId={playingVideoId}
                onVideoSelect={setPlayingVideoId}
                onVideoEnd={handleVideoEnd}
                completedVideoIds={completedVideoIds}
                allBanks={allBanks?.banks}
                lessonContent={lessonContent}
              />
            }
            transcriptContent={
              <TopicTranscriptTab
                videoId={playingVideoId}
                topicId={topic.id}
              />
            }
            lessonContent={
              <TopicLessonTab
                topicId={topic.id}
                lessonContent={lessonContent}
              />
            }
          />
        </div>
      </ScrollArea>

      {/* Quiz Overlay Controller */}
      <QuizOverlayController />
    </div>
  );
};

export default CoursePlaylistPage;
