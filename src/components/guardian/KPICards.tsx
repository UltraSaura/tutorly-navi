import { Card } from '@/components/ui/card';
import { BookOpenCheck, CheckCircle, ListChecks, Trophy } from 'lucide-react';

interface KPICardsProps {
  exercisesCompleted: number;
  correctExercises: number;
  totalAttempts: number;
  successRate: number;
  quizzesCompleted?: number;
  bestQuizScore?: number | null;
}

export function KPICards({
  exercisesCompleted,
  correctExercises,
  totalAttempts,
  successRate,
  quizzesCompleted = 0,
  bestQuizScore = null,
}: KPICardsProps) {
  const kpis = [
    {
      label: 'Exercises',
      value: exercisesCompleted,
      icon: BookOpenCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Correct',
      value: correctExercises,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Attempts',
      value: totalAttempts,
      icon: ListChecks,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Success',
      value: `${Math.round(successRate)}%`,
      icon: Trophy,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Quizzes',
      value: quizzesCompleted,
      icon: ListChecks,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Best Quiz',
      value: bestQuizScore === null ? 'N/A' : `${Math.round(bestQuizScore)}%`,
      icon: Trophy,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-2 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`p-1.5 md:p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-4 w-4 md:h-5 md:w-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
