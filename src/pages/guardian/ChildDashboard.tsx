import { useParams } from 'react-router-dom';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianExerciseHistory } from '@/hooks/useGuardianExerciseHistory';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChildHeader } from '@/components/guardian/ChildHeader';
import { KPICards } from '@/components/guardian/KPICards';
import { ExercisesPanel } from '@/components/guardian/ExercisesPanel';

export default function ChildDashboard() {
  const { childId } = useParams<{ childId: string }>();
  const { guardianId, loading: authLoading } = useGuardianAuth();

  // Fetch child details
  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ['child-details', childId],
    queryFn: async () => {
      if (!childId) return null;

      const { data, error } = await supabase
        .from('children')
        .select(`
          id,
          user_id,
          grade,
          status,
          users!inner(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', childId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        firstName: (data.users as any).first_name || '',
        lastName: (data.users as any).last_name || '',
        email: (data.users as any).email || '',
        grade: data.grade || '',
        status: data.status,
      };
    },
    enabled: !!childId,
  });

  // Fetch exercise history for this child
  const { exerciseHistory, loading: historyLoading } = useGuardianExerciseHistory({
    guardianId,
    childId,
  });

  if (authLoading || childLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading child dashboard...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Child not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChildHeader
        name={`${child.firstName} ${child.lastName}`}
        grade={child.grade}
        status={child.status}
        exerciseHistory={exerciseHistory}
      />

      <KPICards />

      <ExercisesPanel
        exercises={exerciseHistory}
        childId={childId!}
      />
    </div>
  );
}
