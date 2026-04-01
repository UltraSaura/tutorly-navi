import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Play, Clock, Zap } from 'lucide-react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { loadYouTubeAPI, extractYouTubeVideoId, isYouTubeUrl } from '@/utils/youtube';

interface VideoPlayerBoxProps {
  videoId: string | null;
  onVideoEnd?: () => void;
}

export const VideoPlayerBox = memo(({ videoId, onVideoEnd }: VideoPlayerBoxProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const updateProgressRef = useRef<any>(null);
  const lastInitVideoIdRef = useRef<string | null>(null);
  const [isYouTube, setIsYouTube] = useState(false);

  const { video, updateProgress } = useVideoPlayer(videoId || '');

  // Stable YouTube container that React won't recreate on re-renders
  const youtubeContainer = useMemo(() => (
    videoId ? <div id={`youtube-player-${videoId}`} className="absolute top-0 left-0 w-full h-full" /> : null
  ), [videoId]);

  // Keep updateProgress ref current
  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  useEffect(() => {
    if (!video?.video_url || !videoId) return;
    
    // Skip re-initialization if same videoId
    if (lastInitVideoIdRef.current === videoId && youtubePlayerRef.current) {
      console.log('🎬 Skipping re-init, same videoId:', videoId);
      return;
    }
    
    console.log('🎬 VideoPlayerBox - videoId changed:', videoId);
    
    const isYT = isYouTubeUrl(video.video_url);
    setIsYouTube(isYT);

    if (isYT) {
      const ytVideoId = extractYouTubeVideoId(video.video_url);
      if (!ytVideoId) return;

      const savedPosition = video.last_watched_position_seconds || 0;

      const initPlayer = async () => {
        try {
          await loadYouTubeAPI();
          
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          
          if (youtubePlayerRef.current?.destroy) {
            youtubePlayerRef.current.destroy();
            youtubePlayerRef.current = null;
          }

          console.log('🎬 Creating new YouTube player');
          lastInitVideoIdRef.current = videoId;
          
          const player = new (window as any).YT.Player(`youtube-player-${videoId}`, {
            videoId: ytVideoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              modestbranding: 1,
              start: Math.floor(savedPosition),
            },
            events: {
              onReady: () => {
                console.log('🎬 Player ready, seeking to:', savedPosition);
                if (savedPosition > 0) {
                  player.seekTo(savedPosition, true);
                }
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                }
                progressIntervalRef.current = setInterval(() => {
                  const current = player.getCurrentTime?.();
                  const duration = player.getDuration?.();
                  if (current && duration && duration > 0) {
                    updateProgressRef.current?.(current, duration);
                  }
                }, 5000);
              },
              onStateChange: (event: any) => {
                if (event.data === 0) {
                  const duration = player.getDuration?.();
                  if (duration) {
                    updateProgressRef.current?.(duration, duration);
                  }
                  onVideoEnd?.();
                }
              },
            },
          });
          youtubePlayerRef.current = player;
        } catch (error) {
          console.error('❌ Failed to load YouTube player:', error);
        }
      };

      initPlayer();

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        if (youtubePlayerRef.current?.destroy) {
          youtubePlayerRef.current.destroy();
          youtubePlayerRef.current = null;
          lastInitVideoIdRef.current = null;
        }
      };
    }
  }, [video?.video_url, videoId]);


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
        {isYouTube ? youtubeContainer : (
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
});
