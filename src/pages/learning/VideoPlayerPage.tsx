import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Play, Pause, Volume2, Maximize } from 'lucide-react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { MathRenderer } from '@/components/math/MathRenderer';
import { cn } from '@/lib/utils';
import { TestYourselfInline } from '@/components/learning/TestYourselfInline';
import { QuizOverlayController } from '@/components/learning/QuizOverlayController';
import { useAllBanks } from '@/hooks/useQuizBank';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const VideoPlayerPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ isCorrect: boolean; explanation: string } | null>(null);

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
  } = useVideoPlayer(videoId || '');

  const { user } = useAuth();

  // Fetch completed video IDs for the topic
  const { data: completedVideoIds = [] } = useQuery({
    queryKey: ['completed-videos', video?.topic_id, user?.id],
    queryFn: async () => {
      if (!user || !video?.topic_id) return [];
      
      const { data, error } = await supabase
        .from('user_learning_progress')
        .select('video_id')
        .eq('user_id', user.id)
        .eq('progress_type', 'video_completed')
        .not('video_id', 'is', null);

      if (error) throw error;
      return (data || []).map((d: any) => d.video_id).filter(Boolean) as string[];
    },
    enabled: !!user && !!video?.topic_id,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch all quiz banks (both locked and unlocked)
  const { data: allBanks, error: allBanksError, isLoading: allBanksLoading } = useAllBanks(
    video?.topic_id || '',
    videoId || '',
    completedVideoIds,
    user?.id || ''
  );

  // Debug logging
  useEffect(() => {
    console.log('🎯 Quiz Banks Debug:', {
      videoId,
      topicId: video?.topic_id,
      completedVideoIds,
      userId: user?.id,
      allBanks,
      allBanksError,
      allBanksLoading,
    });
  }, [allBanks, allBanksError, allBanksLoading, video?.topic_id, videoId, completedVideoIds, user?.id]);

  useEffect(() => {
    if (currentQuiz && !showQuiz) {
      setShowQuiz(true);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [currentQuiz, showQuiz, setIsPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current && duration > 0) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      updateProgress(time, duration);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleQuizSubmit = async () => {
    if (selectedAnswer === null || !currentQuiz) return;

    const result = await submitQuizAnswer(currentQuiz.id, selectedAnswer);
    setQuizResult(result);
  };

  const handleContinue = () => {
    setShowQuiz(false);
    setSelectedAnswer(null);
    setQuizResult(null);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <Skeleton className="w-full max-w-4xl aspect-video" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <p className="text-muted-foreground">{t('learning.videoNotFound') || 'Video not found'}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="relative bg-black flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          onClick={() => navigate(-1)}
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="relative w-full max-w-4xl mx-auto">
          <video
            ref={videoRef}
            src={video.video_url}
            className="w-full aspect-video"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => updateProgress(duration, duration)}
          />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    setCurrentTime(time);
                    if (videoRef.current) {
                      videoRef.current.currentTime = time;
                    }
                  }}
                  className="w-full"
                />
              </div>

              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Volume2 className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => videoRef.current?.requestFullscreen()}
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-4xl">
          <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
          {video.description && (
            <p className="text-muted-foreground mb-6">{video.description}</p>
          )}
          
          {/* Test Yourself section */}
          {allBanksError && (
            <div className="mb-6 p-4 border border-destructive rounded-xl bg-destructive/10">
              <p className="text-sm text-destructive">Error loading quiz banks: {allBanksError.message}</p>
            </div>
          )}
          {allBanks?.banks && allBanks.banks.length > 0 && (
            <div className="mb-6 p-4 border rounded-xl">
              <h4 className="font-semibold mb-3">Test yourself</h4>
              <div className="flex flex-wrap gap-3">
                {allBanks.banks.map(bank => (
                  <TestYourselfInline 
                    key={bank.id} 
                    bankId={bank.bankId}
                    locked={!bank.isUnlocked}
                    progressMessage={bank.progressMessage}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showQuiz && currentQuiz && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold">{t('learning.quiz') || 'Quiz Time!'}</h2>
            
            <div>
              {currentQuiz.question_latex ? (
                <MathRenderer latex={currentQuiz.question_latex} />
              ) : (
                <p className="text-lg">{currentQuiz.question}</p>
              )}
            </div>

            <div className="space-y-3">
              {currentQuiz.options.map((option, index) => (
                <button
                  key={index}
                  className={cn(
                    "w-full p-4 text-left border-2 rounded-xl transition-all",
                    selectedAnswer === index && !quizResult && "border-primary bg-primary/10",
                    quizResult && index === currentQuiz.correct_answer_index && "border-green-500 bg-green-500/10",
                    quizResult && selectedAnswer === index && !quizResult.isCorrect && "border-red-500 bg-red-500/10",
                    !selectedAnswer && !quizResult && "hover:border-primary/50"
                  )}
                  onClick={() => !quizResult && setSelectedAnswer(index)}
                  disabled={!!quizResult}
                >
                  {option}
                </button>
              ))}
            </div>

            {quizResult && (
              <div className={cn(
                "p-4 rounded-lg",
                quizResult.isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-red-500/10 text-red-700 dark:text-red-300"
              )}>
                <p className="font-semibold mb-2">
                  {quizResult.isCorrect ? '✅ ' + (t('learning.correct') || 'Correct!') : '❌ ' + (t('learning.incorrect') || 'Incorrect')}
                </p>
                <p className="text-sm">{quizResult.explanation}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!quizResult ? (
                <Button 
                  className="flex-1" 
                  onClick={handleQuizSubmit}
                  disabled={selectedAnswer === null}
                >
                  {t('learning.submit') || 'Submit Answer'}
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleContinue}>
                  {t('learning.continueVideo') || 'Continue Video'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Quiz Overlay Controller */}
      <QuizOverlayController />
    </div>
  );
};

export default VideoPlayerPage;
