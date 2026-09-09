import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, RotateCcw } from 'lucide-react';

interface ResultsSummaryProps {
  totalExercises: number;
  correctExercises: number;
  totalAttempts: number;
  successRate: number;
}

export default function ResultsSummary({
  totalExercises,
  correctExercises,
  totalAttempts,
  successRate,
}: ResultsSummaryProps) {
  const ui = useInterfaceTranslation();
  const incorrectExercises = totalExercises - correctExercises;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{ui("Total Exercises")}</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalExercises}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{ui("Correct")}</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{correctExercises}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{ui("Incorrect")}</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{incorrectExercises}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{ui("Success Rate")}</CardTitle>
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successRate}%</div>
          <p className="text-xs text-muted-foreground">{totalAttempts} {ui("total attempts")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
