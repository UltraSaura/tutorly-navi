import { useMemo, useRef } from 'react';
import { VideoPlayerBox } from './VideoPlayerBox';
import { CollapsibleVideoSection } from './CollapsibleVideoSection';
import { KeyPointsSummary } from './KeyPointsSummary';
import { TopicProgressIndicator } from './TopicProgressIndicator';
import type { Video } from '@/types/learning';

interface BankInfo {
  id: string;
  bankId: string;
  isUnlocked: boolean;
  progressMessage: string;
  completedCount: number;
  requiredCount: number;
  videoIds: string[];
  topicId: string | null;
}

interface TopicLearnTabProps {
  topicId: string;
  videos: Video[];
  playingVideoId: string | null;
  onVideoSelect: (videoId: string | null) => void;
  onVideoEnd: () => void;
  completedVideoIds: string[];
  allBanks?: BankInfo[];
  lessonContent?: any;
}

export function TopicLearnTab({
  topicId,
  videos,
  playingVideoId,
  onVideoSelect,
  onVideoEnd,
  completedVideoIds,
  allBanks,
  lessonContent,
}: TopicLearnTabProps) {
  const quizSectionRef = useRef<HTMLDivElement>(null);

  // Group videos into sections (every 4 videos)
  const videoSections = useMemo(() => {
    if (!videos) return [];
    
    const sections: { title: string; videos: Video[] }[] = [];
    const sectionSize = 4;
    
    for (let i = 0; i < videos.length; i += sectionSize) {
      const sectionVideos = videos.slice(i, i + sectionSize);
      const sectionNumber = Math.floor(i / sectionSize) + 1;
      sections.push({
        title: `Section ${sectionNumber}`,
        videos: sectionVideos,
      });
    }
    
    return sections;
  }, [videos]);

  // Check if current video is completed to determine quiz state
  const isCurrentVideoCompleted = playingVideoId 
    ? completedVideoIds.includes(playingVideoId) 
    : false;

  // Auto-scroll to quiz when video ends
  const handleVideoEnd = () => {
    onVideoEnd();
    // Scroll to quiz section after short delay
    setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  return (
    <div className="space-y-0">
      {/* Progress Indicator */}
      <TopicProgressIndicator 
        videoWatched={isCurrentVideoCompleted}
        quizCompleted={false} // TODO: Track quiz completion
      />

      {/* Video Player */}
      <VideoPlayerBox 
        videoId={playingVideoId}
        onVideoEnd={handleVideoEnd}
      />

      {/* Key Points Summary */}
      {lessonContent && (
        <div className="px-4 py-3">
          <KeyPointsSummary content={lessonContent} />
        </div>
      )}

      {/* Quiz Section - Shown after video */}
      <div ref={quizSectionRef}>
        {/* Quiz will be rendered by QuizOverlayController */}
      </div>

      {/* Video Playlist */}
      <div className="space-y-1 pt-2">
        {videoSections.map((section, index) => (
          <CollapsibleVideoSection
            key={index}
            title={section.title}
            videos={section.videos}
            playingVideoId={playingVideoId}
            onVideoSelect={onVideoSelect}
            allBanks={allBanks}
            topicId={topicId}
          />
        ))}
      </div>
    </div>
  );
}
