import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Video } from 'lucide-react';
import { toast } from 'sonner';
import { VariantRow } from './VariantRow';
import { AgeBasedSchoolLevelSelector } from './AgeBasedSchoolLevelSelector';
import type { VideoVariant, VideoVariantGroup, Topic, Subject } from '@/types/learning';
import { useCreateVideoVariants, useUpdateVideoVariants } from '@/hooks/useManageLearningContent';

interface MultiVariantVideoEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: Topic[];
  subjects: Subject[];
  editingGroup?: VideoVariantGroup | null;
  defaultTopicId?: string;
  defaultSubjectId?: string;
}

const createEmptyVariant = (language: string = 'en'): VideoVariant => ({
  language,
  video_url: '',
  title: '',
  description: null,
  tags: [],
  thumbnail_url: null,
  transcript: null,
});

export const MultiVariantVideoEditor = ({
  open,
  onOpenChange,
  topics,
  subjects,
  editingGroup,
  defaultTopicId = '',
  defaultSubjectId = '',
}: MultiVariantVideoEditorProps) => {
  const createVariants = useCreateVideoVariants();
  const updateVariants = useUpdateVideoVariants();

  // Shared content fields (entered once, applied to all variants)
  const [sharedContent, setSharedContent] = useState({
    title: '',
    description: '',
    tags: '',
  });

  const [sharedSettings, setSharedSettings] = useState({
    topic_id: defaultTopicId,
    subject_id: defaultSubjectId,
    duration_minutes: 0,
    xp_reward: 10,
    order_index: 0,
    is_active: true,
    min_age: null as number | null,
    max_age: null as number | null,
    school_levels: [] as string[],
  });

  const [variants, setVariants] = useState<VideoVariant[]>([createEmptyVariant('en')]);

  // Reset form when dialog opens/closes or editingGroup changes
  useEffect(() => {
    if (open) {
      if (editingGroup) {
        // Populate from editing group
        const firstVariant = editingGroup.variants?.[0];
        setSharedContent({
          title: firstVariant?.title || '',
          description: firstVariant?.description || '',
          tags: firstVariant?.tags?.join(', ') || '',
        });
        setSharedSettings({
          topic_id: editingGroup.topic_id,
          subject_id: editingGroup.subject_id || '',
          duration_minutes: editingGroup.duration_minutes,
          xp_reward: editingGroup.xp_reward,
          order_index: editingGroup.order_index,
          is_active: editingGroup.is_active,
          min_age: editingGroup.min_age,
          max_age: editingGroup.max_age,
          school_levels: editingGroup.school_levels || [],
        });
        setVariants(editingGroup.variants?.length ? editingGroup.variants : [createEmptyVariant('en')]);
      } else {
        resetForm();
      }
    }
  }, [open, editingGroup, defaultTopicId, defaultSubjectId]);

  const usedLanguages = variants.map(v => v.language);

  const handleAddVariant = () => {
    const availableLanguages = ['en', 'fr', 'ar'].filter(l => !usedLanguages.includes(l));
    if (availableLanguages.length === 0) {
      toast.error('All languages already have variants');
      return;
    }
    setVariants([...variants, createEmptyVariant(availableLanguages[0])]);
  };

  const handleVariantChange = (index: number, updatedVariant: VideoVariant) => {
    const newVariants = [...variants];
    newVariants[index] = updatedVariant;
    setVariants(newVariants);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      toast.error('At least one variant is required');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!sharedSettings.topic_id) {
      toast.error('Please select a topic');
      return false;
    }

    if (!sharedContent.title.trim()) {
      toast.error('Title is required');
      return false;
    }

    for (const variant of variants) {
      if (!variant.video_url) {
        toast.error(`Video URL is required for ${variant.language} variant`);
        return false;
      }
    }

    // Check for duplicate languages
    const languages = variants.map(v => v.language);
    if (new Set(languages).size !== languages.length) {
      toast.error('Each language can only have one variant');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Apply shared content to all variants
    const parsedTags = sharedContent.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const variantsWithContent: VideoVariant[] = variants.map(v => ({
      ...v,
      title: sharedContent.title,
      description: sharedContent.description || null,
      tags: parsedTags,
    }));

    const groupData: Omit<VideoVariantGroup, 'variant_group_id'> & { variant_group_id?: string } = {
      ...sharedSettings,
      variants: variantsWithContent,
    };

    if (editingGroup) {
      groupData.variant_group_id = editingGroup.variant_group_id;
      await updateVariants.mutateAsync(groupData as VideoVariantGroup);
    } else {
      await createVariants.mutateAsync(groupData);
    }

    onOpenChange(false);
  };

  const resetForm = () => {
    setSharedContent({
      title: '',
      description: '',
      tags: '',
    });
    setSharedSettings({
      topic_id: defaultTopicId,
      subject_id: defaultSubjectId,
      duration_minutes: 0,
      xp_reward: 10,
      order_index: 0,
      is_active: true,
      min_age: null,
      max_age: null,
      school_levels: [],
    });
    setVariants([createEmptyVariant('en')]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {editingGroup ? 'Edit Video' : 'Add Video'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Section */}
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={sharedContent.title}
                onChange={(e) => setSharedContent({ ...sharedContent, title: e.target.value })}
                placeholder="Video title"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Subject</Label>
                <Select 
                  value={sharedSettings.subject_id || ''} 
                  onValueChange={(value) => setSharedSettings({ ...sharedSettings, subject_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic *</Label>
                <Select 
                  value={sharedSettings.topic_id} 
                  onValueChange={(value) => setSharedSettings({ ...sharedSettings, topic_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={sharedContent.description}
                onChange={(e) => setSharedContent({ ...sharedContent, description: e.target.value })}
                placeholder="Video description"
                rows={2}
              />
            </div>

            <div>
              <Label>Tags</Label>
              <Input
                value={sharedContent.tags}
                onChange={(e) => setSharedContent({ ...sharedContent, tags: e.target.value })}
                placeholder="fractions, algebra, equations (comma-separated)"
              />
            </div>
          </div>

          {/* Video URLs by Language */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Video URLs by Language *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddVariant}
                disabled={usedLanguages.length >= 3}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Language
              </Button>
            </div>

            <div className="space-y-2">
              {variants.map((variant, index) => (
                <VariantRow
                  key={index}
                  variant={variant}
                  usedLanguages={usedLanguages}
                  onChange={(updated) => handleVariantChange(index, updated)}
                  onRemove={() => handleRemoveVariant(index)}
                  canRemove={variants.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-medium text-sm">Settings</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  value={sharedSettings.duration_minutes}
                  onChange={(e) => setSharedSettings({ ...sharedSettings, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs">XP Reward</Label>
                <Input
                  type="number"
                  value={sharedSettings.xp_reward}
                  onChange={(e) => setSharedSettings({ ...sharedSettings, xp_reward: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs">Order</Label>
                <Input
                  type="number"
                  value={sharedSettings.order_index}
                  onChange={(e) => setSharedSettings({ ...sharedSettings, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={sharedSettings.is_active}
                  onCheckedChange={(checked) => setSharedSettings({ ...sharedSettings, is_active: checked })}
                />
                <Label className="text-xs">Active</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Min Age</Label>
                <Input
                  type="number"
                  min="0"
                  max="18"
                  value={sharedSettings.min_age || ''}
                  onChange={(e) => setSharedSettings({
                    ...sharedSettings,
                    min_age: e.target.value ? parseInt(e.target.value) : null
                  })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="text-xs">Max Age</Label>
                <Input
                  type="number"
                  min="0"
                  max="18"
                  value={sharedSettings.max_age || ''}
                  onChange={(e) => setSharedSettings({
                    ...sharedSettings,
                    max_age: e.target.value ? parseInt(e.target.value) : null
                  })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">School Levels</Label>
              <AgeBasedSchoolLevelSelector
                selectedLevels={sharedSettings.school_levels}
                onLevelsChange={(levels) => setSharedSettings({ ...sharedSettings, school_levels: levels })}
                selectedLanguage="en"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVariants.isPending || updateVariants.isPending}>
              {editingGroup ? 'Update Video' : 'Add Video'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MultiVariantVideoEditor;
