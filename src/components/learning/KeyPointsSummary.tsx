import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import type { LessonContent } from '@/types/learning';

interface KeyPointsSummaryProps {
  content: LessonContent;
  maxPoints?: number;
}

export function KeyPointsSummary({ content, maxPoints = 4 }: KeyPointsSummaryProps) {
  const { t } = useTranslation();

  // Extract key points from explanation
  const keyPoints = extractKeyPoints(content.explanation, maxPoints);

  if (keyPoints.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
          <Lightbulb className="w-5 h-5" />
          {t('topic.keyPoints')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {keyPoints.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
              <span className="text-amber-900 dark:text-amber-100">{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Helper function to extract key points from text
function extractKeyPoints(text: string, maxPoints: number): string[] {
  if (!text) return [];
  
  // Split by sentences, prioritizing shorter, punchier statements
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 120);
  
  // Take first N meaningful sentences
  return sentences.slice(0, maxPoints);
}
