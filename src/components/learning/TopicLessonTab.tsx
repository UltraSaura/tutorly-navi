import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Target, 
  GraduationCap, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useTopicObjectives, useTasksForSuccessCriteria } from '@/hooks/useTopicObjectives';
import { useTopicMastery } from '@/hooks/useObjectiveMastery';
import { LessonContentStudent } from './LessonContentStudent';
import { NextStepsRecommendations } from './NextStepsRecommendations';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { LessonContent } from '@/types/learning';

interface TopicLessonTabProps {
  topicId: string;
  lessonContent?: LessonContent | null;
}

export function TopicLessonTab({ topicId, lessonContent }: TopicLessonTabProps) {
  const { t } = useTranslation();
  const { data: objectives = [], isLoading } = useTopicObjectives(topicId);
  const { data: masteryProgress, isLoading: masteryLoading } = useTopicMastery(topicId);
  
  // Extract all success criterion IDs
  const successCriteriaIds = objectives.flatMap(
    obj => obj.success_criteria?.map(sc => sc.id) || []
  );
  
  const { data: tasks = [] } = useTasksForSuccessCriteria(successCriteriaIds);
  
  // Group tasks by type
  const practiceTasks = tasks.filter(t => t.type === 'practice');
  const exitTasks = tasks.filter(t => t.type === 'exit');

  // Generate TL;DR summary from lesson content
  const tldrSummary = lessonContent?.explanation
    ? extractKeyPoints(lessonContent.explanation, 5)
    : null;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t('topic.loadingContent')}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* TL;DR Summary */}
      {tldrSummary && tldrSummary.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('topic.tldr')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tldrSummary.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Full Lesson Content */}
      <ErrorBoundary
        fallback={
          <div className="p-4 text-center text-muted-foreground">
            Unable to load lesson content. Please try refreshing.
          </div>
        }
      >
        <LessonContentStudent topicId={topicId} />
      </ErrorBoundary>

      {/* Progress Section */}
      {!masteryLoading && masteryProgress && masteryProgress.total_objectives > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {t('topic.yourProgress')}
              </span>
              <span className="text-2xl font-bold">
                {masteryProgress.mastery_percentage}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {t('topic.objectivesMastered', { 
                    mastered: masteryProgress.mastered_objectives, 
                    total: masteryProgress.total_objectives 
                  })}
                </span>
              </div>
              <Progress value={masteryProgress.mastery_percentage} className="h-2" />
            </div>
            
            <div className="space-y-2">
              {masteryProgress.objectives.map(obj => (
                <div key={obj.objective_id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  {obj.status === 'mastered' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : obj.status === 'in_progress' ? (
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{obj.objective_text}</span>
                      <Badge 
                        variant={
                          obj.status === 'mastered' ? 'default' : 
                          obj.status === 'in_progress' ? 'secondary' : 
                          'outline'
                        }
                        className="text-xs"
                      >
                        {obj.status === 'mastered' ? t('topic.statusMastered') : 
                         obj.status === 'in_progress' ? `${obj.score_percent}%` : 
                         t('roadmap.notStarted')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practice Tasks */}
      {practiceTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {t('topic.practiceTasks', { count: practiceTasks.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {practiceTasks.map((task, index) => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">{t('topic.practiceNumber', { number: index + 1 })}</Badge>
                    </div>
                    <p className="text-sm mb-3">{task.stem}</p>
                    <Button size="sm" variant="outline">
                      {t('topic.startPractice')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exit Ticket */}
      {exitTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('topic.exitTicket', { count: exitTasks.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('topic.exitTicketDescription')}
            </p>
            <div className="space-y-3">
              {exitTasks.slice(0, 3).map((task, index) => (
                <Card key={task.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">{t('topic.questionNumber', { number: index + 1 })}</Badge>
                    </div>
                    <p className="text-sm mb-3">{task.stem}</p>
                    <Button size="sm" variant="outline">
                      {t('topic.answerQuestion')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {objectives.length > 0 && (
        <NextStepsRecommendations 
          currentTopicId={topicId}
          currentSubdomainId={objectives[0]?.subdomain_id}
        />
      )}
    </div>
  );
}

// Helper function to extract key points from text
function extractKeyPoints(text: string, maxPoints: number): string[] {
  // Split by sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 150);
  
  // Take first N meaningful sentences as key points
  return sentences.slice(0, maxPoints);
}
