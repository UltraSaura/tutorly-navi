import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Video, Quiz } from '@/types/learning';
import { toast } from 'sonner';

export function useVideoPlayer(videoId: string) {
  const queryClient = useQueryClient();
  const currentTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastSavedPercentageRef = useRef(0);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);

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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
          last_watched_position_seconds: currentTimeRef.current,
          progress_type: progressType,
          time_spent_seconds: currentTimeRef.current,
        }, {
          onConflict: 'user_id,video_id',
        });

      if (error) throw error;
      
      if (progressType === 'video_completed') {
        toast.success('Video completed!', {
          description: 'Great job! New quizzes may now be available.'
        });
      }
      
      return { progressType };
    },
    onSuccess: (result) => {
      if (result?.progressType === 'video_completed') {
        // Update cache in-place instead of refetching
        queryClient.setQueryData(['video-player', videoId], (old: any) =>
          old ? { ...old, video: { ...old.video, progress_percentage: 100 } } : old
        );
        queryClient.invalidateQueries({ queryKey: ['subject-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['completed-videos'] });
        queryClient.invalidateQueries({ queryKey: ['quiz-banks-all'] });
      }
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

  // Store mutation and data in refs to stabilize updateProgress
  const mutateRef = useRef(updateProgressMutation.mutate);
  const dataRef = useRef(data);
  useEffect(() => { mutateRef.current = updateProgressMutation.mutate; });
  useEffect(() => { dataRef.current = data; });

  const updateProgress = useCallback((time: number, duration: number) => {
    currentTimeRef.current = time;
    const percentage = Math.round((time / duration) * 100);

    const quizzes = dataRef.current?.quizzes;
    const matchedQuiz = quizzes?.find(
      q => Math.abs(q.timestamp_seconds - time) < 2
    ) || null;
    setCurrentQuiz(prev => {
      if (prev?.id === matchedQuiz?.id) return prev;
      return matchedQuiz;
    });

    const savedProgress = dataRef.current?.video.progress_percentage || 0;
    if (percentage >= 90) {
      if (lastSavedPercentageRef.current < 90) {
        lastSavedPercentageRef.current = 100;
        mutateRef.current({ progressPercentage: 100, progressType: 'video_completed' });
      }
    } else if (percentage > savedProgress && 
               percentage - lastSavedPercentageRef.current >= 5) {
      lastSavedPercentageRef.current = percentage;
      mutateRef.current({ progressPercentage: percentage, progressType: 'video_started' });
    }
  }, []); // No dependencies — all accessed via refs

  const submitQuizRef = useRef(submitQuizMutation.mutateAsync);
  useEffect(() => { submitQuizRef.current = submitQuizMutation.mutateAsync; });

  const submitQuizAnswer = useCallback((quizId: string, answerIndex: number) => {
    return submitQuizRef.current({ quizId, answerIndex });
  }, []);

  return {
    video: data?.video || null,
    quizzes: data?.quizzes || [],
    currentQuiz,
    currentTime: currentTimeRef.current,
    isPlaying,
    setIsPlaying,
    setCurrentTime: (time: number) => { currentTimeRef.current = time; },
    updateProgress,
    submitQuizAnswer,
    isLoading,
    error,
  };
}
