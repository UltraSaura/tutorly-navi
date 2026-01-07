import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLearningTopics, useLearningVideos, useDeleteVideo, useLearningSubjects } from '@/hooks/useManageLearningContent';
import type { Video, VideoVariantGroup } from '@/types/learning';
import { MultiVariantVideoEditor } from './MultiVariantVideoEditor';

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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('all');
  const { data: subjects = [], isLoading: subjectsLoading } = useLearningSubjects();
  const { data: topics = [], isLoading: topicsLoading, error: topicsError } = useLearningTopics();
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useLearningVideos(selectedTopicId || undefined);
  const deleteVideo = useDeleteVideo();
  
  // Filter videos by language
  const filteredVideos = selectedLanguageFilter === 'all' 
    ? videos 
    : videos.filter(v => (v.language || 'en') === selectedLanguageFilter);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VideoVariantGroup | null>(null);

  const handleEdit = (video: Video) => {
    // Convert video to VideoVariantGroup format for editing
    const group: VideoVariantGroup = {
      variant_group_id: video.variant_group_id || video.id,
      topic_id: video.topic_id,
      subject_id: video.subject_id || null,
      duration_minutes: video.duration_minutes,
      xp_reward: video.xp_reward,
      order_index: video.order_index,
      is_active: video.is_active,
      min_age: video.min_age ?? null,
      max_age: video.max_age ?? null,
      school_levels: video.school_levels || [],
      variants: [{
        id: video.id,
        language: video.language || 'en',
        video_url: video.video_url,
        title: video.title,
        description: video.description || null,
        tags: video.tags || [],
        thumbnail_url: video.thumbnail_url || null,
        transcript: video.transcript || null,
      }],
    };
    
    // If video has a variant_group_id, find all related videos
    if (video.variant_group_id) {
      const relatedVideos = videos.filter(v => v.variant_group_id === video.variant_group_id);
      group.variants = relatedVideos.map(v => ({
        id: v.id,
        language: v.language || 'en',
        video_url: v.video_url,
        title: v.title,
        description: v.description || null,
        tags: v.tags || [],
        thumbnail_url: v.thumbnail_url || null,
        transcript: v.transcript || null,
      }));
    }
    
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete the video and all its quizzes.')) {
      await deleteVideo.mutateAsync(id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingGroup(null);
    }
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

  // Get language flags for a video (shows all variants if grouped)
  const getLanguageFlags = (video: Video) => {
    if (video.variant_group_id) {
      const relatedVideos = videos.filter(v => v.variant_group_id === video.variant_group_id);
      const languages = [...new Set(relatedVideos.map(v => v.language || 'en'))];
      return languages.map(lang => {
        switch (lang) {
          case 'fr': return '🇫🇷';
          case 'ar': return '🇸🇦';
          default: return '🇺🇸';
        }
      }).join(' ');
    }
    switch (video.language) {
      case 'fr': return '🇫🇷';
      case 'ar': return '🇸🇦';
      default: return '🇺🇸';
    }
  };

  // Group videos by variant_group_id to avoid duplicate rows
  const displayedVideos = (() => {
    const seen = new Set<string>();
    return filteredVideos.filter(video => {
      if (video.variant_group_id) {
        if (seen.has(video.variant_group_id)) return false;
        seen.add(video.variant_group_id);
      }
      return true;
    });
  })();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Videos</h2>
          <p className="text-muted-foreground">Manage videos within topics</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
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
        <div>
          <Label>Filter by Language</Label>
          <Select value={selectedLanguageFilter} onValueChange={setSelectedLanguageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="fr">🇫🇷 Français</SelectItem>
              <SelectItem value="ar">🇸🇦 العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {videosLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading videos...
        </div>
      ) : (
        <>
        {!selectedTopicId && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing all videos. Select a topic to filter.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Languages</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No videos found for this topic
                </TableCell>
              </TableRow>
            ) : (
              displayedVideos.map((video) => (
            <TableRow key={video.id}>
              <TableCell className="font-medium">{video.title}</TableCell>
              <TableCell>{getLanguageFlags(video)}</TableCell>
              <TableCell>{subjects.find(s => s.id === video.subject_id)?.name || '-'}</TableCell>
              <TableCell>{topics.find(t => t.id === video.topic_id)?.name}</TableCell>
              <TableCell>{video.duration_minutes}m</TableCell>
              <TableCell>{video.xp_reward} XP</TableCell>
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
        </>
      )}

      <MultiVariantVideoEditor
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        topics={topics}
        subjects={subjects}
        editingGroup={editingGroup}
        defaultTopicId={selectedTopicId}
        defaultSubjectId={selectedSubjectId}
      />
    </div>
  );
};

export default VideoManager;
