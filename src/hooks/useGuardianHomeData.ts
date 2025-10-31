import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useMemo } from 'react';

interface ChildOverview {
  id: string;
  name: string;
  successRate: number;
  exercisesThisWeek: number;
  latestSubject?: string;
  trend: "up" | "down" | "flat";
  needsAttention: boolean;
  lastActiveDate?: string;
}

interface ActivityItem {
  id: string;
  childName: string;
  childId: string;
  exerciseContent: string;
  subject: string;
  isCorrect: boolean;
  timestamp: string;
}

export function useGuardianHomeData(guardianId?: string) {
  const queryClient = useQueryClient();

  // Fetch children and their basic info
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['guardian-children-home', guardianId],
    queryFn: async () => {
      if (!guardianId) return null;
      
      const { data, error } = await supabase
        .from('guardian_child_links')
        .select(`
          child_id,
          relation,
          children!inner(
            id,
            user_id,
            status,
            grade,
            users!inner(
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('guardian_id', guardianId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!guardianId,
  });

  // Fetch exercise history for all children with optimized caching
  const { data: exerciseData, isLoading: exerciseLoading } = useQuery({
    queryKey: ['guardian-exercises-home', guardianId, childrenData],
    staleTime: 30000, // Cache for 30 seconds
    queryFn: async () => {
      if (!guardianId || !childrenData) return null;
      
      const childUserIds = childrenData
        .map(link => link.children?.user_id)
        .filter(Boolean);
      
      if (childUserIds.length === 0) return null;
      
      const { data, error } = await supabase
        .from('exercise_history')
        .select('*')
        .in('user_id', childUserIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!guardianId && !!childrenData,
  });

  // Real-time subscription for new exercise history
  useEffect(() => {
    if (!guardianId || !childrenData || childrenData.length === 0) return;

    const childUserIds = childrenData
      .map(link => link.children?.user_id)
      .filter(Boolean);

    if (childUserIds.length === 0) return;
    
    const channel = supabase
      .channel('guardian-exercise-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exercise_history',
          filter: `user_id=in.(${childUserIds.join(',')})`
        },
        () => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['guardian-exercises-home', guardianId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guardianId, childrenData, queryClient]);

  // Calculate children overview data
  const childrenOverview: ChildOverview[] = useMemo(() => {
    if (!childrenData || !exerciseData) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return childrenData.map(link => {
      const child = link.children;
      if (!child || !child.users) return null;

      const childExercises = exerciseData.filter(ex => ex.user_id === child.user_id);
      const exercisesThisWeek = childExercises.filter(
        ex => new Date(ex.created_at) >= sevenDaysAgo
      );
      
      const totalExercises = childExercises.length;
      const correctExercises = childExercises.filter(ex => ex.is_correct).length;
      const successRate = totalExercises > 0 ? (correctExercises / totalExercises) * 100 : 0;

      // Calculate trend (simple: compare last 5 vs previous 5)
      const recent5 = childExercises.slice(0, 5);
      const previous5 = childExercises.slice(5, 10);
      const recentSuccess = recent5.filter(ex => ex.is_correct).length / (recent5.length || 1);
      const previousSuccess = previous5.filter(ex => ex.is_correct).length / (previous5.length || 1);
      
      let trend: "up" | "down" | "flat" = "flat";
      if (recentSuccess > previousSuccess + 0.1) trend = "up";
      else if (recentSuccess < previousSuccess - 0.1) trend = "down";

      const needsAttention = successRate < 60 || exercisesThisWeek.length === 0;
      const lastActiveDate = childExercises[0]?.created_at;
      const latestSubject = childExercises[0]?.subject_id || undefined;

      const firstName = (child.users as any).first_name || '';
      const lastName = (child.users as any).last_name || '';
      const name = `${firstName} ${lastName}`.trim() || 'Unnamed Child';

      return {
        id: child.id,
        name,
        successRate,
        exercisesThisWeek: exercisesThisWeek.length,
        latestSubject,
        trend,
        needsAttention,
        lastActiveDate,
      };
    }).filter(Boolean) as ChildOverview[];
  }, [childrenData, exerciseData]);

  // Calculate recent activity
  const recentActivity: ActivityItem[] = useMemo(() => {
    if (!childrenData || !exerciseData) return [];

    return exerciseData.slice(0, 15).map(exercise => {
      const childLink = childrenData.find(
        link => link.children?.user_id === exercise.user_id
      );
      const child = childLink?.children;
      const user = child?.users as any;
      
      const firstName = user?.first_name || '';
      const lastName = user?.last_name || '';
      const childName = `${firstName} ${lastName}`.trim() || 'Unknown';

      return {
        id: exercise.id,
        childName,
        childId: child?.id || '',
        exerciseContent: exercise.exercise_content.slice(0, 100),
        subject: exercise.subject_id || 'General',
        isCorrect: exercise.is_correct || false,
        timestamp: exercise.created_at,
      };
    });
  }, [childrenData, exerciseData]);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    const totalChildren = childrenData?.length || 0;
    const activeChildren = childrenData?.filter(
      link => link.children?.status === 'active'
    ).length || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const exercisesThisWeek = exerciseData?.filter(
      ex => new Date(ex.created_at) >= sevenDaysAgo
    ).length || 0;

    const avgProgress = childrenOverview.length > 0
      ? childrenOverview.reduce((acc, child) => acc + child.successRate, 0) / childrenOverview.length
      : 0;

    const needsAttentionCount = childrenOverview.filter(
      child => child.needsAttention
    ).length;

    return {
      totalChildren,
      activeChildren,
      exercisesThisWeek,
      avgProgress,
      needsAttentionCount,
    };
  }, [childrenData, exerciseData, childrenOverview]);

  return {
    childrenOverview,
    recentActivity,
    aggregatedStats,
    isLoading: childrenLoading || exerciseLoading,
  };
}
