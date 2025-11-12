import { useEffect, useRef, useState } from 'react';
import { Play, Clock, Zap } from 'lucide-react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { loadYouTubeAPI, extractYouTubeVideoId, isYouTubeUrl } from '@/utils/youtube';

interface VideoPlayerBoxProps {
  videoId: string | null;
  onVideoEnd?: () => void;
}

export const VideoPlayerBox = ({ videoId, onVideoEnd }: VideoPlayerBoxProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);

  const { video, updateProgress } = useVideoPlayer(videoId || '');

  useEffect(() => {
    if (!video?.video_url) return;
    
    const isYT = isYouTubeUrl(video.video_url);
    setIsYouTube(isYT);

    if (isYT) {
      const ytVideoId = extractYouTubeVideoId(video.video_url);
      if (!ytVideoId) return;

      const initPlayer = async () => {
        try {
          await loadYouTubeAPI();
          
          // Destroy existing player before creating new one
          if (youtubePlayer?.destroy) {
            youtubePlayer.destroy();
          }

          const player = new (window as any).YT.Player(`youtube-player-${videoId}`, {
            videoId: ytVideoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              modestbranding: 1,
            },
            events: {
              onReady: () => {
                // Start progress tracking interval
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                }
                progressIntervalRef.current = setInterval(() => {
                  const current = player.getCurrentTime?.();
                  const duration = player.getDuration?.();
                  if (current && duration && duration > 0) {
                    updateProgress(current, duration);
                  }
                }, 1000);
              },
              onStateChange: (event: any) => {
                // State 0 = ended
                if (event.data === 0) {
                  const duration = player.getDuration?.();
                  if (duration) {
                    updateProgress(duration, duration);
                  }
                  if (onVideoEnd) {
                    onVideoEnd();
                  }
                }
              },
            },
          });
          setYoutubePlayer(player);
        } catch (error) {
          console.error('Failed to load YouTube player:', error);
        }
      };

      initPlayer();

      return () => {
        // Clear progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        // Destroy YouTube player
        if (youtubePlayer?.destroy) {
          youtubePlayer.destroy();
        }
      };
    }
  }, [video?.video_url, videoId, onVideoEnd, updateProgress]);


  if (!videoId || !video) {
    return (
      <div className="mx-4 mt-4 mb-4 bg-muted rounded-xl overflow-hidden shadow-lg">
        <div className="relative pt-[56.25%]">
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-muted-foreground/30" />
          </div>
        </div>
        <div className="p-4 bg-card">
          <p className="text-sm text-muted-foreground">Select a video to begin learning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 mb-4 bg-card rounded-xl overflow-hidden shadow-lg border">
      <div className="relative pt-[56.25%] bg-black">
        {isYouTube ? (
          <div
            id={`youtube-player-${videoId}`}
            ref={iframeRef}
            className="absolute top-0 left-0 w-full h-full"
          />
        ) : (
          <video
            ref={videoRef}
            src={video.video_url}
            controls
            autoPlay
            className="absolute top-0 left-0 w-full h-full"
            onTimeUpdate={(e) => {
              const currentTime = e.currentTarget.currentTime;
              const duration = e.currentTarget.duration;
              if (duration > 0) {
                updateProgress(currentTime, duration);
              }
            }}
            onEnded={onVideoEnd}
          />
        )}
      </div>
      
      <div className="p-4 bg-card border-t">
        <h2 className="text-lg font-semibold text-foreground mb-2">{video.title}</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {video.duration_minutes} min
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            +{video.xp_reward} XP
          </span>
        </div>
      </div>
    </div>
  );
};
