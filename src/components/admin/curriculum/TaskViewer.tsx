import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurriculumLocation } from './CurriculumLocation';

interface Task {
  id: string;
  type: string;
  stem: string;
  solution?: string;
  subject_id?: string | null;
  domain_id?: string | null;
  subdomain_id?: string | null;
  skill_id?: string | null;
}

interface TaskViewerProps {
  successCriterionId: string;
  countryId: string;
}

export function TaskViewer({ successCriterionId, countryId }: TaskViewerProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', successCriterionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('success_criterion_id', successCriterionId);
      
      if (error) throw error;
      return data as Task[];
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading tasks...</p>;
  }

  if (!tasks || tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks defined</p>;
  }

  return (
    <div className="space-y-3 mt-2">
      {tasks.map((task) => (
        <Card key={task.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Task: {task.type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">{task.stem}</div>
            
            {/* Curriculum Location */}
            <div className="p-2 bg-muted/50 rounded-md border border-border">
              <div className="text-xs font-semibold mb-1 text-muted-foreground uppercase">
                Curriculum Location
              </div>
              <CurriculumLocation
                countryId={countryId}
                levelId={null}
                subjectId={task.subject_id}
                domainId={task.domain_id}
                subdomainId={task.subdomain_id}
                locale="en"
                variant="compact"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
