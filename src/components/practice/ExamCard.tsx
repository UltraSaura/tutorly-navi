import { CalendarDays, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExamCardProps {
  title: string;
  year: number;
  subject: string;
  exerciseCount: number;
  onStart: () => void;
}

export function ExamCard({ title, year, subject, exerciseCount, onStart }: ExamCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold leading-tight">
            {year} · {subject}
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{title}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{year}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span>{t('practice.exam.exerciseCount', { count: exerciseCount })}</span>
          </div>
        </div>

        <Button className="w-full" size="sm" onClick={onStart}>
          {t('practice.exam.start')}
        </Button>
      </CardContent>
    </Card>
  );
}
