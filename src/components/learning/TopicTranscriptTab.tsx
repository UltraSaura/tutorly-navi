import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Search, Video } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TopicTranscriptTabProps {
  videoId: string | null;
  topicId: string;
}

export function TopicTranscriptTab({ videoId, topicId }: TopicTranscriptTabProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch video transcript
  const { data: video, isLoading } = useQuery({
    queryKey: ['video-transcript', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      const { data, error } = await supabase
        .from('learning_videos')
        .select('id, title, transcript')
        .eq('id', videoId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  // No video selected
  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <Video className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {t('topic.selectVideoForTranscript')}
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  // No transcript available
  if (!video?.transcript) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium mb-2">{t('topic.noTranscript')}</p>
        <p className="text-sm text-muted-foreground">
          {video?.title}
        </p>
      </div>
    );
  }

  // Filter transcript by search query
  const transcriptLines = video.transcript.split('\n').filter(line => line.trim());
  const filteredLines = searchQuery
    ? transcriptLines.filter(line => 
        line.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcriptLines;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5" />
            {t('topic.transcript')}: {video.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('topic.searchTranscript')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Transcript content */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-3">
              {filteredLines.map((line, index) => (
                <p 
                  key={index} 
                  className="text-sm leading-relaxed text-foreground/90"
                >
                  {searchQuery ? (
                    <HighlightText text={line} highlight={searchQuery} />
                  ) : (
                    line
                  )}
                </p>
              ))}
              {filteredLines.length === 0 && searchQuery && (
                <p className="text-center text-muted-foreground py-8">
                  {t('topic.noSearchResults')}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component to highlight search matches
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
