import { useParams, useNavigate } from 'react-router-dom';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChildDetailPage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  
  const { data: child } = useQuery({
    queryKey: ['child', childId],
    queryFn: async () => {
      const { data } = await supabase
        .from('children')
        .select('*, users!inner(*)')
        .eq('id', childId)
        .single();
      return data;
    },
    enabled: !!childId,
  });

  const { data: progress, isLoading } = useStudentProgress(child?.user_id);

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
        <Button variant="ghost" size="icon" onClick={() => navigate('/guardian')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {child?.users.first_name} {child?.users.last_name}
          </h1>
          <p className="text-muted-foreground">
            Level: {child?.curriculum_level_code} | Country: {child?.curriculum_country_code}
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={(progress?.overall_mastery_ratio || 0) * 100} />
          <p className="text-sm text-muted-foreground mt-2">
            {Math.round((progress?.overall_mastery_ratio || 0) * 100)}% mastered
          </p>
        </CardContent>
      </Card>

      {/* Per-Subject Progress */}
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
              studentId={child?.user_id} 
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {topic.estimated_duration_minutes} min
                    </span>
                    <span>
                      {topic.mastered_objectives}/{topic.total_objectives} mastered
                    </span>
                  </div>
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
