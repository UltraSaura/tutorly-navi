import { useState } from 'react';
import { ChevronDown, Play, CheckCircle2, Clock, Zap } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Video } from '@/types/learning';
import { TestYourselfInline } from './TestYourselfInline';

interface CollapsibleVideoSectionProps {
  title: string;
  videos: Video[];
  playingVideoId: string | null;
  onVideoSelect: (videoId: string) => void;
  allBanks?: { 
    id: string; 
    bankId: string; 
    isUnlocked: boolean; 
    progressMessage: string;
    completedCount: number;
    requiredCount: number;
    videoIds: string[];
    topicId: string | null;
  }[];
  topicId?: string;
}

export const CollapsibleVideoSection = ({
  title,
  videos,
  playingVideoId,
  onVideoSelect,
  allBanks = [],
  topicId,
}: CollapsibleVideoSectionProps) => {
  
  const getBanksForVideo = (videoId: string) => {
    return allBanks.filter(bank => 
      bank.videoIds.includes(videoId) || bank.topicId === topicId
    );
  };
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mx-4 my-3">
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="divide-y divide-border">
            {videos.map((video, index) => {
              const isPlaying = playingVideoId === video.id;
              const isCompleted = video.is_completed;
              const isStarted = (video.progress_percentage || 0) > 0;

              const numberColor = isPlaying
                ? 'text-primary'
                : isCompleted
                ? 'text-green-600'
                : isStarted
                ? 'text-yellow-600'
                : 'text-muted-foreground';

              const videoBanks = getBanksForVideo(video.id);
              
              return (
                <div key={video.id}>
                  <div
                    onClick={() => onVideoSelect(video.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50',
                      isPlaying && 'bg-primary/5 border-l-4 border-l-primary'
                    )}
                  >
                    {/* Video Number */}
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className={cn('text-xl font-bold', numberColor)}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Video Info */}
                    <div className="flex-grow min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isCompleted && 'line-through text-muted-foreground',
                          !isCompleted && 'text-foreground'
                        )}
                      >
                        {video.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{video.duration_minutes} min</span>
                        <span>•</span>
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span>+{video.xp_reward} XP</span>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex-shrink-0">
                      {isPlaying ? (
                        <Play className="w-5 h-5 text-primary fill-primary" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 fill-green-600" />
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                  
                  {/* Quiz Banks for this video */}
                  {videoBanks.length > 0 && (
                    <div className="px-3 pb-3 pl-14 flex flex-wrap gap-2">
                      {videoBanks.map((bank) => (
                        <TestYourselfInline
                          key={bank.bankId}
                          bankId={bank.bankId}
                          locked={!bank.isUnlocked}
                          progressMessage={bank.progressMessage}
                          className="text-xs h-7 px-2"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
