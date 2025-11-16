import { useParams, useNavigate } from 'react-router-dom';
import { useClassStudents } from '@/hooks/useClassStudents';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useClassStudents(classId);

  const { data: classInfo } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();
      return data;
    },
    enabled: !!classId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/classes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{classInfo?.name}</h1>
            <p className="text-muted-foreground">
              {students.length} students | {classInfo?.level_code}
            </p>
          </div>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Class Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students enrolled yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Overall Progress</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student: any) => (
                    <TableRow 
                      key={student.student_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/teacher/students/${student.student_id}`)}
                    >
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.level_code || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <MasteryCell mastery={student.progress?.overall_mastery_ratio} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MasteryCell({ mastery }: { mastery?: number }) {
  if (mastery === undefined) return <span className="text-muted-foreground">-</span>;
  
  const percent = Math.round(mastery * 100);
  return (
    <div className="flex items-center gap-2">
      <Progress value={percent} className="w-16 h-2" />
      <span className="text-sm font-medium">{percent}%</span>
    </div>
  );
}
