import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useLearningVideos, useLearningQuizzes, useCreateQuiz, useUpdateQuiz, useDeleteQuiz } from '@/hooks/useManageLearningContent';
import type { Quiz } from '@/types/learning';

const QuizManager = () => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
<<<<<<< HEAD
  const [quizCurriculum, setQuizCurriculum] = useState({
    countryCode: '',
    levelCode: '',
    subjectId: '',
  });
=======
>>>>>>> learning
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('all');
  const { data: videos = [], isLoading: videosLoading, error: videosError } = useLearningVideos();
  const { data: quizzes = [], isLoading: quizzesLoading, error: quizzesError } = useLearningQuizzes(selectedVideoId || undefined);
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const deleteQuiz = useDeleteQuiz();
  
<<<<<<< HEAD
  // Filter videos by selected curriculum topic
  const filteredVideos = videos.filter(video => {
    if (!quizCurriculum.subjectId) return true; // Show all if no filter
    return availableTopics.some(topic => topic.id === video.topic_id);
  });

=======
>>>>>>> learning
  // Filter quizzes by language
  const filteredQuizzes = selectedLanguageFilter === 'all' 
    ? quizzes 
    : quizzes.filter(q => (q.language || 'en') === selectedLanguageFilter);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    video_id: '',
    question: '',
    question_latex: '',
    options: ['', ''],
    correct_answer_index: 0,
    explanation: '',
    timestamp_seconds: 0,
    xp_reward: 0,
    order_index: 0,
    language: 'en',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingQuiz) {
      await updateQuiz.mutateAsync({ id: editingQuiz.id, ...formData });
    } else {
      await createQuiz.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      video_id: quiz.video_id,
      question: quiz.question,
      question_latex: quiz.question_latex || '',
      options: quiz.options,
      correct_answer_index: quiz.correct_answer_index,
      explanation: quiz.explanation,
      timestamp_seconds: quiz.timestamp_seconds,
      xp_reward: quiz.xp_reward,
      order_index: quiz.order_index,
      language: quiz.language || 'en',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      await deleteQuiz.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setEditingQuiz(null);
    setFormData({
      video_id: selectedVideoId,
      question: '',
      question_latex: '',
      options: ['', ''],
      correct_answer_index: 0,
      explanation: '',
      timestamp_seconds: 0,
      xp_reward: 0,
      order_index: 0,
      language: 'en',
    });
  };

  if (videosError) {
    return <div className="text-destructive">Error loading videos: {videosError.message}</div>;
  }

  if (quizzesError) {
    return <div className="text-destructive">Error loading quizzes: {quizzesError.message}</div>;
  }

  if (videosLoading) {
    return <div className="text-muted-foreground">Loading videos...</div>;
  }

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ''] });
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ 
      ...formData, 
      options: newOptions,
      correct_answer_index: formData.correct_answer_index >= index ? Math.max(0, formData.correct_answer_index - 1) : formData.correct_answer_index
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Video Quizzes</h2>
          <p className="text-muted-foreground">Manage quizzes within videos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Add New Quiz'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="video_id">Video</Label>
                <Select value={formData.video_id} onValueChange={(value) => setFormData({ ...formData, video_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select video" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>{video.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="question_latex">Question (LaTeX - optional)</Label>
                <Input
                  id="question_latex"
                  value={formData.question_latex}
                  onChange={(e) => setFormData({ ...formData, question_latex: e.target.value })}
                  placeholder="For math questions: x^2 + 2x + 1"
                />
              </div>
              <div>
                <Label>Options</Label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    {formData.options.length > 2 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeOption(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
              <div>
                <Label htmlFor="correct_answer_index">Correct Answer</Label>
                <Select 
                  value={formData.correct_answer_index.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, correct_answer_index: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.options.map((option, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Option {index + 1}: {option || '(empty)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timestamp_seconds">Timestamp (seconds)</Label>
                  <Input
                    id="timestamp_seconds"
                    type="number"
                    value={formData.timestamp_seconds}
                    onChange={(e) => setFormData({ ...formData, timestamp_seconds: parseInt(e.target.value) })}
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
                <div>
                  <Label htmlFor="order_index">Order Index</Label>
                  <Input
                    id="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label>Select Video</Label>
          <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a video to view quizzes" />
            </SelectTrigger>
            <SelectContent>
              {videos.map((video) => (
                <SelectItem key={video.id} value={video.id}>{video.title}</SelectItem>
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

      {!selectedVideoId ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a video above to view and manage quizzes
        </div>
      ) : quizzesLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading quizzes...
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuizzes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No quizzes found for this video
                </TableCell>
              </TableRow>
            ) : (
              filteredQuizzes.map((quiz) => (
            <TableRow key={quiz.id}>
              <TableCell className="font-medium max-w-md truncate">{quiz.question}</TableCell>
              <TableCell>
                {quiz.language === 'fr' ? '🇫🇷' : quiz.language === 'ar' ? '🇸🇦' : '🇺🇸'}
              </TableCell>
              <TableCell>{videos.find(v => v.id === quiz.video_id)?.title}</TableCell>
              <TableCell>{quiz.timestamp_seconds}s</TableCell>
              <TableCell>{quiz.xp_reward} XP</TableCell>
              <TableCell>{quiz.order_index}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(quiz)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(quiz.id)}>
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

export default QuizManager;
