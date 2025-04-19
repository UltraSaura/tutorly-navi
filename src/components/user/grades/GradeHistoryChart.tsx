
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Exercise } from '@/types/chat';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ChartScatter } from 'lucide-react';

interface GradePoint {
  date: string;
  grade: number;
}

interface GradeHistoryChartProps {
  exercises: Exercise[];
}

const GradeHistoryChart = ({ exercises }: GradeHistoryChartProps) => {
  // Process exercises to create grade history data points
  const gradeHistory: GradePoint[] = exercises
    .filter(ex => ex.isCorrect !== undefined)
    .reduce((acc: GradePoint[], _, index, filtered) => {
      const subset = filtered.slice(0, index + 1);
      const correct = subset.filter(ex => ex.isCorrect).length;
      const total = subset.length;
      const grade = Math.round((correct / total) * 100);
      
      return [...acc, {
        date: `Exercise ${index + 1}`,
        grade
      }];
    }, []);

  const chartConfig = {
    grade: {
      theme: {
        light: '#8B5CF6',
        dark: '#A78BFA',
      },
    },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Grade History</CardTitle>
        <ChartScatter className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ChartContainer config={chartConfig}>
            <LineChart data={gradeHistory}>
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 100]}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Grade
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {payload[0].value}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Line 
                type="monotone"
                strokeWidth={2}
                dataKey="grade"
                dot={{ strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default GradeHistoryChart;
