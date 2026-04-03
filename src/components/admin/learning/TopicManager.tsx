import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, AlertCircle, Tags } from 'lucide-react';
import { useLearningCategories, useLearningTopics, useCreateTopic, useUpdateTopic, useDeleteTopic } from '@/hooks/useManageLearningContent';
import type { Topic } from '@/types/learning';
import { CurriculumSelector } from '@/components/admin/curriculum/CurriculumSelector';
import { CurriculumLocation } from '@/components/admin/curriculum/CurriculumLocation';
import { TopicObjectivesSelector } from './TopicObjectivesSelector';
import { GenerateLessonButton } from './GenerateLessonButton';
import { LessonContentDisplay } from './LessonContentDisplay';
import { useProgramTopicsForAdmin } from '@/hooks/useProgramTopicsForAdmin';
import { useAutoLinkObjectives } from '@/hooks/useAutoSuggestObjectives';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const TopicManager = () => {
  const { t } = useTranslation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [curriculumFilters, setCurriculumFilters] = useState({
    countryCode: '',
    levelCode: '',
    subjectId: '',
  });
  
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useLearningCategories();
  const { data: topics = [], isLoading: topicsLoading, error: topicsError } = useLearningTopics(selectedCategoryId || undefined);
  const { data: programTopics = [], isLoading: programTopicsLoading } = useProgramTopicsForAdmin({
    countryCode: curriculumFilters.countryCode,
    levelCode: curriculumFilters.levelCode,
    subjectId: curriculumFilters.subjectId,
  });
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const autoLinkObjectives = useAutoLinkObjectives();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
    keywords: [] as string[],
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
  const [keywordsInput, setKeywordsInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse keywords from input
    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    
    const dataToSubmit = { ...formData, keywords };
    
    let topicId: string;
    
    if (editingTopic) {
      await updateTopic.mutateAsync({ id: editingTopic.id, ...dataToSubmit });
      topicId = editingTopic.id;
    } else {
      const result = await createTopic.mutateAsync(dataToSubmit);
      topicId = result.id;
    }
    
    // Auto-suggest and link objectives if we have curriculum info
    if (formData.name && formData.curriculum_level_code) {
      try {
        await autoLinkObjectives.mutateAsync({
          topicId,
          topicName: formData.name,
          topicDescription: formData.description,
          topicKeywords: keywords,
          levelCode: formData.curriculum_level_code,
          countryCode: formData.curriculum_country_code || undefined,
          confidenceThreshold: 0.85,
        });
      } catch (error) {
        console.error('Auto-link failed:', error);
        // Don't block the save - just log the error
      }
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
      keywords: topic.keywords || [],
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
    setKeywordsInput((topic.keywords || []).join(', '));
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
      keywords: [],
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
    setKeywordsInput('');
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
          <p className="text-muted-foreground">Manage topics within categories and curriculum</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTopic ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
            </DialogHeader>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('admin.curriculum.curriculumRequired')}</AlertTitle>
              <AlertDescription>
                Topics must align with the official curriculum. Populate all curriculum fields (Country, Level, Subject, Domain, Subdomain).
              </AlertDescription>
            </Alert>
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
              
              {/* Keywords Input */}
              <div>
                <Label htmlFor="keywords" className="flex items-center gap-2">
                  <Tags className="w-4 h-4" />
                  Keywords (comma-separated)
                </Label>
                <Input
                  id="keywords"
                  placeholder="multiplication, tables, produit, calcul mental"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add keywords to help AI match this topic to the correct learning objectives automatically
                </p>
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
                  topicName={formData.name}
                  topicDescription={formData.description}
                  topicKeywords={keywordsInput.split(',').map(k => k.trim()).filter(Boolean)}
                  curriculumSubjectId={formData.curriculum_subject_id || undefined}
                  curriculumDomainId={formData.curriculum_domain_id || undefined}
                  curriculumSubdomainId={formData.curriculum_subdomain_id || undefined}
                  curriculumLevelCode={formData.curriculum_level_code || undefined}
                  curriculumCountryCode={formData.curriculum_country_code || undefined}
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
              
              <Button type="submit" className="w-full" disabled={createTopic.isPending || updateTopic.isPending || autoLinkObjectives.isPending}>
                {autoLinkObjectives.isPending ? 'Linking Objectives...' : editingTopic ? 'Update Topic' : 'Create Topic'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Curriculum Filter View */}
      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-3">Filter by Curriculum</h3>
        <CurriculumSelector
          value={{
            curriculum_country_code: curriculumFilters.countryCode || null,
            curriculum_level_code: curriculumFilters.levelCode || null,
            curriculum_subject_id: curriculumFilters.subjectId || null,
            curriculum_domain_id: null,
            curriculum_subdomain_id: null,
          }}
          onChange={(selection) => setCurriculumFilters({
            countryCode: selection.curriculum_country_code || '',
            levelCode: selection.curriculum_level_code || '',
            subjectId: selection.curriculum_subject_id || '',
          })}
        />
        {curriculumFilters.countryCode && curriculumFilters.levelCode && curriculumFilters.subjectId && (
          <Badge variant="secondary" className="mt-2">
            {programTopicsLoading ? t('common.loading') : `${programTopics.length} ${t('admin.curriculum.topicsMatchingCurriculum')}`}
          </Badge>
        )}
      </Card>

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
              <TableHead>Keywords</TableHead>
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
                <TableCell colSpan={10} className="text-center text-muted-foreground">
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
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[150px]">
                  {(topic.keywords || []).slice(0, 2).map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                  {(topic.keywords || []).length > 2 && (
                    <Badge variant="outline" className="text-xs">+{(topic.keywords || []).length - 2}</Badge>
                  )}
                </div>
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