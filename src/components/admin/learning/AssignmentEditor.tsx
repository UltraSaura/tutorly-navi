import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useLearningTopics, useLearningVideos } from '@/hooks/useManageLearningContent';
import { BookOpen, Play, Layers } from 'lucide-react';
import type { Topic, Video } from '@/types/learning';

type DisplayContext = 'practice' | 'lesson' | 'both';

interface AssignmentEditorProps {
  assignment?: any;
  defaultTopicId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: any) => void;
}

export function AssignmentEditor({ assignment, defaultTopicId, isOpen, onClose, onSave }: AssignmentEditorProps) {
  const ui = useInterfaceTranslation();
  const [displayContext, setDisplayContext] = useState<DisplayContext>('practice');
  const [topicId, setTopicId] = useState('');
  const [triggerVideoId, setTriggerVideoId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const { data: topics = [] } = useLearningTopics();
  const { data: topicVideos = [] } = useLearningVideos(topicId || undefined);

  // Sort videos by order_index
  const sortedVideos = [...topicVideos].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  useEffect(() => {
    if (assignment) {
      // Detect display_context from new field, or infer from legacy data
      const dc: DisplayContext = assignment.display_context
        ?? (assignment.video_ids?.length ? 'lesson' : assignment.trigger_after_n_videos === 0 ? 'practice' : 'both');
      setDisplayContext(dc);
      setTopicId(assignment.topic_id || '');
      setTriggerVideoId(assignment.trigger_video_id || null);
      setIsActive(assignment.is_active ?? true);
    } else {
      setDisplayContext('practice');
      setTopicId(defaultTopicId || '');
      setTriggerVideoId(null);
      setIsActive(true);
    }
  }, [assignment, defaultTopicId, isOpen]);

  // When topic changes, clear trigger video if it doesn't belong to the new topic
  const handleTopicChange = (newTopicId: string) => {
    setTopicId(newTopicId);
    setTriggerVideoId(null);
  };

  const handleSave = () => {
    if (!topicId) {
      alert('Please select a topic');
      return;
    }
    if ((displayContext === 'lesson' || displayContext === 'both') && !triggerVideoId) {
      alert('Please select the video after which the quiz should appear');
      return;
    }

    onSave({
      topic_id: topicId,
      display_context: displayContext,
      trigger_video_id: (displayContext === 'lesson' || displayContext === 'both') ? triggerVideoId : null,
      // Clear legacy fields
      trigger_after_n_videos: displayContext === 'practice' ? 0 : null,
      video_ids: null,
      min_completed_in_set: null,
      is_active: isActive,
    });
  };

  const contextOptions: { value: DisplayContext; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: 'practice',
      label: ui("Practice page only"),
      description: 'Appears in "S\'entraîner par thème" — always available, no video required',
      icon: <BookOpen className="h-4 w-4 text-violet-500" />,
    },
    {
      value: 'lesson',
      label: 'After a specific video (lesson only)',
      description: 'Appears in the video player after the student completes the selected video',
      icon: <Play className="h-4 w-4 text-blue-500" />,
    },
    {
      value: 'both',
      label: ui("Both"),
      description: 'Available on the practice page AND appears in the video player after the selected video',
      icon: <Layers className="h-4 w-4 text-green-500" />,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is-active" className="cursor-pointer">{ui("Active")}</Label>
          </div>

          {/* Topic */}
          <div>
            <Label className="mb-1.5 block">{ui("Topic")}</Label>
            <Select value={topicId} onValueChange={handleTopicChange}>
              <SelectTrigger>
                <SelectValue placeholder={ui("Select a topic")} />
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

          {/* Display context */}
          <div>
            <Label className="mb-2 block">{ui("Show this quiz in")}</Label>
            <RadioGroup
              value={displayContext}
              onValueChange={(v) => setDisplayContext(v as DisplayContext)}
              className="space-y-2"
            >
              {contextOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                    displayContext === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {opt.icon}
                      {opt.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Trigger video — only shown for lesson / both */}
          {(displayContext === 'lesson' || displayContext === 'both') && (
            <div>
              <Label className="mb-1.5 block">
                {ui("Trigger video")}
                <span className="text-xs text-muted-foreground ml-2">
                  {ui("Quiz appears after the student completes this video")}
                </span>
              </Label>

              {!topicId ? (
                <p className="text-sm text-muted-foreground border rounded-lg p-3">
                  {ui("Select a topic first to see its videos")}
                </p>
              ) : sortedVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-lg p-3">
                  {ui("No videos found for this topic")}
                </p>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  {sortedVideos.map((video: Video, i: number) => {
                    const isSelected = triggerVideoId === video.id;
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => setTriggerVideoId(video.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          i > 0 ? 'border-t border-border/60' : ''
                        } ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 text-muted-foreground'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium flex-1 truncate">{video.title}</span>
                        {isSelected && (
                          <Badge variant="default" className="text-xs shrink-0">{ui("Trigger")}</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Practice-only info */}
          {displayContext === 'practice' && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-3 text-sm text-violet-800 dark:text-violet-300">
              {ui("This quiz will always be available on the")} <strong>{ui("S'entraîner par thème")}</strong> {ui("page for this topic — no video completion required.")}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>{ui("Cancel")}</Button>
            <Button onClick={handleSave}>
              {assignment ? ui("Update") : ui("Create")} {ui("Assignment")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
