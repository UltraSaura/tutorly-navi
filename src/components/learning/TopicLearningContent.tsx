import { useState } from 'react';
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
import { cn } from '@/lib/utils';

interface TopicLearningContentProps {
  topicId: string;
}

export function TopicLearningContent({ topicId }: TopicLearningContentProps) {
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
    return <div className="p-4 text-center text-muted-foreground">Loading learning content...</div>;
  }
  
  return (
    <div className="space-y-6 p-4">
      {/* Full Lesson - Now Collapsible */}
      <Collapsible open={lessonOpen} onOpenChange={setLessonOpen} className="my-3">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Full Lesson
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
              <LessonContentStudent topicId={topicId} />
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
                Your Progress in This Topic
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
                  {masteryProgress.mastered_objectives} of {masteryProgress.total_objectives} objectives mastered
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
                        {obj.status === 'mastered' ? 'Mastered' : 
                         obj.status === 'in_progress' ? `${obj.score_percent}%` : 
                         'Not started'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* (A) What You Will Learn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            What You Will Learn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {objectives.map((objective) => (
              <li key={objective.id} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <Badge variant="outline" className="mb-1">{objective.id}</Badge>
                  <p className="text-sm">{objective.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      {/* (B) Success Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Success Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {objectives.map((objective) => (
            objective.success_criteria && objective.success_criteria.length > 0 && (
              <div key={objective.id} className="mb-4 last:mb-0">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Badge variant="secondary">{objective.id}</Badge>
                  {objective.text}
                </h4>
                <ul className="space-y-2 ml-6">
                  {objective.success_criteria.map((criterion) => (
                    <li key={criterion.id} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{criterion.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </CardContent>
      </Card>
      
      {/* (C) Practice Tasks */}
      {practiceTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Practice ({practiceTasks.length} tasks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {practiceTasks.map((task, index) => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">Practice {index + 1}</Badge>
                      <Badge variant="secondary">{task.id}</Badge>
                    </div>
                    <p className="text-sm mb-3">{task.stem}</p>
                    <Button size="sm" variant="outline">
                      Start Practice
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
              Exit Ticket ({exitTasks.length} questions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Complete these questions to demonstrate your mastery of this topic
            </p>
            <div className="space-y-3">
              {exitTasks.slice(0, 3).map((task, index) => (
                <Card key={task.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">Question {index + 1}</Badge>
                      <Badge variant="secondary">{task.id}</Badge>
                    </div>
                    <p className="text-sm mb-3">{task.stem}</p>
                    <Button size="sm" variant="outline">
                      Answer Question
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
