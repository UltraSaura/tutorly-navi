import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherClasses() {
  const { data: classes = [], isLoading } = useTeacherClasses();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-muted-foreground">Manage and view all your classes</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Class
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <Card 
            key={cls.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/teacher/classes/${cls.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{cls.name}</span>
                <Users className="w-5 h-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Students:</span>
                <span className="font-medium">{cls.student_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Level:</span>
                <span className="font-medium">{cls.level_code || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Year:</span>
                <span className="font-medium">{cls.school_year || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
            <p className="text-muted-foreground mb-4">Create your first class to get started</p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
