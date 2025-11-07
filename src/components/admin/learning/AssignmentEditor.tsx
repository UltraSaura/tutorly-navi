import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useLearningTopics, useLearningVideos } from '@/hooks/useManageLearningContent';
import { X } from 'lucide-react';
import type { Topic, Video } from '@/types/learning';

interface AssignmentEditorProps {
  assignment?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: any) => void;
}

export function AssignmentEditor({ assignment, isOpen, onClose, onSave }: AssignmentEditorProps) {
  const [assignmentType, setAssignmentType] = useState<'topic' | 'video-set'>(
    assignment?.topic_id ? 'topic' : assignment?.video_ids ? 'video-set' : 'topic'
  );
  const [topicId, setTopicId] = useState(assignment?.topic_id || '');
  const [triggerAfterNVideos, setTriggerAfterNVideos] = useState(assignment?.trigger_after_n_videos || 1);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(assignment?.video_ids || []);
  const [minCompletedInSet, setMinCompletedInSet] = useState(assignment?.min_completed_in_set || 1);
  const [isActive, setIsActive] = useState(assignment?.is_active ?? true);

  // Fetch topics for dropdown
  const { data: topics = [] } = useLearningTopics();

  // Fetch videos for the selected topic or all videos
  const { data: topicVideos = [] } = useLearningVideos(topicId || undefined);
  const { data: allVideos = [] } = useLearningVideos();

  const videosToShow = assignmentType === 'topic' && topicId ? topicVideos : allVideos;

  useEffect(() => {
    if (assignment) {
      setAssignmentType(assignment.topic_id ? 'topic' : 'video-set');
      setTopicId(assignment.topic_id || '');
      setTriggerAfterNVideos(assignment.trigger_after_n_videos || 1);
      setSelectedVideoIds(assignment.video_ids || []);
      setMinCompletedInSet(assignment.min_completed_in_set || 1);
      setIsActive(assignment.is_active ?? true);
    } else {
      setAssignmentType('topic');
      setTopicId('');
      setTriggerAfterNVideos(1);
      setSelectedVideoIds([]);
      setMinCompletedInSet(1);
      setIsActive(true);
    }
  }, [assignment, isOpen]);

  const handleToggleVideo = (videoId: string) => {
    if (selectedVideoIds.includes(videoId)) {
      setSelectedVideoIds(selectedVideoIds.filter(id => id !== videoId));
    } else {
      setSelectedVideoIds([...selectedVideoIds, videoId]);
    }
  };

  const handleSave = () => {
    if (assignmentType === 'topic') {
      if (!topicId) {
        alert('Please select a topic');
        return;
      }
      if (triggerAfterNVideos < 1) {
        alert('Please enter a valid number of videos (at least 1)');
        return;
      }
      onSave({
        topic_id: topicId,
        trigger_after_n_videos: triggerAfterNVideos,
        video_ids: null,
        min_completed_in_set: null,
        is_active: isActive,
      });
    } else {
      if (selectedVideoIds.length === 0) {
        alert('Please select at least one video');
        return;
      }
      if (minCompletedInSet < 1 || minCompletedInSet > selectedVideoIds.length) {
        alert(`Please enter a valid number (between 1 and ${selectedVideoIds.length})`);
        return;
      }
      onSave({
        topic_id: null,
        trigger_after_n_videos: null,
        video_ids: selectedVideoIds,
        min_completed_in_set: minCompletedInSet,
        is_active: isActive,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Assignment Type</Label>
            <Select value={assignmentType} onValueChange={(value: 'topic' | 'video-set') => setAssignmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topic">Topic-based (show after N videos in topic)</SelectItem>
                <SelectItem value="video-set">Video set-based (show after K videos from set)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is-active">Active (assignment is currently in effect)</Label>
          </div>

          {assignmentType === 'topic' ? (
            <>
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic: Topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trigger-count">Show after N videos completed</Label>
                <Input
                  id="trigger-count"
                  type="number"
                  value={triggerAfterNVideos}
                  onChange={(e) => setTriggerAfterNVideos(parseInt(e.target.value) || 1)}
                  min="1"
                  placeholder="e.g., 2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  The "Test yourself" button will appear after the user completes this many videos in the selected topic.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Select Videos</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {videosToShow.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No videos available</p>
                  ) : (
                    videosToShow.map((video: Video) => (
                      <div
                        key={video.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => handleToggleVideo(video.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVideoIds.includes(video.id)}
                          onChange={() => handleToggleVideo(video.id)}
                          className="rounded"
                        />
                        <Label className="flex-1 cursor-pointer">{video.title}</Label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {selectedVideoIds.length} video(s)
                </p>
              </div>

              <div>
                <Label htmlFor="min-completed">Minimum completed in set</Label>
                <Input
                  id="min-completed"
                  type="number"
                  value={minCompletedInSet}
                  onChange={(e) => setMinCompletedInSet(parseInt(e.target.value) || 1)}
                  min="1"
                  max={selectedVideoIds.length || 1}
                  placeholder={`Between 1 and ${selectedVideoIds.length || 1}`}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  The "Test yourself" button will appear after the user completes at least this many videos from the selected set.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {assignment ? 'Update' : 'Create'} Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

