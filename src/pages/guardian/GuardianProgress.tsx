import { useState } from 'react';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useGuardianProgress } from '@/hooks/useGuardianProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, BookOpen, Award, Loader2 } from 'lucide-react';

interface ChildProgress {
  id: string;
  name: string;
  overallProgress: number;
  subjects: Array<{
    name: string;
    progress: number;
    exercisesCompleted: number;
    totalExercises: number;
  }>;
  recentAchievements: Array<{
    title: string;
    date: string;
  }>;
}

export default function GuardianProgress() {
  const { guardianId } = useGuardianAuth();
  const [selectedChild, setSelectedChild] = useState<string>('all');

  // Fetch children
  const { data: children } = useQuery({
    queryKey: ['guardian-children', guardianId],
    queryFn: async () => {
      if (!guardianId) return [];
      
      const { data, error } = await supabase
        .from('guardian_child_links')
        .select(`
          child_id,
          children!inner(
            id,
            user_id,
            users!inner(first_name, last_name)
          )
        `)
        .eq('guardian_id', guardianId);
      
      if (error) throw error;
      
      return data.map((link: any) => ({
        id: link.children.id,
        name: `${link.children.users.first_name} ${link.children.users.last_name}`,
      }));
    },
    enabled: !!guardianId,
  });

  // Fetch REAL progress data
  const { data: progressData, isLoading } = useGuardianProgress(
    guardianId,
    selectedChild === 'all' ? undefined : selectedChild
  );

  const currentData = selectedChild === 'all' 
    ? progressData?.[0] 
    : progressData?.find(p => p.id === selectedChild);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Learning Progress</h1>
          <p className="text-muted-foreground mt-1">
            Track your children's academic journey
          </p>
        </div>
        
        {children && children.length > 1 && (
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Children</SelectItem>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Overall Progress Card */}
      {currentData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Overall Progress
              </CardTitle>
              <CardDescription>
                {currentData.name}'s learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span className="font-medium">{currentData.overallProgress}%</span>
                </div>
                <Progress value={currentData.overallProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Subject Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Subject Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentData.subjects.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {subject.exercisesCompleted} / {subject.totalExercises} exercises
                    </span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentData.recentAchievements.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!children || children.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No children added yet. Add children to track their progress.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

