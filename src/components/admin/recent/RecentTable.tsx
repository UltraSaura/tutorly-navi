import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { evaluateRow, type AdminTable } from '@/lib/admin/rowHealth';
import { StatusBadge } from './StatusBadge';

export interface ColumnDef {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  className?: string;
}

interface Props {
  table: AdminTable;
  rows: any[] | undefined;
  columns: ColumnDef[];
  isLoading?: boolean;
  issuesOnly?: boolean;
  onRowClick?: (row: any) => void;
}

const truncate = (s: string | null | undefined, n = 80) => {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n) + '…' : s;
};

export const fmtTruncate = truncate;

export function RecentTable({ table, rows, columns, isLoading, issuesOnly, onRowClick }: Props) {
  const enriched = useMemo(() => {
    return (rows ?? []).map(r => ({ row: r, health: evaluateRow(table, r) }));
  }, [rows, table]);

  const visible = useMemo(() => {
    if (!issuesOnly) return enriched;
    return enriched.filter(({ health }) => health.status === 'issue' || health.status === 'partial');
  }, [enriched, issuesOnly]);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {issuesOnly ? 'No rows with issues — all good!' : 'No rows found.'}
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Status</TableHead>
            {columns.map(c => (
              <TableHead key={c.key} className={c.className}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map(({ row, health }, i) => (
            <TableRow
              key={row.id ?? row.id_new ?? i}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick?.(row)}
            >
              <TableCell>
                <StatusBadge status={health.status} health={health} />
              </TableCell>
              {columns.map(c => (
                <TableCell key={c.key} className={c.className}>
                  {c.render ? c.render(row) : truncate(String(row[c.key] ?? '—'))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
