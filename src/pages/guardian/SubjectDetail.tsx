import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuardianAuth } from "@/hooks/useGuardianAuth";
import { useGuardianExerciseHistory } from "@/hooks/useGuardianExerciseHistory";
import GuardianLayout from "@/components/guardian/GuardianLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExercisesPanel } from "@/components/guardian/ExercisesPanel";
import { FocusAreasPanel } from "@/components/guardian/FocusAreasPanel";
import { TrendIcon } from "@/components/guardian/TrendIcon";
import { useGuardianProgress } from "@/hooks/useGuardianProgress";
import { Calendar, MessageCircle, Video } from "lucide-react";

export default function SubjectDetail() {
  const { childId, subjectId } = useParams<{ childId: string; subjectId: string }>();
  const { guardianId } = useGuardianAuth();

  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ['child', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*, users!inner(first_name, last_name)')
        .eq('id', childId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!childId,
  });

  const { exerciseHistory, loading: historyLoading } = useGuardianExerciseHistory({
    guardianId,
    childId,
    subjectId: decodeURIComponent(subjectId || ''),
  });

  const { data: progressData } = useGuardianProgress(guardianId, childId);

  const subjectProgress = progressData?.[0]?.subjects.find(
    s => s.name === decodeURIComponent(subjectId || '')
  );

  if (childLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const childName = child ? `${child.users.first_name} ${child.users.last_name}` : '';

  return (
    <div className="space-y-6">
        {/* Subject Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge variant="outline" className="mb-2">{decodeURIComponent(subjectId || '')}</Badge>
              <h1 className="text-2xl font-bold">{childName}</h1>
            </div>
            <TrendIcon trend={subjectProgress?.trend || "flat"} className="h-6 w-6" />
          </div>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-4xl font-bold">{subjectProgress?.successRate || 0}%</span>
            <span className="text-muted-foreground">overall success rate</span>
          </div>

          <Progress value={subjectProgress?.successRate || 0} className="h-3 mb-4" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Exercises completed:</span>
              <span className="ml-2 font-semibold">{subjectProgress?.exercisesCompleted || 0} / {subjectProgress?.totalExercises || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Success rate:</span>
              <span className="ml-2 font-semibold">{subjectProgress?.successRate || 0}%</span>
            </div>
          </div>
        </Card>

        {/* Focus Areas */}
        {progressData?.[0]?.subjects && (
          <FocusAreasPanel subjects={progressData[0].subjects} />
        )}

        {/* Exercises List */}
        <ExercisesPanel exercises={exerciseHistory} childId={childId || ''} />

        {/* Assignments Section (Placeholder) */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Assignments
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">Fractions Practice Sheet</div>
                <div className="text-sm text-muted-foreground">Due: Tomorrow</div>
              </div>
              <Badge variant="destructive">Needs review</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="font-medium">Chapter 5 Homework</div>
                <div className="text-sm text-muted-foreground">Due: Next week</div>
              </div>
              <Badge>Pending</Badge>
            </div>
          </div>
        </Card>

        {/* Teacher Feedback Section (Placeholder) */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Teacher Feedback
          </h3>
          <p className="text-muted-foreground mb-4">
            {childName} is making good progress in {decodeURIComponent(subjectId || '')}. 
            Continue practicing the fundamentals to build a strong foundation.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Teacher
            </Button>
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Schedule Call
            </Button>
          </div>
        </Card>
    </div>
  );
}
