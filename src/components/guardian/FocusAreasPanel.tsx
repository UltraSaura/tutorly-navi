import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Play, Video } from "lucide-react";

interface FocusArea {
  topic: string;
  exercisesNeedingWork: number;
  successRate: number;
}

interface FocusAreasPanelProps {
  subjects: Array<{
    name: string;
    progress: number;
    exercisesCompleted: number;
    totalExercises: number;
    successRate: number;
  }>;
}

export function FocusAreasPanel({ subjects }: FocusAreasPanelProps) {
  const focusAreas: FocusArea[] = subjects
    .filter(s => s.successRate < 70)
    .map(s => ({
      topic: s.name,
      exercisesNeedingWork: s.totalExercises - s.exercisesCompleted,
      successRate: s.successRate
    }))
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 3);

  if (focusAreas.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold">Where to Focus</h3>
      </div>
      <div className="space-y-3">
        {focusAreas.map((area, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{area.topic}</div>
              <div className="text-sm text-muted-foreground">
                {area.exercisesNeedingWork} exercises need improvement • {area.successRate}% success rate
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-1" />
                Practice
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="h-4 w-4 mr-1" />
                Video
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
