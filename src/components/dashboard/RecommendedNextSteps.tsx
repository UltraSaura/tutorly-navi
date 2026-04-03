import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, ArrowRight, Clock } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Displays personalized topic recommendations on the student dashboard
 * Groups recommendations by subject
 * Shows up to 6 topics with mastery progress
 */
export function RecommendedNextSteps() {
  const navigate = useNavigate();
  const { data: recommendations = [], isLoading } = useRecommendations({ limit: 6 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show if no recommendations
  }

  // Group by subject
  const bySubject = recommendations.reduce((acc, rec) => {
    if (!acc[rec.subject_id]) {
      acc[rec.subject_id] = {
        subject_name: rec.subject_name,
        subject_color: rec.subject_color,
        topics: [],
      };
    }
    acc[rec.subject_id].topics.push(rec);
    return acc;
  }, {} as Record<string, { subject_name: string; subject_color: string; topics: typeof recommendations }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-500" />
          Recommended Next Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(bySubject).map(([subjectId, data]) => (
          <div key={subjectId} className="space-y-3">
            {/* Subject Header */}
            <div 
              className="flex items-center gap-2 pb-2 border-b"
              style={{ borderColor: data.subject_color }}
            >
              <h3 className="font-semibold" style={{ color: data.subject_color }}>
                {data.subject_name}
              </h3>
              <Badge variant="secondary">{data.topics.length} topics</Badge>
            </div>

            {/* Topic Cards */}
            <div className="space-y-2">
              {data.topics.slice(0, 3).map(topic => (
                <Card 
                  key={topic.topic_id}
                  className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                  style={{ borderLeftColor: data.subject_color }}
                  onClick={() => navigate(`/learning/${topic.subject_id}/${topic.topic_slug}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium mb-1 line-clamp-1">{topic.topic_name}</h4>
                        {topic.topic_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {topic.topic_description}
                          </p>
                        )}
                        
                        {/* Progress Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {topic.estimated_duration_minutes} min
                          </span>
                          <span>
                            {topic.mastered_objectives} of {topic.total_objectives} mastered
                          </span>
                        </div>
                        
                        {/* Mini Progress Bar */}
                        <Progress 
                          value={topic.mastery_ratio * 100} 
                          className="h-1 mt-2"
                        />
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
