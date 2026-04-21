import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { History, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  useRecentSubjects, useRecentDomains, useRecentSubdomains,
  useRecentObjectives, useRecentSuccessCriteria, useRecentTasks,
  useRecentLessons, useRecentTopics, useTableCounts,
  type SinceFilter,
} from '@/hooks/admin/useRecentUpdates';
import { evaluateRow, type AdminTable } from '@/lib/admin/rowHealth';
import { RecentSummaryStrip } from '@/components/admin/recent/RecentSummaryStrip';
import { RecentTable, fmtTruncate, type ColumnDef } from '@/components/admin/recent/RecentTable';
import { RowDetailDrawer } from '@/components/admin/recent/RowDetailDrawer';
import { PageMeta } from '@/components/seo/PageMeta';

const TABS: { value: AdminTable; label: string }[] = [
  { value: 'subjects', label: 'Subjects' },
  { value: 'domains', label: 'Domains' },
  { value: 'subdomains', label: 'Subdomains' },
  { value: 'objectives', label: 'Objectives' },
  { value: 'success_criteria', label: 'Success criteria' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'lessons', label: 'Lessons' },
  { value: 'topics', label: 'Topics' },
];

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
};

export default function RecentUpdates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [since, setSince] = useState<SinceFilter>('24h');
  const [search, setSearch] = useState('');
  const [issuesOnly, setIssuesOnly] = useState(searchParams.get('filter') === 'issues');
  const [activeTab, setActiveTab] = useState<AdminTable>('objectives');
  const [selected, setSelected] = useState<{ table: AdminTable; row: any } | null>(null);

  const args = { since, search };
  const subjects = useRecentSubjects(args);
  const domains = useRecentDomains(args);
  const subdomains = useRecentSubdomains(args);
  const objectives = useRecentObjectives(args);
  const successCriteria = useRecentSuccessCriteria(args);
  const tasks = useRecentTasks(args);
  const lessons = useRecentLessons(args);
  const topics = useRecentTopics(args);
  const counts = useTableCounts();

  const dataByTable: Record<AdminTable, any[] | undefined> = {
    subjects: subjects.data,
    domains: domains.data,
    subdomains: subdomains.data,
    objectives: objectives.data,
    success_criteria: successCriteria.data,
    tasks: tasks.data,
    lessons: lessons.data,
    topics: topics.data,
    videos: undefined,
  };

  const loadingByTable: Record<AdminTable, boolean> = {
    subjects: subjects.isLoading,
    domains: domains.isLoading,
    subdomains: subdomains.isLoading,
    objectives: objectives.isLoading,
    success_criteria: successCriteria.isLoading,
    tasks: tasks.isLoading,
    lessons: lessons.isLoading,
    topics: topics.isLoading,
    videos: false,
  };

  // Aggregate health across all loaded rows
  const healthSummary = useMemo(() => {
    let ok = 0, partial = 0, issue = 0;
    (Object.entries(dataByTable) as [AdminTable, any[] | undefined][]).forEach(([t, rows]) => {
      (rows ?? []).forEach(r => {
        const s = evaluateRow(t, r).status;
        if (s === 'ok') ok++;
        else if (s === 'partial') partial++;
        else if (s === 'issue') issue++;
      });
    });
    return { ok, partial, issue };
  }, [subjects.data, domains.data, subdomains.data, objectives.data, successCriteria.data, tasks.data, lessons.data, topics.data]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['recent'] });
  };

  const handleToggleIssues = () => {
    const next = !issuesOnly;
    setIssuesOnly(next);
    if (next) setSearchParams({ filter: 'issues' });
    else setSearchParams({});
  };

  const columns: Record<AdminTable, ColumnDef[]> = {
    subjects: [
      { key: 'name', label: 'Name' },
      { key: 'slug', label: 'Slug', render: r => <code className="text-xs">{r.slug}</code> },
      { key: 'country_code', label: 'Country', render: r => <Badge variant="outline">{r.country_code ? String(r.country_code).toUpperCase() : '—'}</Badge> },
      { key: 'level', label: 'Level', render: r => (
        <Badge variant="outline">{r.level ? String(r.level).toUpperCase() : '—'}</Badge>
      ) },
      { key: 'language', label: 'Language', render: r => <Badge variant="outline">{r.language ? String(r.language).toUpperCase() : '—'}</Badge> },
      { key: 'updated_at', label: 'Updated', render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</span> },
    ],
    domains: [
      { key: 'label', label: 'Label' },
      { key: 'code', label: 'Code', render: r => <code className="text-xs">{r.code ?? '—'}</code> },
      { key: 'domain', label: 'Domain' },
    ],
    subdomains: [
      { key: 'label', label: 'Label' },
      { key: 'code', label: 'Code', render: r => <code className="text-xs">{r.code ?? '—'}</code> },
      { key: 'subdomain', label: 'Subdomain' },
    ],
    objectives: [
      { key: 'id', label: 'ID', render: r => <code className="text-xs">{r.id}</code> },
      { key: 'level', label: 'Level', render: r => <Badge variant="outline">{r.level}</Badge> },
      { key: 'text', label: 'Text', render: r => fmtTruncate(r.text, 100) },
    ],
    success_criteria: [
      { key: 'id', label: 'ID', render: r => <code className="text-xs">{r.id}</code> },
      { key: 'objective_id', label: 'Objective', render: r => <code className="text-xs">{r.objective_id ?? '—'}</code> },
      { key: 'text', label: 'Text', render: r => fmtTruncate(r.text, 100) },
    ],
    tasks: [
      { key: 'id', label: 'ID', render: r => <code className="text-xs">{r.id}</code> },
      { key: 'type', label: 'Type', render: r => <Badge variant="secondary">{r.type}</Badge> },
      { key: 'stem', label: 'Stem', render: r => fmtTruncate(r.stem, 80) },
    ],
    lessons: [
      { key: 'id', label: 'ID', render: r => <code className="text-xs">{r.id}</code> },
      { key: 'title', label: 'Title' },
      { key: 'topic_id', label: 'Topic', render: r => <code className="text-xs">{r.topic_id ?? '—'}</code> },
    ],
    topics: [
      { key: 'name', label: 'Name' },
      { key: 'slug', label: 'Slug', render: r => <code className="text-xs">{r.slug}</code> },
      { key: 'updated_at', label: 'Updated', render: r => <span className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</span> },
    ],
    videos: [],
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-7 w-7" />
            Recent Updates
          </h1>
          <p className="text-muted-foreground">
            See what's been imported or changed recently, and spot rows with missing data.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <RecentSummaryStrip
        counts={counts.data}
        health={healthSummary}
        issuesOnly={issuesOnly}
        onToggleIssues={handleToggleIssues}
      />

      <Card>
        <CardHeader>
          <CardTitle>Browse changes</CardTitle>
          <CardDescription>
            Each row is validated client-side: required fields, FK resolution, and link integrity.
            Click a row to see its raw data and validation breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="since">Show changes since</Label>
              <Select value={since} onValueChange={(v) => setSince(v as SinceFilter)}>
                <SelectTrigger id="since"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by id, name, text, code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTable)}>
            <TabsList className="flex flex-wrap h-auto">
              {TABS.map(t => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
            {TABS.map(t => (
              <TabsContent key={t.value} value={t.value} className="mt-4">
                <RecentTable
                  table={t.value}
                  rows={dataByTable[t.value]}
                  columns={columns[t.value]}
                  isLoading={loadingByTable[t.value]}
                  issuesOnly={issuesOnly}
                  onRowClick={(row) => setSelected({ table: t.value, row })}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <RowDetailDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        table={selected?.table ?? null}
        row={selected?.row ?? null}
      />
    </div>
  );
}
