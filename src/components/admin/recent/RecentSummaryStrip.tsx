import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, Filter } from 'lucide-react';

interface Props {
  counts: Record<string, number> | undefined;
  health: { ok: number; partial: number; issue: number };
  issuesOnly: boolean;
  onToggleIssues: () => void;
}

export function RecentSummaryStrip({ counts, health, issuesOnly, onToggleIssues }: Props) {
  return (
    <div className="space-y-4">
      {/* Health summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Recent rows health (last 50 per table)
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-state-success" />
                  <span className="text-2xl font-bold">{health.ok}</span>
                  <span className="text-sm text-muted-foreground">OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold">{health.partial}</span>
                  <span className="text-sm text-muted-foreground">Partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-bold">{health.issue}</span>
                  <span className="text-sm text-muted-foreground">Issues</span>
                </div>
              </div>
            </div>

            <Button
              variant={issuesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleIssues}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {issuesOnly ? 'Showing issues only' : 'View issues only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Total counts */}
      {counts && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-3">
              Total rows
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.entries(counts).map(([table, count]) => (
                <div key={table} className="text-center p-2 rounded-md bg-muted/40">
                  <div className="text-lg font-bold">{count.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {table.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
