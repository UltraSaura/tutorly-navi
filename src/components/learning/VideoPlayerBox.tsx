import { useEffect, useRef, useState } from 'react';
import { Play, Clock, Zap } from 'lucide-react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';

interface VideoPlayerBoxProps {
  videoId: string | null;
  onVideoEnd?: () => void;
}

export const VideoPlayerBox = ({ videoId, onVideoEnd }: VideoPlayerBoxProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);

  const { video, updateProgress } = useVideoPlayer(videoId || '');

  useEffect(() => {
    if (!video?.video_url) return;
    
    const isYT = video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be');
    setIsYouTube(isYT);

    if (isYT) {
      const videoId = extractYouTubeVideoId(video.video_url);
      if (!videoId) return;

      // Load YouTube IFrame API
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      const initPlayer = () => {
        const player = new (window as any).YT.Player(iframeRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === 0 && onVideoEnd) {
                onVideoEnd();
              }
            },
          },
        });
        setYoutubePlayer(player);
      };

      if ((window as any).YT?.Player) {
        initPlayer();
      } else {
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      }
    }
  }, [video?.video_url, onVideoEnd]);

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

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
          <iframe
            ref={iframeRef}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
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
