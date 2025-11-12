import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Video, Quiz } from '@/types/learning';
import { toast } from 'sonner';

export function useVideoPlayer(videoId: string) {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch video and quizzes
  const { data, isLoading, error } = useQuery({
    queryKey: ['video-player', videoId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: video, error: videoError } = await (supabase as any)
        .from('learning_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      const { data: quizzes, error: quizzesError } = await (supabase as any)
        .from('video_quizzes')
        .select('*')
        .eq('video_id', videoId)
        .order('order_index');

      if (quizzesError) throw quizzesError;

      let progress: any = null;
      if (user) {
        const { data: progressData } = await (supabase as any)
          .from('user_learning_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .maybeSingle();

        progress = progressData;
      }

      return {
        video: {
          ...(video as any),
          progress_percentage: progress?.progress_percentage || 0,
          last_watched_position_seconds: progress?.last_watched_position_seconds || 0,
        } as Video,
        quizzes: (quizzes as any[]) as Quiz[],
      };
    },
    enabled: !!videoId,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ progressPercentage, progressType }: { progressPercentage: number; progressType: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from('user_learning_progress')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          progress_percentage: progressPercentage,
          last_watched_position_seconds: currentTime,
          progress_type: progressType,
          time_spent_seconds: currentTime,
        }, {
          onConflict: 'user_id,video_id',
        });

      if (error) throw error;
      
      // Show completion toast
      if (progressType === 'video_completed') {
        toast.success('Video completed!', {
          description: 'Great job! New quizzes may now be available.'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-player', videoId] });
      queryClient.invalidateQueries({ queryKey: ['course-playlist'] });
      queryClient.invalidateQueries({ queryKey: ['subject-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['completed-videos'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-banks-all'] });
    },
    onError: (error) => {
      console.error('Failed to update progress:', error);
      toast.error('Failed to save progress', {
        description: 'Your progress may not have been saved properly.'
      });
    }
  });

  // Submit quiz answer mutation
  const submitQuizMutation = useMutation({
    mutationFn: async ({ quizId, answerIndex }: { quizId: string; answerIndex: number }) => {
      const quiz = data?.quizzes.find(q => q.id === quizId);
      if (!quiz) throw new Error('Quiz not found');

      const isCorrect = answerIndex === quiz.correct_answer_index;

      const { data: { user } } = await supabase.auth.getUser();
      if (user && isCorrect) {
        await (supabase as any)
          .from('user_learning_progress')
          .insert({
            user_id: user.id,
            video_id: videoId,
            progress_type: 'quiz_passed',
            quiz_score: 100,
          });
      }

      return { isCorrect, explanation: quiz.explanation, xpReward: isCorrect ? quiz.xp_reward : 0 };
    },
    onSuccess: (result) => {
      if (result.isCorrect) {
        toast.success(`Correct! +${result.xpReward} XP`, {
          description: result.explanation,
        });
      } else {
        toast.error('Incorrect', {
          description: result.explanation,
        });
      }
    },
  });

  const updateProgress = useCallback((time: number, duration: number) => {
    setCurrentTime(time);
    const percentage = Math.round((time / duration) * 100);
    
    if (percentage >= 90) {
      updateProgressMutation.mutate({ progressPercentage: 100, progressType: 'video_completed' });
    } else if (percentage > (data?.video.progress_percentage || 0)) {
      updateProgressMutation.mutate({ progressPercentage: percentage, progressType: 'video_started' });
    }
  }, [data?.video.progress_percentage, updateProgressMutation]);

  const submitQuizAnswer = useCallback((quizId: string, answerIndex: number) => {
    return submitQuizMutation.mutateAsync({ quizId, answerIndex });
  }, [submitQuizMutation]);

  // Find current quiz based on time
  const currentQuiz = data?.quizzes.find(
    q => Math.abs(q.timestamp_seconds - currentTime) < 2
  ) || null;

  return {
    video: data?.video || null,
    quizzes: data?.quizzes || [],
    currentQuiz,
    currentTime,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    updateProgress,
    submitQuizAnswer,
    isLoading,
    error,
  };
}
