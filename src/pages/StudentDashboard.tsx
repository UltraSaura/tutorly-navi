import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useStudentMasteryOverview } from '@/hooks/useObjectiveMastery';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { data: subjectOverview, isLoading } = useStudentMasteryOverview();
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6 max-w-6xl">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!subjectOverview || subjectOverview.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">No Learning Data Yet</h2>
            <p className="text-muted-foreground">
              Start learning to see your progress here
            </p>
            <Button onClick={() => navigate('/my-program')}>
              Go to My Program
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const overallMastery = Math.round(
    subjectOverview.reduce((sum, s) => sum + s.mastery_percentage, 0) / subjectOverview.length
  );
  
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Learning Dashboard</h1>
          <p className="text-muted-foreground">Track your mastery across all subjects</p>
        </div>
        <Button onClick={() => navigate('/my-program')}>
          <BookOpen className="mr-2 h-4 w-4" />
          My Program
        </Button>
      </div>
      
      {/* Overall Stats */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-primary">
              {overallMastery}%
            </div>
            <div className="flex-1">
              <Progress value={overallMastery} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {subjectOverview.reduce((sum, s) => sum + s.mastered_objectives, 0)} objectives mastered across {subjectOverview.length} subjects
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Subject Cards */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Progress by Subject
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectOverview.map(subject => (
            <Card 
              key={subject.subject_id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              style={{ borderTop: `4px solid ${subject.subject_color}` }}
              onClick={() => navigate(`/learning/${subject.subject_id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{subject.subject_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Circle */}
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="8"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={subject.subject_color}
                        strokeWidth="8"
                        strokeDasharray={`${subject.mastery_percentage * 2.51} 251`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold" style={{ color: subject.subject_color }}>
                        {subject.mastery_percentage}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mastered:</span>
                    <span className="font-medium">{subject.mastered_objectives} / {subject.total_objectives}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Progress:</span>
                    <span className="font-medium">{subject.in_progress_objectives}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
