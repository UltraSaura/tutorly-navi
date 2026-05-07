import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, Target, ClipboardList, GraduationCap, CheckCircle, Circle, Clock, ChevronDown, BookOpen } from 'lucide-react';
import { useTopicObjectives, useTasksForSuccessCriteria } from '@/hooks/useTopicObjectives';
import { useTopicMastery } from '@/hooks/useObjectiveMastery';
import { NextStepsRecommendations } from './NextStepsRecommendations';
import { LessonContentStudent } from './LessonContentStudent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

interface TopicLearningContentProps {
  topicId: string;
}

export function TopicLearningContent({ topicId }: TopicLearningContentProps) {
  const { t } = useTranslation();
  const [lessonOpen, setLessonOpen] = useState(true);
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
  
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">{t('topic.loadingContent')}</div>;
  }
  
  return (
    <div className="space-y-6 p-4">
      {/* Full Lesson - Now Collapsible */}
      <Collapsible open={lessonOpen} onOpenChange={setLessonOpen} className="my-3">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {t('topic.fullLesson')}
            </h3>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-foreground transition-transform',
                lessonOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4">
              <ErrorBoundary
                fallback={
                  <div className="p-4 text-center text-muted-foreground">
                    Unable to load lesson content. Please try refreshing.
                  </div>
                }
              >
                <LessonContentStudent topicId={topicId} />
              </ErrorBoundary>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      
      {/* Only show objectives/progress sections if objectives exist */}
      {objectives.length > 0 && (
        <>
      
      {/* Your Progress Section */}
      {!masteryLoading && masteryProgress && masteryProgress.total_objectives > 0 && (
        <Card className="bg-primary/5 border-primary/20">
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
            {/* Overall Progress Bar */}
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
            
            {/* Objective-by-Objective Status */}
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
      
      
      {/* (C) Practice Tasks */}
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
                      <Badge variant="secondary">{task.id}</Badge>
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
      
      {/* (D) Exit Ticket */}
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
                      <Badge variant="secondary">{task.id}</Badge>
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

        {/* What to do after this topic */}
        <NextStepsRecommendations 
          currentTopicId={topicId}
          currentSubdomainId={objectives[0]?.subdomain_id}
        />
        </>
      )}
    </div>
  );
}
