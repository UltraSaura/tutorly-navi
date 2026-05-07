import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, FileText, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface TopicTabsLayoutProps {
  learnContent: React.ReactNode;
  transcriptContent: React.ReactNode;
  lessonContent: React.ReactNode;
  defaultTab?: string;
}

export function TopicTabsLayout({
  learnContent,
  transcriptContent,
  lessonContent,
  defaultTab = 'learn',
}: TopicTabsLayoutProps) {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 h-auto">
        <TabsTrigger
          value="learn"
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 text-sm font-medium",
            "data-[state=active]:bg-background data-[state=active]:shadow-sm"
          )}
        >
          <PlayCircle className="w-4 h-4" />
          <span className="hidden sm:inline">{t('topic.tabLearn')}</span>
        </TabsTrigger>
        <TabsTrigger
          value="transcript"
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 text-sm font-medium",
            "data-[state=active]:bg-background data-[state=active]:shadow-sm"
          )}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">{t('topic.tabTranscript')}</span>
        </TabsTrigger>
        <TabsTrigger
          value="lesson"
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 text-sm font-medium",
            "data-[state=active]:bg-background data-[state=active]:shadow-sm"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">{t('topic.tabLesson')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="learn" className="mt-0 focus-visible:outline-none">
        {learnContent}
      </TabsContent>

      <TabsContent value="transcript" className="mt-0 focus-visible:outline-none">
        {transcriptContent}
      </TabsContent>

      <TabsContent value="lesson" className="mt-0 focus-visible:outline-none">
        {lessonContent}
      </TabsContent>
    </Tabs>
  );
}
