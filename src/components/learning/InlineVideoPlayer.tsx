import { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { MathRenderer } from '@/components/math/MathRenderer';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { isYouTubeUrl, extractYouTubeVideoId, getYouTubeEmbedUrl, loadYouTubeAPI } from '@/utils/youtube';

interface InlineVideoPlayerProps {
  videoId: string;
  onClose: () => void;
}

export function InlineVideoPlayer({ videoId, onClose }: InlineVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const playerInitializedRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeReady, setYoutubeReady] = useState(false);

  const {
    video,
    currentQuiz,
    currentTime,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    updateProgress,
    submitQuizAnswer,
    isLoading,
  } = useVideoPlayer(videoId);

  // Scroll to player when mounted
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Check if video is YouTube
  useEffect(() => {
    if (video?.video_url) {
      const isYT = isYouTubeUrl(video.video_url);
      setIsYouTube(isYT);
      
      if (isYT) {
        loadYouTubeAPI().then(() => setYoutubeReady(true));
      }
    }
  }, [video?.video_url]);

  // Initialize YouTube Player
  useEffect(() => {
    if (!isYouTube || !youtubeReady || !video?.video_url || !youtubeContainerRef.current) return;
    if (playerInitializedRef.current) return; // Prevent double initialization

    const videoIdYT = extractYouTubeVideoId(video.video_url);
    if (!videoIdYT) return;

    console.log('Initializing YouTube Player with video ID:', videoIdYT);
    playerInitializedRef.current = true;

    const player = new window.YT.Player(youtubeContainerRef.current, {
      videoId: videoIdYT,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        start: video.last_watched_position_seconds || 0,
      },
      events: {
        onReady: (event: any) => {
          console.log('YouTube Player ready');
          youtubePlayerRef.current = event.target;
          setDuration(event.target.getDuration());
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }
        },
        onError: (event: any) => {
          console.error('YouTube Player error:', event.data);
        },
      },
    });

    // Poll for current time
    const interval = setInterval(() => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
        const time = youtubePlayerRef.current.getCurrentTime();
        setCurrentTime(time);
        if (duration > 0) {
          updateProgress(time, duration);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      playerInitializedRef.current = false;
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
      }
    };
  }, [isYouTube, youtubeReady, video?.video_url, duration, setCurrentTime, updateProgress, setIsPlaying]);

  // HTML5 Video event handlers (for non-YouTube videos)
  useEffect(() => {
    if (isYouTube) return;
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      if (duration > 0) {
        updateProgress(videoElement.currentTime, duration);
      }
    };

    const handleLoadedMetadata = () => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      setDuration(videoEl.duration);
      if (video && video.last_watched_position_seconds) {
        videoEl.currentTime = video.last_watched_position_seconds;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [isYouTube, duration, updateProgress, setCurrentTime, setIsPlaying, video?.progress_percentage, video?.last_watched_position_seconds]);

  // Quiz trigger
  useEffect(() => {
    if (currentQuiz && isPlaying && !showQuiz) {
      setShowQuiz(true);
      if (isYouTube && youtubePlayerRef.current) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        videoRef.current?.pause();
      }
      setSelectedAnswer(null);
      setQuizResult(null);
    }
  }, [currentQuiz, isPlaying, showQuiz, isYouTube]);

  const togglePlayPause = () => {
    if (isYouTube && youtubePlayerRef.current) {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (isYouTube && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(value[0], true);
      setCurrentTime(value[0]);
    } else if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const toggleMute = () => {
    if (isYouTube && youtubePlayerRef.current) {
      if (isMuted) {
        youtubePlayerRef.current.unMute();
      } else {
        youtubePlayerRef.current.mute();
      }
      setIsMuted(!isMuted);
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (isYouTube && youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(value[0] * 100);
      setVolume(value[0]);
      if (value[0] === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    } else if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
      if (value[0] === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen();
    }
  };

  const handleQuizSubmit = async () => {
    if (selectedAnswer === null || !currentQuiz) return;

    const result = await submitQuizAnswer(currentQuiz.id, selectedAnswer);
    setQuizResult(result);
  };

  const handleQuizContinue = () => {
    setShowQuiz(false);
    setSelectedAnswer(null);
    setQuizResult(null);
    if (isYouTube && youtubePlayerRef.current) {
      youtubePlayerRef.current.playVideo();
    } else {
      videoRef.current?.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card ref={containerRef} className="w-full p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </Card>
    );
  }

  if (!video) {
    return (
      <Card ref={containerRef} className="w-full p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Video not found</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card ref={containerRef} className="w-full overflow-hidden">
        <div className="relative bg-black">
          <AspectRatio ratio={16 / 9}>
            {isYouTube ? (
              <div ref={youtubeContainerRef} className="w-full h-full" />
            ) : (
              <video
                ref={videoRef}
                src={video.video_url}
                className="w-full h-full"
                playsInline
              />
            )}
          </AspectRatio>

          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 space-y-2">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => handleSeek([parseFloat(e.target.value)])}
                className="flex-1"
              />
              <span className="text-white text-sm">{formatTime(duration)}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{video.title}</h2>
            {video.description && (
              <p className="text-muted-foreground mt-2">{video.description}</p>
            )}
          </div>

          {video.progress_percentage > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{video.progress_percentage}%</span>
              </div>
              <Progress value={video.progress_percentage} />
            </div>
          )}
        </div>
      </Card>

      {/* Quiz Modal */}
      {showQuiz && currentQuiz && (
        <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Quiz Time! 🎯</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Question:</h3>
                {currentQuiz.question_latex ? (
                  <MathRenderer latex={currentQuiz.question_latex} />
                ) : (
                  <p>{currentQuiz.question}</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Options:</h3>
                <div className="space-y-2">
                  {currentQuiz.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === index ? 'default' : 'outline'}
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => setSelectedAnswer(index)}
                      disabled={quizResult !== null}
                    >
                      <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {quizResult && (
                <Card className={`p-4 ${quizResult.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h3 className="font-semibold mb-2">
                    {quizResult.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </h3>
                  <p className="text-sm">{quizResult.explanation}</p>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                {!quizResult ? (
                  <>
                    <Button variant="outline" onClick={handleQuizContinue}>
                      Skip
                    </Button>
                    <Button onClick={handleQuizSubmit} disabled={selectedAnswer === null}>
                      Submit Answer
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleQuizContinue}>
                    Continue Video
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
