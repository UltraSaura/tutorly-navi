import { useSuggestedVideos } from '@/hooks/useSuggestedVideos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoSuggestionsProps {
  homeworkContent: string;
  subjectSlug?: string;
}

export function VideoSuggestions({ homeworkContent, subjectSlug }: VideoSuggestionsProps) {
  const { data: suggestedVideos, isLoading } = useSuggestedVideos(homeworkContent, 3);
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestedVideos || suggestedVideos.length === 0) {
    return null;
  }

  const handleVideoClick = (videoId: string) => {
    navigate(`/learning/video/${videoId}`);
  };

  return (
    <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {t('learning.suggestedVideos') || 'Suggested Learning Videos'}
        </CardTitle>
        <CardDescription>
          {t('learning.suggestedVideosDescription') || 
           'Watch these videos to better understand this topic'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestedVideos.map((video) => (
            <div
              key={video.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleVideoClick(video.id)}
            >
              <div className="flex-shrink-0">
                <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                  <Play className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                  {video.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {video.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    +{video.xp_reward} XP
                  </span>
                  {video.matchScore > 0 && (
                    <span className="text-xs">
                      {Math.round(video.matchScore * 100)}% match
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick(video.id);
                }}
              >
                Watch
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
