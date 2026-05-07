import { useMemo, useRef, useState } from 'react';
import { VideoPlayerBox } from './VideoPlayerBox';
import { CollapsibleVideoSection } from './CollapsibleVideoSection';

import { TopicProgressIndicator } from './TopicProgressIndicator';
import type { Video } from '@/types/learning';
import type { ManipulativeMathExercise } from '@/lib/manipulative-maths/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ManipulativeMathRenderer } from '@/components/manipulative-maths/ManipulativeMathRenderer';

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
  lessonContent?: unknown;
  videoAutoPlay?: boolean;
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
  videoAutoPlay = true,
}: TopicLearnTabProps) {
  const quizSectionRef = useRef<HTMLDivElement>(null);
  const [poseePromptOpen, setPoseePromptOpen] = useState(false);
  const [poseeExerciseOpen, setPoseeExerciseOpen] = useState(false);
  const [poseeCompletedVideoIds, setPoseeCompletedVideoIds] = useState<string[]>([]);
  const defaultOperationPoseeExercise: ManipulativeMathExercise = {
    id: 'operation-posee-325-148',
    type: 'operation-posee',
    operation: 'subtraction',
    topNumber: 325,
    bottomNumber: 148,
    prompt: 'Pose et calcule : 325 − 148',
    locale: 'fr',
  };

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
  const currentVideo = useMemo(
    () => videos.find(video => video.id === playingVideoId) || null,
    [videos, playingVideoId]
  );

  // Auto-scroll to quiz when video ends
  const handleVideoEnd = () => {
    onVideoEnd();
    if (playingVideoId && !poseeCompletedVideoIds.includes(playingVideoId)) {
      setPoseePromptOpen(true);
    }
    // Scroll to quiz section after short delay
    setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const handleVideoSelect = (videoId: string) => {
    setPoseePromptOpen(false);
    setPoseeExerciseOpen(false);
    onVideoSelect(videoId);
  };

  const handleStartPoseePractice = () => {
    setPoseePromptOpen(false);
    setPoseeExerciseOpen(true);
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
        autoPlay={videoAutoPlay}
      />

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
            onVideoSelect={handleVideoSelect}
            allBanks={allBanks}
            topicId={topicId}
          />
        ))}
      </div>

      <Dialog open={poseePromptOpen} onOpenChange={setPoseePromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pose et calcule</DialogTitle>
            <DialogDescription>
              {currentVideo
                ? `Tu as termine "${currentVideo.title}". Veux-tu faire un mini entrainement maintenant ?`
                : 'Veux-tu faire un mini entrainement maintenant ?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoseePromptOpen(false)}>
              Plus tard
            </Button>
            <Button onClick={handleStartPoseePractice}>Commencer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={poseeExerciseOpen} onOpenChange={setPoseeExerciseOpen}>
        <DialogContent className="max-w-3xl p-0">
          <ManipulativeMathRenderer
            mode="practice"
            exercise={defaultOperationPoseeExercise}
            onComplete={(result) => {
              if (!result.correct) return;
              if (playingVideoId) {
                setPoseeCompletedVideoIds(prev =>
                  prev.includes(playingVideoId) ? prev : [...prev, playingVideoId]
                );
              }
              setPoseeExerciseOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
