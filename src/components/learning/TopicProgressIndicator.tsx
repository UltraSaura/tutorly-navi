import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle, PlayCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopicProgressIndicatorProps {
  videoWatched: boolean;
  quizCompleted: boolean;
}

export function TopicProgressIndicator({ 
  videoWatched, 
  quizCompleted 
}: TopicProgressIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-6 py-3 px-4 bg-muted/30 border-b">
      {/* Video Status */}
      <div className="flex items-center gap-2">
        {videoWatched ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <PlayCircle className="w-4 h-4 text-muted-foreground" />
        )}
        <span className={cn(
          "text-sm",
          videoWatched ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
        )}>
          {t('topic.videoWatched')}
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border" />

      {/* Quiz Status */}
      <div className="flex items-center gap-2">
        {quizCompleted ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        )}
        <span className={cn(
          "text-sm",
          quizCompleted ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
        )}>
          {t('topic.quizCompleted')}
        </span>
      </div>
    </div>
  );
}
