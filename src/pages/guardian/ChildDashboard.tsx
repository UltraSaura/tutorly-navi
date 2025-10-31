import { useParams } from 'react-router-dom';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianExerciseHistory } from '@/hooks/useGuardianExerciseHistory';
import { useGuardianProgress } from '@/hooks/useGuardianProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChildHeader } from '@/components/guardian/ChildHeader';
import { KPICards } from '@/components/guardian/KPICards';
import { ExercisesPanel } from '@/components/guardian/ExercisesPanel';
import { SubjectsGrid } from '@/components/guardian/SubjectsGrid';
import { ExportReportButton } from '@/components/guardian/ExportReportButton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ChildDashboard() {
  const { childId } = useParams<{ childId: string }>();
  const { guardianId, loading: authLoading } = useGuardianAuth();
  const isMobile = useIsMobile();

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

  // Fetch progress data for subjects
  const { data: progressData } = useGuardianProgress(guardianId, childId);

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ChildHeader
            name={`${child.firstName} ${child.lastName}`}
            grade={child.grade}
            status={child.status}
            exerciseHistory={exerciseHistory}
          />
        </div>
        {!isMobile && (
          <ExportReportButton 
            childId={childId!} 
            childName={`${child.firstName} ${child.lastName}`}
          />
        )}
      </div>

      <KPICards />

      {progressData?.[0]?.subjects && progressData[0].subjects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Subjects</h2>
          <SubjectsGrid subjects={progressData[0].subjects} childId={childId!} />
        </div>
      )}

      <ExercisesPanel
        exercises={exerciseHistory}
        childId={childId!}
      />
    </div>
  );
}
