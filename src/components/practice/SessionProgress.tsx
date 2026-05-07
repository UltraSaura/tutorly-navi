import { Progress } from '@/components/ui/progress';

interface SessionProgressProps {
  current: number;
  total: number;
}

export function SessionProgress({ current, total }: SessionProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Exercise {Math.min(current, total)} / {total}
        </span>
        <span className="hidden sm:inline">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-1.5 opacity-80" />
    </div>
  );
}
