import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Check, BookOpen, Pencil, Trash2, Play, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGenerateQuizFromTopics } from '@/hooks/useGenerateQuizFromTopics';
import { QuestionEditor } from './QuestionEditor';
import { QuestionCard } from '@/components/learning/QuestionCard';
import { gradeQuiz } from '@/utils/quizEvaluation';
import type { Question } from '@/types/quiz-bank';

interface TopicQuizGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type Step = 'topics' | 'settings' | 'generating' | 'review' | 'preview' | 'save';

const QUESTION_TYPES = [
  { value: 'single', label: 'Single Choice', description: 'One correct answer' },
  { value: 'multi', label: 'Multi Choice', description: 'Multiple correct answers' },
  { value: 'numeric', label: 'Numeric', description: 'Number answer' },
  { value: 'ordering', label: 'Ordering', description: 'Arrange in sequence' },
  { value: 'visual_pie', label: 'Visual (Pie)', description: 'Pie chart fraction question' },
  { value: 'visual_angle', label: 'Visual (Angle)', description: 'Angle measurement question' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const STEP_ORDER: Step[] = ['topics', 'settings', 'review', 'preview', 'save'];

export function TopicQuizGenerator({ open, onOpenChange, onSaved }: TopicQuizGeneratorProps) {
  const queryClient = useQueryClient();
  const generateMutation = useGenerateQuizFromTopics();

  const [step, setStep] = useState<Step>('topics');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['single', 'multi']);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [mixMode, setMixMode] = useState(false);

  // Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Preview state
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // Save form
  const [bankTitle, setBankTitle] = useState('');
  const [bankDescription, setBankDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['learning-subjects'],
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

  // Fetch categories for selected subject
  const { data: categories = [] } = useQuery({
    queryKey: ['learning-categories', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      const { data, error } = await supabase
        .from('learning_categories')
        .select('id, name')
        .eq('subject_id', selectedSubjectId)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSubjectId,
  });

  // Fetch topics for selected subject's categories
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['learning-topics-for-gen', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId || categories.length === 0) return [];
      const categoryIds = categories.map(c => c.id);
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, description, category_id')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSubjectId && categories.length > 0,
  });

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const q = searchQuery.toLowerCase();
    return topics.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [topics, searchQuery]);

  const previewResults = useMemo(() => {
    if (!previewSubmitted) return null;
    return gradeQuiz(generatedQuestions, previewAnswers);
  }, [previewSubmitted, generatedQuestions, previewAnswers]);

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const handleGenerate = async () => {
    if (selectedTopicIds.length === 0) {
      toast.error('Please select at least one topic');
      return;
    }
    setStep('generating');
    try {
      const result = await generateMutation.mutateAsync({
        topicIds: selectedTopicIds,
        questionCount,
        questionTypes: mixMode ? ['mix'] : questionTypes,
        difficulty,
        mix: mixMode,
      });
      setGeneratedQuestions(result.questions);
      setStep('review');
      toast.success(`Generated ${result.questions.length} questions!`);
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate questions');
      setStep('settings');
    }
  };

  const handleQuestionUpdate = (index: number, question: Question) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      updated[index] = question;
      return updated;
    });
    setEditingQuestionIndex(null);
  };

  const handleQuestionDelete = (index: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartPreview = () => {
    setPreviewAnswers({});
    setPreviewSubmitted(false);
    setCurrentPreviewIndex(0);
    setStep('preview');
  };

  const handleSave = async () => {
    if (!bankTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (generatedQuestions.length === 0) {
      toast.error('No questions to save');
      return;
    }
    setIsSaving(true);
    try {
      const bankId = `bank-${Date.now()}`;
      const { error: bankError } = await supabase.from('quiz_banks').insert({
        id: bankId,
        title: bankTitle,
        description: bankDescription || null,
        shuffle: true,
        source_type: 'topic_generated',
      });
      if (bankError) throw bankError;

      const questionsToInsert = generatedQuestions.map((q, index) => {
        const uniqueId = `q-${bankId}-${index}-${Math.random().toString(36).slice(2, 8)}`;
        return {
          id: uniqueId,
          bank_id: bankId,
          payload: { ...q, id: uniqueId },
          position: index,
        };
      });
      const { error: questionsError } = await supabase.from('quiz_bank_questions').insert(questionsToInsert);
      if (questionsError) throw questionsError;

      toast.success('Quiz bank saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['quiz-banks'] });
      onSaved?.();
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('topics');
    setSelectedSubjectId('');
    setSelectedTopicIds([]);
    setSearchQuery('');
    setQuestionCount(5);
    setQuestionTypes(['single', 'multi']);
    setDifficulty('medium');
    setMixMode(false);
    setGeneratedQuestions([]);
    setEditingQuestionIndex(null);
    setPreviewAnswers({});
    setPreviewSubmitted(false);
    setCurrentPreviewIndex(0);
    setBankTitle('');
    setBankDescription('');
  };

  const canProceedFromTopics = selectedTopicIds.length > 0;
  const canProceedFromSettings = (mixMode || questionTypes.length > 0) && questionCount >= 1;

  const getStepIndex = (s: Step) => {
    if (s === 'generating') return STEP_ORDER.indexOf('review');
    return STEP_ORDER.indexOf(s);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { if (!newOpen) handleReset(); onOpenChange(newOpen); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Generate Quiz from Topics
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className="flex items-center">
              {i > 0 && <div className="w-6 h-0.5 bg-border mx-1" />}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                getStepIndex(step) === i ? 'bg-primary text-primary-foreground' :
                getStepIndex(step) > i ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
            </div>
          ))}
        </div>

        {/* Step: Topics */}
        {step === 'topics' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4 flex gap-3">
              <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setSelectedTopicIds([]); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            <ScrollArea className="border rounded-lg h-[50vh]">
              {!selectedSubjectId ? (
                <div className="p-8 text-center text-muted-foreground">Select a subject to see topics</div>
              ) : topicsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading topics...</div>
              ) : filteredTopics.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No topics found</div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredTopics.map((topic) => {
                    const isSelected = selectedTopicIds.includes(topic.id);
                    return (
                      <div
                        key={topic.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleTopic(topic.id)}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{topic.name}</div>
                          {topic.description && (
                            <div className="text-sm text-muted-foreground truncate">{topic.description}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {selectedTopicIds.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                <span className="text-sm">
                  <strong>{selectedTopicIds.length}</strong> topic{selectedTopicIds.length !== 1 ? 's' : ''} selected
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTopicIds([])}>Clear</Button>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep('settings')} disabled={!canProceedFromTopics}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Settings */}
        {step === 'settings' && (
          <div className="flex-1 flex flex-col">
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">Number of Questions</Label>
                <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10, 15, 20].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Question Types</Label>
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors mb-3 ${
                  mixMode ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                }`}>
                  <Checkbox checked={mixMode} onCheckedChange={(checked) => setMixMode(!!checked)} />
                  <div>
                    <div className="font-medium">🎲 Mix (Auto)</div>
                    <div className="text-sm text-muted-foreground">AI picks the best question type for each question</div>
                  </div>
                </label>
                <div className={`grid grid-cols-2 gap-3 ${mixMode ? 'opacity-50 pointer-events-none' : ''}`}>
                  {QUESTION_TYPES.map((type) => (
                    <label key={type.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      questionTypes.includes(type.value) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}>
                      <Checkbox
                        checked={questionTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          if (checked) setQuestionTypes(prev => [...prev, type.value]);
                          else setQuestionTypes(prev => prev.filter(t => t !== type.value));
                        }}
                      />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Difficulty</Label>
                <RadioGroup value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                  <div className="flex gap-4">
                    {DIFFICULTIES.map((d) => (
                      <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value={d.value} />
                        <span>{d.label}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="flex justify-between mt-auto pt-6">
              <Button variant="outline" onClick={() => setStep('topics')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleGenerate} disabled={!canProceedFromSettings}>
                <Sparkles className="w-4 h-4 mr-2" /> Generate Questions
              </Button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Generating Questions</h3>
            <p className="text-muted-foreground text-center">
              Analyzing {selectedTopicIds.length} topic{selectedTopicIds.length !== 1 ? 's' : ''}...<br />
              This may take 10-30 seconds.
            </p>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4">
              <p className="text-muted-foreground">
                {generatedQuestions.length} question{generatedQuestions.length !== 1 ? 's' : ''} generated. Review and edit before saving.
              </p>
            </div>

            <ScrollArea className="border rounded-lg h-[50vh]">
              <div className="p-4 space-y-3">
                {generatedQuestions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">{question.kind}</span>
                        </div>
                        <p className="font-medium">{question.prompt}</p>
                        {question.hint && <p className="text-sm text-muted-foreground mt-1">Hint: {question.hint}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingQuestionIndex(index)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleQuestionDelete(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep('settings')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('save')} disabled={generatedQuestions.length === 0}>
                  Skip to Save <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={handleStartPreview} disabled={generatedQuestions.length === 0}>
                  <Play className="w-4 h-4 mr-2" /> Preview Quiz
                </Button>
              </div>
            </div>

            {editingQuestionIndex !== null && (
              <QuestionEditor
                isOpen={true}
                onClose={() => setEditingQuestionIndex(null)}
                question={generatedQuestions[editingQuestionIndex]}
                onSave={(q) => handleQuestionUpdate(editingQuestionIndex, q)}
                position={editingQuestionIndex}
              />
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0">
            {!previewSubmitted ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Question {currentPreviewIndex + 1} of {generatedQuestions.length}</span>
                    <span className="text-sm text-muted-foreground">{Object.keys(previewAnswers).length} answered</span>
                  </div>
                  <Progress value={((currentPreviewIndex + 1) / generatedQuestions.length) * 100} className="h-2" />
                </div>

                <ScrollArea className="flex-1">
                  <div className="flex justify-center py-4">
                    <QuestionCard
                      question={generatedQuestions[currentPreviewIndex]}
                      onChange={(value) => {
                        setPreviewAnswers(prev => ({
                          ...prev,
                          [generatedQuestions[currentPreviewIndex].id]: value
                        }));
                      }}
                    />
                  </div>
                </ScrollArea>

                <div className="flex justify-center gap-1.5 py-3 flex-wrap">
                  {generatedQuestions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentPreviewIndex(i)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        i === currentPreviewIndex ? 'bg-primary scale-125' :
                        q.id in previewAnswers ? 'bg-primary/50' : 'bg-muted hover:bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => { setPreviewAnswers({}); setPreviewSubmitted(false); setCurrentPreviewIndex(0); setStep('review'); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Review
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentPreviewIndex(prev => Math.max(0, prev - 1))} disabled={currentPreviewIndex === 0}>Previous</Button>
                    {currentPreviewIndex < generatedQuestions.length - 1 ? (
                      <Button onClick={() => setCurrentPreviewIndex(prev => prev + 1)}>Next</Button>
                    ) : (
                      <Button onClick={() => setPreviewSubmitted(true)}>
                        <Check className="w-4 h-4 mr-2" /> Submit Quiz
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-6">
                  <h3 className="text-2xl font-bold mb-2">Quiz Results</h3>
                  <p className="text-4xl font-bold text-primary mb-2">{previewResults?.score}/{previewResults?.maxScore}</p>
                  <p className="text-muted-foreground">{Math.round(((previewResults?.score || 0) / (previewResults?.maxScore || 1)) * 100)}% correct</p>
                  <Progress value={((previewResults?.score || 0) / (previewResults?.maxScore || 1)) * 100} className="h-3 mt-4 max-w-xs mx-auto" />
                </div>

                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {previewResults?.details.map((detail, index) => {
                      const question = generatedQuestions.find(q => q.id === detail.questionId);
                      return (
                        <div key={detail.questionId} className={`flex items-center gap-3 p-3 rounded-lg ${
                          detail.correct ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
                        }`}>
                          {detail.correct ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">Q{index + 1}:</span>{' '}
                            <span className="text-sm truncate">{question?.prompt}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{detail.correct ? `+${detail.points}` : '0'} pts</span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => { setPreviewAnswers({}); setPreviewSubmitted(false); setCurrentPreviewIndex(0); setStep('review'); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit Questions
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setPreviewAnswers({}); setPreviewSubmitted(false); setCurrentPreviewIndex(0); }}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Retake
                    </Button>
                    <Button onClick={() => setStep('save')}>
                      Continue to Save <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Save */}
        {step === 'save' && (
          <div className="flex-1 flex flex-col">
            <div className="space-y-4">
              <div>
                <Label htmlFor="bank-title">Quiz Bank Title *</Label>
                <Input id="bank-title" value={bankTitle} onChange={(e) => setBankTitle(e.target.value)} placeholder="e.g., Fractions Quiz - Generated" />
              </div>
              <div>
                <Label htmlFor="bank-description">Description (optional)</Label>
                <Textarea id="bank-description" value={bankDescription} onChange={(e) => setBankDescription(e.target.value)} placeholder="Optional description" rows={3} />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Summary</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {generatedQuestions.length} questions</li>
                  <li>• Generated from {selectedTopicIds.length} topic{selectedTopicIds.length !== 1 ? 's' : ''}</li>
                  <li>• Difficulty: {difficulty}</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between mt-auto pt-6">
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleSave} disabled={!bankTitle.trim() || isSaving}>
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Check className="w-4 h-4 mr-2" /> Save Quiz Bank</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
