import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLearningTopics, useLearningVideos, useCreateVideo, useUpdateVideo, useDeleteVideo } from '@/hooks/useManageLearningContent';
import type { Video } from '@/types/learning';
import { Checkbox } from '@/components/ui/checkbox';
import { AgeBasedSchoolLevelSelector } from './AgeBasedSchoolLevelSelector';
import { Badge } from '@/components/ui/badge';

/**
 * Extracts relevant keywords/tags from homework content
 * These keywords will be used to match videos with similar tags
 */

export interface ExtractedKeywords {
  mathConcepts: string[];
  operations: string[];
  topics: string[];
  allKeywords: string[];
}

const MATH_CONCEPTS = [
  'fraction', 'fractions', 'decimal', 'decimals', 'percentage', 'percentages',
  'algebra', 'linear equation', 'quadratic equation', 'polynomial',
  'geometry', 'triangle', 'circle', 'area', 'perimeter', 'volume',
  'calculus', 'derivative', 'integral', 'limit',
  'statistics', 'mean', 'median', 'mode', 'probability',
  'trigonometry', 'sine', 'cosine', 'tangent', 'angle',
  'addition', 'subtraction', 'multiplication', 'division',
  'simplify', 'simplification', 'factor', 'factoring', 'expand', 'expansion',
  'solve', 'equation', 'inequality', 'system of equations',
  'graph', 'plot', 'coordinate', 'slope', 'intercept'
];

const OPERATIONS = [
  'add', 'subtract', 'multiply', 'divide', 'simplify', 'solve',
  'calculate', 'compute', 'evaluate', 'find', 'determine',
  'factor', 'expand', 'reduce', 'convert', 'transform'
];

export function extractKeywordsFromHomework(homeworkContent: string): ExtractedKeywords {
  const content = homeworkContent.toLowerCase();
  const allKeywords: string[] = [];
  
  // Extract math concepts
  const mathConcepts: string[] = [];
  MATH_CONCEPTS.forEach(concept => {
    if (content.includes(concept.toLowerCase())) {
      mathConcepts.push(concept);
      allKeywords.push(concept);
    }
  });
  
  // Extract operations
  const operations: string[] = [];
  OPERATIONS.forEach(op => {
    if (content.includes(op.toLowerCase())) {
      operations.push(op);
      allKeywords.push(op);
    }
  });
  
  // Extract topic keywords from common patterns
  const topics: string[] = [];
  
  // Fraction-related
  if (/\d+\/\d+/.test(content) || content.includes('fraction')) {
    topics.push('fractions');
    if (!allKeywords.includes('fractions')) allKeywords.push('fractions');
  }
  
  // Equation-related
  if (/x\s*[=+-]|equation|solve/.test(content)) {
    topics.push('equations');
    if (!allKeywords.includes('equations')) allKeywords.push('equations');
  }
  
  // Geometry-related
  if (/triangle|circle|square|rectangle|angle|area|perimeter/.test(content)) {
    topics.push('geometry');
    if (!allKeywords.includes('geometry')) allKeywords.push('geometry');
  }
  
  // Algebra-related
  if (/variable|coefficient|x|y|z|algebra/.test(content)) {
    topics.push('algebra');
    if (!allKeywords.includes('algebra')) allKeywords.push('algebra');
  }
  
  // Remove duplicates
  const uniqueKeywords = Array.from(new Set(allKeywords));
  
  return {
    mathConcepts: Array.from(new Set(mathConcepts)),
    operations: Array.from(new Set(operations)),
    topics: Array.from(new Set(topics)),
    allKeywords: uniqueKeywords,
  };
}

/**
 * Scores how well a video's tags match homework keywords
 */
export function scoreVideoMatch(videoTags: string[], homeworkKeywords: string[]): number {
  if (!videoTags || videoTags.length === 0) return 0;
  if (!homeworkKeywords || homeworkKeywords.length === 0) return 0;
  
  const videoTagsLower = videoTags.map(t => t.toLowerCase());
  const homeworkKeywordsLower = homeworkKeywords.map(k => k.toLowerCase());
  
  // Count matches
  let matches = 0;
  videoTagsLower.forEach(tag => {
    if (homeworkKeywordsLower.some(keyword => 
      keyword.includes(tag) || tag.includes(keyword)
    )) {
      matches++;
    }
  });
  
  // Score: matches / max(video tags, homework keywords)
  const maxTags = Math.max(videoTags.length, homeworkKeywords.length);
  return maxTags > 0 ? matches / maxTags : 0;
}

