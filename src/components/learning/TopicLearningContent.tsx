import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Target, ClipboardList, GraduationCap } from 'lucide-react';
import { useTopicObjectives, useTasksForSuccessCriteria } from '@/hooks/useTopicObjectives';

interface TopicLearningContentProps {
  topicId: string;
}

export function TopicLearningContent({ topicId }: TopicLearningContentProps) {
  const { data: objectives = [], isLoading } = useTopicObjectives(topicId);
  
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
  
  if (objectives.length === 0) {
    return null; // Don't show anything if no objectives
  }
  
  return (
    <div className="space-y-6 p-4">
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
    </div>
  );
}
