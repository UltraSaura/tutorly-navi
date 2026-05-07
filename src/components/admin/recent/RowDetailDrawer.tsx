import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle } from 'lucide-react';
import { evaluateRow, type AdminTable } from '@/lib/admin/rowHealth';
import { StatusBadge } from './StatusBadge';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: AdminTable | null;
  row: any | null;
}

export function RowDetailDrawer({ open, onOpenChange, table, row }: Props) {
  if (!row || !table) return null;
  const health = evaluateRow(table, row);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-mono text-sm truncate">
              {row.id ?? row.id_new ?? '—'}
            </SheetTitle>
            <StatusBadge status={health.status} />
          </div>
          <SheetDescription>
            <Badge variant="outline" className="font-mono">{table}</Badge>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4 pr-4">
          {health.checks.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Validation
              </div>
              <ul className="space-y-1">
                {health.checks.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-state-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className={c.ok ? 'text-foreground' : 'text-destructive'}>
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
              {(health.issues.length > 0 || health.warnings.length > 0) && (
                <div className="mt-3 p-3 rounded-md bg-muted/50 border space-y-1">
                  {health.issues.map((iss, i) => (
                    <div key={`i-${i}`} className="text-xs text-destructive">✗ {iss}</div>
                  ))}
                  {health.warnings.map((w, i) => (
                    <div key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400">⚠ {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Raw row
            </div>
            <pre className="text-xs bg-muted/50 border rounded-md p-3 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(row, null, 2)}
            </pre>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
