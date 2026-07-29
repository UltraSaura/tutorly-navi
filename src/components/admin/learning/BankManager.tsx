import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Settings, ChevronRight, ChevronDown, Sparkles, BookOpen } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuestionEditor } from './QuestionEditor';
import { AssignmentEditor } from './AssignmentEditor';
import { TranscriptQuizGenerator } from './TranscriptQuizGenerator';
import { TopicQuizGenerator } from './TopicQuizGenerator';
import { useQuizBankQuestions, useCreateQuizBankQuestion, useUpdateQuizBankQuestion, useDeleteQuizBankQuestion } from '@/hooks/useManageQuizBanks';
import { useQuizBankAssignments, useCreateQuizBankAssignment, useUpdateQuizBankAssignment, useDeleteQuizBankAssignment } from '@/hooks/useManageQuizBanks';
import type { Question } from '@/types/quiz-bank';
import { getSchoolLevelLabel, getSchoolLevelOptions, normalizeSchoolLevel } from '@/domain/schoolLevels';

const BankManager = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<(Question & { dbId?: string; position?: number }) | null>(null);
  const [assignmentEditorOpen, setAssignmentEditorOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [topicGeneratorOpen, setTopicGeneratorOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [schoolLevelFilter, setSchoolLevelFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    time_limit_sec: null as number | null,
    shuffle: true,
  });
  const [dialogTopicId, setDialogTopicId] = useState<string>('');
  const [dialogStepName, setDialogStepName] = useState<string>('');

  // Fetch all quiz banks
  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['quiz-banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_banks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['quiz-bank-filter-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['quiz-bank-filter-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_categories')
        .select('id, subject_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['quiz-bank-filter-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, category_id, curriculum_level_code, lesson_content')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bankAssignmentsIndex = [] } = useQuery({
    queryKey: ['quiz-bank-filter-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_bank_assignments')
        .select('bank_id, topic_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch questions for selected bank
  const { data: questions = [] } = useQuizBankQuestions(selectedBank || undefined);
  const createQuestion = useCreateQuizBankQuestion();
  const updateQuestion = useUpdateQuizBankQuestion();
  const deleteQuestion = useDeleteQuizBankQuestion();

  // Fetch assignments for selected bank
  const { data: assignments = [] } = useQuizBankAssignments(selectedBank || undefined);
  const createAssignment = useCreateQuizBankAssignment();
  const updateAssignment = useUpdateQuizBankAssignment();
  const deleteAssignment = useDeleteQuizBankAssignment();
  const defaultAssignmentTopicId = editingAssignment?.topic_id || assignments.find((assignment: any) => assignment.topic_id)?.topic_id || null;

  const categorySubjectMap = useMemo(
    () => new Map(categories.filter((category: any) => category?.id).map((category: any) => [category.id, category.subject_id])),
    [categories],
  );

  const subjectNameMap = useMemo(
    () => new Map(subjects.filter((subject: any) => subject?.id).map((subject: any) => [subject.id, subject.name])),
    [subjects],
  );

  const topicMap = useMemo(() => {
    return new Map(topics.filter((topic: any) => topic?.id).map((topic: any) => [topic.id, {
      ...topic,
      subject_id: topic.category_id ? categorySubjectMap.get(topic.category_id) ?? null : null,
      normalized_level: normalizeSchoolLevel(topic.curriculum_level_code),
    }]));
  }, [topics, categorySubjectMap]);

  const visibleTopics = useMemo(() => {
    const validTopics = topics.filter((topic: any) => topic?.id);
    if (subjectFilter === 'all') return validTopics;
    return validTopics.filter((topic: any) => {
      const subjectId = topic.category_id ? categorySubjectMap.get(topic.category_id) : null;
      return subjectId === subjectFilter;
    });
  }, [topics, subjectFilter, categorySubjectMap]);

  const decoratedBanks = useMemo(() => {
    const assignmentTopicMap = new Map<string, string[]>();
    bankAssignmentsIndex.forEach((assignment: any) => {
      if (!assignment.bank_id || !assignment.topic_id) return;
      const existing = assignmentTopicMap.get(assignment.bank_id) || [];
      if (!existing.includes(assignment.topic_id)) existing.push(assignment.topic_id);
      assignmentTopicMap.set(assignment.bank_id, existing);
    });

    return banks.map((bank: any) => {
      const sourceTopicIds = 'source_topic_ids' in bank ? bank.source_topic_ids : null;
      const primaryTopicId = 'primary_topic_id' in bank ? bank.primary_topic_id : null;
      const schoolLevels = 'school_levels' in bank ? bank.school_levels : null;
      const subjectId = 'subject_id' in bank ? bank.subject_id : null;
      const sourceLanguage = 'source_language' in bank ? bank.source_language : null;

      const topicIds: string[] = Array.isArray(sourceTopicIds) && sourceTopicIds.length > 0
        ? bank.source_topic_ids
        : (primaryTopicId ? [primaryTopicId] : (assignmentTopicMap.get(bank.id) || []));
      const primaryTopic = topicIds.map((topicId) => topicMap.get(topicId)).find(Boolean) || null;
      const effectiveSubjectId = subjectId || primaryTopic?.subject_id || null;
      const effectiveLevel = (Array.isArray(schoolLevels) && schoolLevels[0]) || primaryTopic?.normalized_level || null;
      const effectiveLanguage = sourceLanguage || 'unknown';

      return {
        ...bank,
        effectiveTopicIds: topicIds,
        effectiveSubjectId,
        effectiveSubjectName: effectiveSubjectId ? subjectNameMap.get(effectiveSubjectId) || 'Unknown subject' : 'Unassigned',
        effectivePrimaryTopicName: primaryTopic?.name || 'Unassigned',
        effectiveSchoolLevel: effectiveLevel,
        effectiveSchoolLevelLabel: effectiveLevel ? getSchoolLevelLabel(effectiveLevel) : 'Unassigned',
        effectiveLanguage,
      };
    });
  }, [banks, bankAssignmentsIndex, subjectNameMap, topicMap]);

  const filteredBanks = useMemo(() => {
    return decoratedBanks.filter((bank: any) => {
      if (subjectFilter !== 'all' && bank.effectiveSubjectId !== subjectFilter) return false;
      if (topicFilter !== 'all' && !bank.effectiveTopicIds.includes(topicFilter)) return false;
      if (schoolLevelFilter !== 'all' && normalizeSchoolLevel(bank.effectiveSchoolLevel) !== normalizeSchoolLevel(schoolLevelFilter)) return false;
      if (languageFilter !== 'all' && bank.effectiveLanguage !== languageFilter) return false;
      return true;
    });
  }, [decoratedBanks, subjectFilter, topicFilter, schoolLevelFilter, languageFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('quiz_banks')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-banks'] });
      toast.success('Quiz bank created successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create quiz bank');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase
        .from('quiz_banks')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-banks'] });
      toast.success('Quiz bank updated successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update quiz bank');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quiz_banks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-banks'] });
      if (selectedBank === id) setSelectedBank(null);
      toast.success('Quiz bank deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete quiz bank');
    },
  });

  const getTopicSteps = (topicId: string): Array<{ step_name: string }> => {
    const topic = topics.find((t: any) => t.id === topicId);
    const steps = (topic?.lesson_content as any)?.steps;
    return Array.isArray(steps) ? steps : [];
  };

  const buildAutoTitle = (topicId: string, stepName: string) => {
    const topic = topics.find((t: any) => t.id === topicId);
    if (!topic) return '';
    return stepName ? `${topic.name} — ${stepName}` : topic.name;
  };

  const resetForm = () => {
    const preselectedTopicId = topicFilter !== 'all' ? topicFilter : '';
    const preselectedTopic = topics.find((t: any) => t.id === preselectedTopicId);
    setDialogTopicId(preselectedTopicId);
    setDialogStepName('');
    setFormData({
      id: '',
      title: preselectedTopic ? preselectedTopic.name : '',
      description: '',
      time_limit_sec: null,
      shuffle: true,
    });
    setEditingBank(null);
  };

  const handleDialogTopicChange = (topicId: string) => {
    setDialogTopicId(topicId);
    setDialogStepName('');
    setFormData(prev => ({ ...prev, title: buildAutoTitle(topicId, '') }));
  };

  const handleDialogStepChange = (stepName: string) => {
    setDialogStepName(stepName);
    setFormData(prev => ({ ...prev, title: buildAutoTitle(dialogTopicId, stepName) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingBank) {
      await updateMutation.mutateAsync({ id: editingBank.id, ...formData });
    } else {
      // Generate ID if not provided
      const bankId = formData.id || `bank-${Date.now()}`;
      await createMutation.mutateAsync({ ...formData, id: bankId });
    }
  };

  const handleEdit = (bank: any) => {
    setEditingBank(bank);
    setFormData({
      id: bank.id,
      title: bank.title || '',
      description: bank.description || '',
      time_limit_sec: bank.time_limit_sec,
      shuffle: bank.shuffle ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz bank? This will also delete all questions and assignments.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleQuestionSave = async (question: Question, position: number) => {
    if (!selectedBank) return;

    if (editingQuestion?.dbId) {
      await updateQuestion.mutateAsync({
        dbId: editingQuestion.dbId,
        bankId: selectedBank,
        question,
        position,
      });
    } else {
      await createQuestion.mutateAsync({
        bankId: selectedBank,
        question,
        position,
      });
    }
    setQuestionEditorOpen(false);
    setEditingQuestion(null);
  };

  const handleQuestionEdit = (question: Question & { dbId?: string; position?: number }) => {
    setEditingQuestion(question);
    setQuestionEditorOpen(true);
  };

  const handleQuestionDelete = async (dbId: string) => {
    if (!selectedBank) return;
    if (confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion.mutateAsync({ dbId, bankId: selectedBank });
    }
  };

  const handleAssignmentSave = async (assignmentData: any) => {
    if (!selectedBank) return;

    if (editingAssignment) {
      await updateAssignment.mutateAsync({
        id: editingAssignment.id,
        ...assignmentData,
      });
    } else {
      await createAssignment.mutateAsync({
        bank_id: selectedBank,
        ...assignmentData,
      });
    }
    setAssignmentEditorOpen(false);
    setEditingAssignment(null);
  };

  const handleAssignmentEdit = (assignment: any) => {
    setEditingAssignment(assignment);
    setAssignmentEditorOpen(true);
  };

  const handleAssignmentDelete = async (id: string) => {
    if (!selectedBank) return;
    if (confirm('Are you sure you want to delete this assignment?')) {
      await deleteAssignment.mutateAsync({ id, bankId: selectedBank });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quiz Banks</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTopicGeneratorOpen(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Generate from Topics
          </Button>
          <Button variant="outline" onClick={() => setGeneratorOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate from Transcripts
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Quiz Bank
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBank ? 'Edit Quiz Bank' : 'Create Quiz Bank'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">Bank ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., fra-add-01-bank"
                  required={!editingBank}
                  disabled={!!editingBank}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Unique identifier (cannot be changed after creation)
                </p>
              </div>

              {!editingBank && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Topic</Label>
                    <Select value={dialogTopicId} onValueChange={handleDialogTopicChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Sélectionner un topic…" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {dialogTopicId && getTopicSteps(dialogTopicId).length > 0 && (
                    <div className="flex-1">
                      <Label>Étape progressive</Label>
                      <Select value={dialogStepName} onValueChange={handleDialogStepChange}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Toutes les étapes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Toutes les étapes</SelectItem>
                          {getTopicSteps(dialogTopicId).map((s) => (
                            <SelectItem key={s.step_name} value={s.step_name}>{s.step_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Addition de base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="time_limit_sec">Time Limit (seconds)</Label>
                <Input
                  id="time_limit_sec"
                  type="number"
                  value={formData.time_limit_sec || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    time_limit_sec: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="Optional (leave empty for no limit)"
                  min="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shuffle"
                  checked={formData.shuffle}
                  onChange={(e) => setFormData({ ...formData, shuffle: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="shuffle">Shuffle questions</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogTopicId('');
                    setDialogStepName('');
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingBank ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="mb-1 block">School level</Label>
          <Select value={schoolLevelFilter} onValueChange={setSchoolLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {getSchoolLevelOptions('fr').map((level) => (
                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Subject</Label>
          <Select value={subjectFilter} onValueChange={(value) => { setSubjectFilter(value); setTopicFilter('all'); }}>
            <SelectTrigger>
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.filter((subject: any) => subject?.id).map((subject: any) => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Topic</Label>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {visibleTopics.filter((topic: any) => topic?.id).map((topic: any) => (
                <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Language</Label>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        {filteredBanks.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No quiz banks found. Create one to get started.
          </div>
        ) : (
          filteredBanks.map((bank: any) => (
            <div key={bank.id} className="border rounded-lg">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedBank(selectedBank === bank.id ? null : bank.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {selectedBank === bank.id ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{bank.title}</div>
                    <div className="text-sm text-muted-foreground font-mono">{bank.id}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-1 rounded bg-muted">{bank.effectiveSchoolLevelLabel}</span>
                      <span className="px-2 py-1 rounded bg-muted">{bank.effectiveSubjectName}</span>
                      <span className="px-2 py-1 rounded bg-muted">{bank.effectivePrimaryTopicName}</span>
                      <span className="px-2 py-1 rounded bg-muted">{bank.effectiveLanguage === 'fr' ? 'Français' : bank.effectiveLanguage === 'en' ? 'English' : bank.effectiveLanguage}</span>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(bank)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(bank.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedBank === bank.id && (
                <div className="border-t p-4">
                  <Tabs defaultValue="questions" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
                      <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="questions">
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              setEditingQuestion(null);
                              setQuestionEditorOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Question
                          </Button>
                        </div>

                        {questions.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No questions yet. Add your first question!
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {questions.map((q, idx) => (
                              <div key={q.id} className="border rounded-lg p-4 flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">
                                      Q{idx + 1} ({q.kind})
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {q.points || 1} point{q.points !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <p className="font-medium">{q.prompt}</p>
                                  {q.hint && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Hint: {q.hint}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQuestionEdit(q)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQuestionDelete(q.dbId!)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="assignments">
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              setEditingAssignment(null);
                              setAssignmentEditorOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Assignment
                          </Button>
                        </div>

                        {assignments.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No assignments yet. Create an assignment to control when "Test yourself" buttons appear!
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {assignments.map((assignment: any) => (
                              <div key={assignment.id} className="border rounded-lg p-4 flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-1 rounded ${assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                      {assignment.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  {assignment.topic_id && (
                                    <p className="text-sm">
                                      <span className="font-medium">Topic-based:</span> Show after {assignment.trigger_after_n_videos} video(s) completed
                                    </p>
                                  )}
                                  {assignment.video_ids && assignment.video_ids.length > 0 && (
                                    <p className="text-sm">
                                      <span className="font-medium">Video set:</span> Show after {assignment.min_completed_in_set} of {assignment.video_ids.length} video(s) completed
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAssignmentEdit(assignment)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAssignmentDelete(assignment.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {questionEditorOpen && (
        <QuestionEditor
          question={editingQuestion || undefined}
          isOpen={questionEditorOpen}
          onClose={() => {
            setQuestionEditorOpen(false);
            setEditingQuestion(null);
          }}
          onSave={handleQuestionSave}
          position={editingQuestion?.position ?? questions.length}
        />
      )}

      {assignmentEditorOpen && (
        <AssignmentEditor
          assignment={editingAssignment}
          defaultTopicId={defaultAssignmentTopicId}
          isOpen={assignmentEditorOpen}
          onClose={() => {
            setAssignmentEditorOpen(false);
            setEditingAssignment(null);
          }}
          onSave={handleAssignmentSave}
        />
      )}

      {generatorOpen && (
        <TranscriptQuizGenerator
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
        />
      )}

      {topicGeneratorOpen && (
        <TopicQuizGenerator
          open={topicGeneratorOpen}
          onOpenChange={setTopicGeneratorOpen}
        />
      )}
    </div>
  );
};

export default BankManager;
