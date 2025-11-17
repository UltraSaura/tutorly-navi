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
import { useLearningCategories, useLearningTopics, useCreateTopic, useUpdateTopic, useDeleteTopic } from '@/hooks/useManageLearningContent';
import type { Topic } from '@/types/learning';
import { CurriculumSelector } from '@/components/admin/curriculum/CurriculumSelector';
import { CurriculumLocation } from '@/components/admin/curriculum/CurriculumLocation';
import { TopicObjectivesSelector } from './TopicObjectivesSelector';
import { GenerateLessonButton } from './GenerateLessonButton';
import { LessonContentDisplay } from './LessonContentDisplay';

const TopicManager = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useLearningCategories();
  const { data: topics = [], isLoading: topicsLoading, error: topicsError } = useLearningTopics(selectedCategoryId || undefined);
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
    video_count: 0,
    quiz_count: 0,
    estimated_duration_minutes: 0,
    order_index: 0,
    is_active: true,
    curriculum_country_code: null as string | null,
    curriculum_level_code: null as string | null,
    curriculum_subject_id: null as string | null,
    curriculum_domain_id: null as string | null,
    curriculum_subdomain_id: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTopic) {
      await updateTopic.mutateAsync({ id: editingTopic.id, ...formData });
    } else {
      await createTopic.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({
      category_id: topic.category_id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description || '',
      video_count: topic.video_count,
      quiz_count: topic.quiz_count,
      estimated_duration_minutes: topic.estimated_duration_minutes,
      order_index: topic.order_index,
      is_active: topic.is_active,
      curriculum_country_code: topic.curriculum_country_code || null,
      curriculum_level_code: topic.curriculum_level_code || null,
      curriculum_subject_id: topic.curriculum_subject_id || null,
      curriculum_domain_id: topic.curriculum_domain_id || null,
      curriculum_subdomain_id: topic.curriculum_subdomain_id || null,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all videos and quizzes under this topic.')) {
      await deleteTopic.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setEditingTopic(null);
    setFormData({
      category_id: selectedCategoryId,
      name: '',
      slug: '',
      description: '',
      video_count: 0,
      quiz_count: 0,
      estimated_duration_minutes: 0,
      order_index: 0,
      is_active: true,
      curriculum_country_code: null,
      curriculum_level_code: null,
      curriculum_subject_id: null,
      curriculum_domain_id: null,
      curriculum_subdomain_id: null,
    });
  };

  if (categoriesError) {
    return <div className="text-destructive">Error loading categories: {categoriesError.message}</div>;
  }

  if (topicsError) {
    return <div className="text-destructive">Error loading topics: {topicsError.message}</div>;
  }

  if (categoriesLoading) {
    return <div className="text-muted-foreground">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Topics</h2>
          <p className="text-muted-foreground">Manage topics within categories</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTopic ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category_id">Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
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
              
              {/* Curriculum Location Selector */}
              <CurriculumSelector
                value={{
                  curriculum_country_code: formData.curriculum_country_code,
                  curriculum_level_code: formData.curriculum_level_code,
                  curriculum_subject_id: formData.curriculum_subject_id,
                  curriculum_domain_id: formData.curriculum_domain_id,
                  curriculum_subdomain_id: formData.curriculum_subdomain_id,
                }}
                onChange={(selection) => setFormData({ ...formData, ...selection })}
                locale="en"
              />

              {/* Topic Objectives Selector - Only show when editing */}
              {editingTopic && (
                <TopicObjectivesSelector
                  topicId={editingTopic.id}
                  curriculumSubjectId={formData.curriculum_subject_id || undefined}
                  curriculumDomainId={formData.curriculum_domain_id || undefined}
                  curriculumSubdomainId={formData.curriculum_subdomain_id || undefined}
                />
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="video_count">Video Count</Label>
                  <Input
                    id="video_count"
                    type="number"
                    value={formData.video_count}
                    onChange={(e) => setFormData({ ...formData, video_count: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="quiz_count">Quiz Count</Label>
                  <Input
                    id="quiz_count"
                    type="number"
                    value={formData.quiz_count}
                    onChange={(e) => setFormData({ ...formData, quiz_count: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_duration_minutes">Duration (min)</Label>
                  <Input
                    id="estimated_duration_minutes"
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
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
              
              {/* Lesson Content Section */}
              {editingTopic && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Lesson Content</Label>
                    <GenerateLessonButton 
                      topicId={editingTopic.id} 
                      hasExistingContent={!!editingTopic.lesson_content}
                    />
                  </div>
                  
                  {editingTopic.lesson_content ? (
                    <LessonContentDisplay content={editingTopic.lesson_content as any} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No lesson content generated yet. Click "Generate Lesson Content" to create it automatically.
                    </p>
                  )}
                </div>
              )}
              
              <Button type="submit" className="w-full">
                {editingTopic ? 'Update Topic' : 'Create Topic'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Label>Select Category</Label>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category to view topics" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCategoryId ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a category above to view and manage topics
        </div>
      ) : topicsLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading topics...
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Curriculum</TableHead>
              <TableHead>Videos</TableHead>
              <TableHead>Quizzes</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No topics found for this category
                </TableCell>
              </TableRow>
            ) : (
              topics.map((topic) => (
            <TableRow key={topic.id}>
              <TableCell className="font-medium">{topic.name}</TableCell>
              <TableCell>{categories.find(c => c.id === topic.category_id)?.name}</TableCell>
              <TableCell>
                <CurriculumLocation
                  countryId={topic.curriculum_country_code}
                  levelId={topic.curriculum_level_code}
                  subjectId={topic.curriculum_subject_id}
                  domainId={topic.curriculum_domain_id}
                  subdomainId={topic.curriculum_subdomain_id}
                  variant="compact"
                />
              </TableCell>
              <TableCell>{topic.video_count}</TableCell>
              <TableCell>{topic.quiz_count}</TableCell>
              <TableCell>{topic.estimated_duration_minutes}m</TableCell>
              <TableCell>{topic.order_index}</TableCell>
              <TableCell>
                <span className={topic.is_active ? 'text-green-600' : 'text-red-600'}>
                  {topic.is_active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(topic)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(topic.id)}>
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

export default TopicManager;
