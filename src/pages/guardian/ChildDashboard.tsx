import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianExerciseHistory } from '@/hooks/useGuardianExerciseHistory';
import { useGuardianLessonData } from '@/hooks/useGuardianLessonData';
import { useGuardianProgress } from '@/hooks/useGuardianProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChildHeader } from '@/components/guardian/ChildHeader';
import { KPICards } from '@/components/guardian/KPICards';
import { ExercisesPanel } from '@/components/guardian/ExercisesPanel';
import { SubjectsGrid } from '@/components/guardian/SubjectsGrid';
import { ExportReportButton } from '@/components/guardian/ExportReportButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubjectMasteryCard } from '@/components/user/SubjectMasteryCard';
import { PageMeta } from '@/components/seo/PageMeta';
import { LearningInsightsCard } from '@/components/learning/LearningInsightsCard';
import { BookOpen, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChildDetailsUser {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

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

      const user = data.users as ChildDetailsUser | null;

      return {
        id: data.id,
        user_id: data.user_id,
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        email: user?.email || '',
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

  const { data: quizAttempts = [], isLoading: quizLoading } = useQuery({
    queryKey: ['guardian-child-quiz-attempts', guardianId, child?.user_id],
    queryFn: async () => {
      if (!child?.user_id) return [];

      const { data, error } = await supabase
        .from('quiz_bank_attempts')
        .select('*')
        .eq('user_id', child.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!guardianId && !!child?.user_id,
  });

  const kpiStats = useMemo(() => {
    const totalExercises = exerciseHistory.length;
    const correctExercises = exerciseHistory.filter(exercise => exercise.is_correct === true).length;
    const totalAttempts = exerciseHistory.reduce(
      (sum, exercise) => sum + (exercise.attempts_count || 0),
      0
    );
    const successRate = totalExercises > 0 ? (correctExercises / totalExercises) * 100 : 0;
    const bestQuizScore = quizAttempts.length > 0
      ? Math.max(...quizAttempts.map(attempt =>
          attempt.max_score > 0 ? (attempt.score / attempt.max_score) * 100 : 0
        ))
      : null;

    return {
      totalExercises,
      correctExercises,
      totalAttempts,
      successRate,
      quizzesCompleted: quizAttempts.length,
      bestQuizScore,
    };
  }, [exerciseHistory, quizAttempts]);

  // Fetch progress data for subjects
  const { data: progressData } = useGuardianProgress(guardianId, childId);
  const childUserIds = child?.user_id ? [child.user_id] : [];
  const { getChildStats } = useGuardianLessonData(guardianId, childUserIds);
  const lessonStats = child?.user_id ? getChildStats(child.user_id) : undefined;

  if (authLoading || childLoading || historyLoading || quizLoading) {
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
      <PageMeta title="Child Dashboard" description="Detailed learning view for an individual child on Stuwy." />
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

      {/* Subject Mastery Card */}
      {progressData?.[0] && (
        <SubjectMasteryCard
          percentage={progressData[0].overallProgress}
          completedTopics={progressData[0].subjects.filter(s => s.progress === 100).length}
          totalTopics={progressData[0].subjects.length}
        />
      )}

      <KPICards
        exercisesCompleted={kpiStats.totalExercises}
        correctExercises={kpiStats.correctExercises}
        totalAttempts={kpiStats.totalAttempts}
        successRate={kpiStats.successRate}
        quizzesCompleted={kpiStats.quizzesCompleted}
        bestQuizScore={kpiStats.bestQuizScore}
      />

      <LearningInsightsCard studentId={child.user_id} />

      {lessonStats && lessonStats.lessonsCompleted > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg p-2" style={{ background: '#F2FBF8' }}>
                <BookOpen className="h-4 w-4" style={{ color: '#12C6A0' }} />
              </div>
              Leçons
              <div className="ml-auto flex items-center gap-4 text-sm font-normal text-muted-foreground">
                {lessonStats.currentStreak > 0 && (
                  <span>🔥 {lessonStats.currentStreak} jours de suite</span>
                )}
                <span style={{ color: '#12C6A0', fontWeight: 700 }}>
                  {lessonStats.totalXp} XP
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                  {lessonStats.lessonsCompleted}
                </p>
                <p className="text-xs text-muted-foreground">Total leçons</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                  {lessonStats.lessonsThisWeek}
                </p>
                <p className="text-xs text-muted-foreground">Cette semaine</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: lessonStats.currentStreak > 0 ? '#B45309' : '#9CA3AF' }}>
                  {lessonStats.currentStreak > 0 ? `🔥 ${lessonStats.currentStreak}j` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Série actuelle</p>
              </div>
            </div>

            {lessonStats.recentLessons.length > 0 && (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dernières leçons
                </p>
                {lessonStats.recentLessons.map((lesson, i) => {
                  const minutes = Math.max(1, Math.round(lesson.timeSpentSeconds / 60));
                  const timeAgo = formatDistanceToNow(new Date(lesson.completedAt), {
                    addSuffix: true,
                    locale: fr,
                  });
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg p-3"
                      style={{ background: '#F3F6FA' }}
                    >
                      <div
                        className="rounded-lg p-2 flex-shrink-0"
                        style={{ background: '#F2FBF8', border: '0.5px solid #9FE1CB' }}
                      >
                        <BookOpen className="h-3.5 w-3.5" style={{ color: '#12C6A0' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {lesson.topicName}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {minutes} min
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
