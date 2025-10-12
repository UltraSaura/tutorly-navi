import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { MathRenderer } from '@/components/math';

interface ExplanationCardProps {
  explanation: any;
  onView: (explanation: any) => void;
}

export default function ExplanationCard({ explanation, onView }: ExplanationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{explanation.childName}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {explanation.subjectId && (
              <Badge variant="outline" className="capitalize">
                {explanation.subjectId}
              </Badge>
            )}
            <Badge variant="secondary">
              Score: {explanation.quality_score || 0}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Exercise:</p>
          <div className="p-3 bg-muted rounded-md">
            <MathRenderer latex={explanation.exerciseContent} />
          </div>
        </div>

        {explanation.userAnswer && (
          <div>
            <p className="text-sm font-medium mb-2">Student Answer:</p>
            <div className="p-3 bg-muted rounded-md">
              <MathRenderer latex={explanation.userAnswer} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(explanation.exerciseDate), 'PPp')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(explanation)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Explanation
          </Button>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Used {explanation.usage_count} time{explanation.usage_count !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
}
