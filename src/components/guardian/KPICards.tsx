import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

export function KPICards() {
  // Mock data for now - in Phase 4, this would come from real attendance tracking
  const attendance = {
    present: 18,
    late: 2,
    absent: 1,
  };

  const total = attendance.present + attendance.late + attendance.absent;
  const attendanceRate = Math.round((attendance.present / total) * 100);

  const kpis = [
    {
      label: 'Attendance',
      value: `${attendanceRate}%`,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Late',
      value: attendance.late,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Absent',
      value: attendance.absent,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
