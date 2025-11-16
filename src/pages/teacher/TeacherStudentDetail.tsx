import { useParams, useNavigate } from 'react-router-dom';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWeakestSubdomains } from '@/lib/progressService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .single();
      return data;
    },
    enabled: !!studentId,
  });

  const { data: progress, isLoading } = useStudentProgress(studentId);

  const { data: weaknesses = [] } = useQuery({
    queryKey: ['student-weaknesses', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      return getWeakestSubdomains(studentId, 5);
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {student?.first_name} {student?.last_name}
          </h1>
          <p className="text-muted-foreground">
            Level: {student?.curriculum_level_code} | Country: {student?.curriculum_country_code}
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={(progress?.overall_mastery_ratio || 0) * 100} className="mb-2" />
          <p className="text-sm text-muted-foreground">
            {Math.round((progress?.overall_mastery_ratio || 0) * 100)}% of objectives mastered
          </p>
        </CardContent>
      </Card>

      {/* Areas Needing Attention */}
      {weaknesses.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Areas Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weaknesses.map(weakness => (
                <div key={weakness.subdomain_id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div>
                    <p className="font-medium">{weakness.subdomain_name}</p>
                    <p className="text-sm text-muted-foreground">{weakness.subject_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{Math.round(weakness.mastery_ratio * 100)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {weakness.mastered_objectives}/{weakness.total_objectives} mastered
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Subject Progress with Recommendations */}
      {progress?.subjects.map(subject => (
        <Card key={subject.subject_id}>
          <CardHeader>
            <CardTitle style={{ color: subject.subject_color }}>
              {subject.subject_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Progress value={subject.mastery_ratio * 100} />
              <p className="text-sm text-muted-foreground mt-1">
                {subject.mastered_objectives} of {subject.total_objectives} objectives mastered
              </p>
            </div>

            <RecommendedTopicsSection 
              studentId={studentId!} 
              subjectId={subject.subject_id}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecommendedTopicsSection({ studentId, subjectId }: { studentId: string; subjectId: string }) {
  const { data: recommendations = [] } = useRecommendations({ 
    subjectId, 
    limit: 3 
  });
  
  const navigate = useNavigate();

  if (recommendations.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold mb-2">Recommended Next Topics</h4>
      <div className="space-y-2">
        {recommendations.map(topic => (
          <Card 
            key={topic.topic_id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/learning/${topic.subject_id}/${topic.topic_slug}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{topic.topic_name}</p>
                  {topic.subdomain_name && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {topic.subdomain_name}
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {topic.mastered_objectives}/{topic.total_objectives} objectives mastered
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
