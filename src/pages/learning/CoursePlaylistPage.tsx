import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { VideoPlayerBox } from '@/components/learning/VideoPlayerBox';
import { CollapsibleVideoSection } from '@/components/learning/CollapsibleVideoSection';
import type { Video } from '@/types/learning';

const CoursePlaylistPage = () => {
  const { subjectSlug, topicSlug } = useParams<{ subjectSlug: string; topicSlug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading } = useCoursePlaylist(topicSlug || '');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // REMOVED: Auto-play featured video on load
  // Videos will only play when clicked via onVideoSelect

  // Group videos into sections (every 4 videos)
  const videoSections = useMemo(() => {
    if (!data?.videos) return [];
    
    const sections: { title: string; videos: Video[] }[] = [];
    const sectionSize = 4;
    
    for (let i = 0; i < data.videos.length; i += sectionSize) {
      const sectionVideos = data.videos.slice(i, i + sectionSize);
      const sectionNumber = Math.floor(i / sectionSize) + 1;
      sections.push({
        title: `Section ${sectionNumber}`,
        videos: sectionVideos,
      });
    }
    
    return sections;
  }, [data?.videos]);

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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Sticky */}
      <div className="flex items-center gap-4 px-4 py-3 bg-card border-b sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/learning/${subjectSlug}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">{topic.name}</h1>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="pb-24">
          {/* Video Player - Always Visible */}
          <VideoPlayerBox 
            videoId={playingVideoId}
            onVideoEnd={() => {
              // Auto-play next video
              if (!data?.videos) return;
              const currentIndex = data.videos.findIndex(v => v.id === playingVideoId);
              if (currentIndex !== -1 && currentIndex < data.videos.length - 1) {
                setPlayingVideoId(data.videos[currentIndex + 1].id);
              }
            }}
          />

          {/* Course Sections */}
          <div className="space-y-1">
            {videoSections.map((section, index) => (
              <CollapsibleVideoSection
                key={index}
                title={section.title}
                videos={section.videos}
                playingVideoId={playingVideoId}
                onVideoSelect={setPlayingVideoId}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CoursePlaylistPage;
