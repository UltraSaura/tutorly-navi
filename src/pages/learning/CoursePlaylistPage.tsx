import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle2, Clock } from 'lucide-react';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { cn } from '@/lib/utils';
import { InlineVideoPlayer } from '@/components/learning/InlineVideoPlayer';

const CoursePlaylistPage = () => {
  const { subjectSlug, topicSlug } = useParams<{ subjectSlug: string; topicSlug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading } = useCoursePlaylist(topicSlug || '');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

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

  const { topic, videos, featuredVideo } = data;

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'border-green-500';
    if (percentage > 0) return 'border-primary';
    return 'border-muted';
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl pb-24">
      <div className="flex items-center gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/learning/${subjectSlug}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">{topic.name}</h1>
      </div>

      {/* Inline Video Player */}
      {selectedVideoId && (
        <InlineVideoPlayer 
          videoId={selectedVideoId} 
          onClose={() => setSelectedVideoId(null)}
        />
      )}

      {featuredVideo && (
        <Card className="overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
          <div className="relative">
            {featuredVideo.thumbnail_url ? (
              <img 
                src={featuredVideo.thumbnail_url} 
                alt={featuredVideo.title}
                className="w-full aspect-video object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-t-lg">
                <Play className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            {(featuredVideo.progress_percentage || 0) > 0 && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                style={{ height: `${featuredVideo.progress_percentage}%` }}
              />
            )}
          </div>
          
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2">{featuredVideo.title}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {featuredVideo.duration_minutes} min
              </span>
              <span>•</span>
              <span>+{featuredVideo.xp_reward} XP</span>
              {(featuredVideo.progress_percentage || 0) > 0 && (
                <>
                  <span>•</span>
                  <span>{featuredVideo.progress_percentage}% {t('learning.watched') || 'Watched'}</span>
                </>
              )}
            </div>
            <Button 
              className="w-full"
              onClick={() => setSelectedVideoId(featuredVideo.id)}
            >
              <Play className="w-4 h-4 mr-2" />
              {(featuredVideo.progress_percentage || 0) > 0 ? t('learning.continue') || 'Continue' : t('learning.start') || 'Start'}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {videos.map((video, index) => {
          const isCompleted = video.is_completed;
          const inProgress = (video.progress_percentage || 0) > 0 && !isCompleted;

          return (
            <Card
              key={video.id}
              className={cn(
                "p-4 cursor-pointer transition-all hover:shadow-md border-2",
                getProgressColor(video.progress_percentage || 0)
              )}
              onClick={() => setSelectedVideoId(video.id)}
            >
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-32 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-muted flex items-center justify-center rounded-lg">
                      <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 truncate">{video.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {video.duration_minutes} min
                    </span>
                    <span>•</span>
                    <span>+{video.xp_reward} XP</span>
                    {inProgress && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">
                          {video.progress_percentage}% {t('learning.watched') || 'Watched'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke={isCompleted ? '#10B981' : 'hsl(var(--primary))'}
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - (video.progress_percentage || 0) / 100)}`}
                      className="transition-all"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                    {video.progress_percentage || 0}%
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CoursePlaylistPage;
