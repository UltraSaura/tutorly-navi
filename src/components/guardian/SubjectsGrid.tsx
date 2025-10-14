import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GaugeScore } from "@/components/GaugeScore";

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

const getSubjectColor = (subjectName: string) => {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (name.includes('english')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (name.includes('history')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (name.includes('french')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
};

const getSuccessRateColor = (rate: number) => {
  if (rate >= 80) return 'text-green-600 dark:text-green-400';
  if (rate >= 70) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getTrendIcon = (trend: "up" | "down" | "flat") => {
  if (trend === "up") return <ArrowUp className="h-4 w-4 md:h-5 md:w-5" />;
  if (trend === "down") return <ArrowDown className="h-4 w-4 md:h-5 md:w-5" />;
  return <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />;
};

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {subjects.map((subject, index) => (
        <Card key={index} className="p-2.5 md:p-3.5 hover:shadow-lg transition-shadow">
          <div className="space-y-2.5 md:space-y-3">
            {/* Header: Badge and Gauge */}
            <div className="flex items-start justify-between">
              <Badge className={`${getSubjectColor(subject.name)} text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2 rounded-full border-0`}>
                {subject.name}
              </Badge>
              <GaugeScore
                value={subject.successRate}
                variant="mini"
                size={51}
                thickness={5}
                centerIndicator="emoji"
                className="shrink-0 -mt-0.5"
                label={subject.name}
                animate={true}
              />
            </div>
            
            {/* Progress Bar */}
            <Progress value={subject.successRate} className="h-2.5 md:h-3 bg-gray-200 dark:bg-gray-700" />

            {/* Next Information */}
            {subject.next && (
              <div className="text-sm md:text-base text-muted-foreground">
                Next: {subject.next}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-1.5 md:gap-2 pt-1">
              <Button 
                size="sm"
                className="rounded-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 px-10 md:px-14"
                onClick={() => handleOpenSubject(subject.name)}
              >
                Open
              </Button>
              <Button 
                size="sm"
                className="rounded-full bg-white text-black border-2 border-gray-300 hover:bg-gray-50 dark:bg-transparent dark:text-white dark:border-gray-600"
              >
                Message
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
