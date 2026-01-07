import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTopicNextSteps } from '@/hooks/useRecommendations';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface NextStepsRecommendationsProps {
  currentTopicId: string;
  currentSubdomainId?: string;
}

/**
 * Displays "What to do after this topic" recommendations
 * Prefers topics in the same subdomain
 * Shows up to 3 recommended topics with mastery summary
 */
export function NextStepsRecommendations({
  currentTopicId,
  currentSubdomainId,
}: NextStepsRecommendationsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: recommendations = [], isLoading } = useTopicNextSteps(
    currentTopicId,
    currentSubdomainId
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show if no recommendations
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          {t('topic.whatToDoAfter')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map(topic => (
            <Card
              key={topic.topic_id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/learning/${topic.subject_id}/${topic.topic_slug}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-1">{topic.topic_name}</h4>
                    {topic.subdomain_id && (
                      <Badge variant="outline" className="mb-2 text-xs">
                        {t('topic.sameArea')}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t('topic.masteredObjectives', { 
                        mastered: topic.mastered_objectives, 
                        total: topic.total_objectives 
                      })}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
