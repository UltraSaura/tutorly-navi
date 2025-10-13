import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendIcon } from './TrendIcon';
import { Link } from 'react-router-dom';
import { BookOpen, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChildOverviewCardProps {
  id: string;
  name: string;
  successRate: number;
  exercisesThisWeek: number;
  latestSubject?: string;
  trend: "up" | "down" | "flat";
  needsAttention: boolean;
  lastActiveDate?: string;
}

export function ChildOverviewCard({
  id,
  name,
  successRate,
  exercisesThisWeek,
  latestSubject,
  trend,
  needsAttention,
  lastActiveDate,
}: ChildOverviewCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className={needsAttention ? "border-destructive/50" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              {lastActiveDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(lastActiveDate), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <TrendIcon trend={trend} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-sm font-bold">{successRate.toFixed(1)}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>This week</span>
          </div>
          <span className="font-semibold">{exercisesThisWeek} exercises</span>
        </div>

        {latestSubject && (
          <div className="text-sm">
            <span className="text-muted-foreground">Latest: </span>
            <span className="font-medium">{latestSubject}</span>
          </div>
        )}

        {needsAttention && (
          <Badge variant="destructive" className="w-full justify-center">
            Needs Attention
          </Badge>
        )}

        <Button asChild className="w-full" variant={needsAttention ? "default" : "outline"}>
          <Link to={`/guardian/child/${id}`}>
            View Dashboard
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
