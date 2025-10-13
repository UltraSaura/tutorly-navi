import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendIcon } from "./TrendIcon";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubjectProgress {
  name: string;
  progress: number;
  exercisesCompleted: number;
  totalExercises: number;
  successRate: number;
  trend: "up" | "down" | "flat";
  next?: string;
}

interface SubjectsGridProps {
  subjects: SubjectProgress[];
  childId: string;
}

export function SubjectsGrid({ subjects, childId }: SubjectsGridProps) {
  const navigate = useNavigate();

  const handleOpenSubject = (subjectName: string) => {
    navigate(`/guardian/child/${childId}/subject/${encodeURIComponent(subjectName)}`);
  };

  if (!subjects || subjects.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">No subject data available yet.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((subject, index) => (
        <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <Badge variant="outline">{subject.name}</Badge>
              <TrendIcon trend={subject.trend} />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{subject.successRate}%</span>
              <span className="text-sm text-muted-foreground">success rate</span>
            </div>

            <Progress value={subject.successRate} className="h-2" />

            <div className="text-sm text-muted-foreground">
              {subject.exercisesCompleted} of {subject.totalExercises} exercises completed
            </div>

            {subject.next && (
              <div className="text-sm">
                <span className="text-muted-foreground">Next: </span>
                <span className="font-medium">{subject.next}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1"
                onClick={() => handleOpenSubject(subject.name)}
              >
                Open
              </Button>
              <Button variant="outline" size="sm">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