const VideoManager = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const { data: topics = [], isLoading: topicsLoading, error: topicsError } = useLearningTopics();
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useLearningVideos(selectedTopicId || undefined);
  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo();
  const deleteVideo = useDeleteVideo();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [formData, setFormData] = useState({
    topic_id: '',
    title: '',
    video_url: '',
    thumbnail_url: '',
    duration_minutes: 0,
    xp_reward: 0,
    description: '',
    transcript: '',
    order_index: 0,
    is_active: true,
    min_age: null as number | null,
    max_age: null as number | null,
    school_levels: [] as string[],
    tags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingVideo) {
      await updateVideo.mutateAsync({ id: editingVideo.id, ...formData });
    } else {
      await createVideo.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      topic_id: video.topic_id,
      title: video.title,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration_minutes: video.duration_minutes,
      xp_reward: video.xp_reward,
      description: video.description || '',
      transcript: video.transcript || '',
      order_index: video.order_index,
      is_active: video.is_active,
      min_age: video.min_age,
      max_age: video.max_age,
      school_levels: video.school_levels || [],
      tags: video.tags || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all quizzes under this video.')) {
      await deleteVideo.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setEditingVideo(null);
    setFormData({
      topic_id: selectedTopicId,
      title: '',
      video_url: '',
      thumbnail_url: '',
      duration_minutes: 0,
      xp_reward: 0,
      description: '',
      transcript: '',
      order_index: 0,
      is_active: true,
      min_age: null,
      max_age: null,
      school_levels: [],
      tags: [],
    });
  };

  if (topicsError) {
    return <div className="text-destructive">Error loading topics: {topicsError.message}</div>;
  }

  if (videosError) {
    return <div className="text-destructive">Error loading videos: {videosError.message}</div>;
  }

  if (topicsLoading) {
    return <div className="text-muted-foreground">Loading topics...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Videos</h2>
          <p className="text-muted-foreground">Manage videos within topics</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="topic_id">Topic</Label>
                <Select value={formData.topic_id} onValueChange={(value) => setFormData({ ...formData, topic_id: value })}>
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
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="YouTube, Vimeo, or direct video URL"
                  required
                />
              </div>
              <div>
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="Optional thumbnail image URL"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="xp_reward">XP Reward</Label>
                  <Input
                    id="xp_reward"
                    type="number"
                    value={formData.xp_reward}
                    onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="transcript">Transcript</Label>
                <Textarea
                  id="transcript"
                  value={formData.transcript}
                  onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_index">Order Index</Label>
                  <Input
                    id="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Age</Label>
                  <Input
                    type="number"
                    min="0"
                    max="18"
                    value={formData.min_age || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      min_age: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="e.g., 6"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for no minimum age
                  </p>
                </div>
                <div>
                  <Label>Maximum Age</Label>
                  <Input
                    type="number"
                    min="0"
                    max="18"
                    value={formData.max_age || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      max_age: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="e.g., 11"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for no maximum age
                  </p>
                </div>
              </div>

              <div>
                <Label>School Levels</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select school levels this video is suitable for. Use the "Select All" checkbox 
                  to select all levels for a specific age across all countries, or select individual 
                  country/level combinations. Leave empty to show for all levels.
                </p>
                <AgeBasedSchoolLevelSelector
                  selectedLevels={formData.school_levels}
                  onLevelsChange={(levels) => setFormData({...formData, school_levels: levels})}
                />
              </div>
              <div>
                <Label>Tags (for homework matching)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add keywords that describe this video. These will be used to suggest this video 
                  when students submit homework with similar topics. Separate tags with commas.
                </p>
                <Input
                  placeholder="e.g., fractions, simplify, addition, algebra"
                  value={formData.tags.join(', ')}
                  onChange={(e) => {
                    const tagString = e.target.value;
                    const tags = tagString
                      .split(',')
                      .map(t => t.trim())
                      .filter(t => t.length > 0);
                    setFormData({...formData, tags});
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Suggested tags: fractions, equations, algebra, geometry, simplify, solve, calculate
                </p>
              </div>
              <Button type="submit" className="w-full">
                {editingVideo ? 'Update Video' : 'Create Video'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Label>Select Topic</Label>
        <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a topic to view videos" />
          </SelectTrigger>
          <SelectContent>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedTopicId ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a topic above to view and manage videos
        </div>
      ) : videosLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading videos...
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No videos found for this topic
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => (
            <TableRow key={video.id}>
              <TableCell className="font-medium">{video.title}</TableCell>
              <TableCell>{topics.find(t => t.id === video.topic_id)?.name}</TableCell>
              <TableCell>{video.duration_minutes}m</TableCell>
              <TableCell>{video.xp_reward} XP</TableCell>
              <TableCell>{video.order_index}</TableCell>
              <TableCell>
                <span className={video.is_active ? 'text-green-600' : 'text-red-600'}>
                  {video.is_active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(video)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(video.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default VideoManager;
