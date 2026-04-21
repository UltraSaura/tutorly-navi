import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RowStatus, RowHealth } from '@/lib/admin/rowHealth';
import { STATUS_LABEL } from '@/lib/admin/rowHealth';

const STATUS_CLASS: Record<RowStatus, string> = {
  ok: 'bg-success/15 text-success border-success/30 hover:bg-success/20',
  partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
  issue: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const ICON: Record<RowStatus, string> = {
  ok: '●',
  partial: '●',
  issue: '●',
  unknown: '○',
};

interface Props {
  status: RowStatus;
  health?: RowHealth;
  className?: string;
}

export function StatusBadge({ status, health, className }: Props) {
  const badge = (
    <Badge
      variant="outline"
      className={cn('font-medium gap-1.5 cursor-default', STATUS_CLASS[status], className)}
    >
      <span aria-hidden>{ICON[status]}</span>
      {STATUS_LABEL[status]}
    </Badge>
  );

  if (!health || (health.issues.length === 0 && health.warnings.length === 0)) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1 text-xs">
          {health.issues.map((iss, i) => (
            <div key={`i-${i}`} className="text-destructive">✗ {iss}</div>
          ))}
          {health.warnings.map((w, i) => (
            <div key={`w-${i}`} className="text-amber-500">⚠ {w}</div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
