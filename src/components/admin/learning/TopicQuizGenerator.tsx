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
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Check, BookOpen, Pencil, Trash2, Play, Layers } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGenerateQuizFromTopics } from '@/hooks/useGenerateQuizFromTopics';
import { QuestionEditor } from './QuestionEditor';
import { QuizPreviewDialog } from './QuizPreviewDialog';
import { QuizOverlay } from '@/components/learning/QuizOverlay';
import { useAuth } from '@/context/AuthContext';
import { useLearningVideos } from '@/hooks/useManageLearningContent';
import type { Question, QuizBank } from '@/types/quiz-bank';
import { ensureQuizBank } from '@/types/quiz-bank';
import type { Video } from '@/types/learning';
import { dedupeSchoolLevels, getSchoolLevelLabel, normalizeSchoolLevel } from '@/domain/schoolLevels';
import { SUPPORTED_LANGUAGES } from '@/locales';

interface TopicQuizGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type Step = 'topics' | 'settings' | 'generating' | 'review' | 'preview' | 'try' | 'save' | 'assign';

const QUESTION_TYPES = [
  { value: 'single',       label: 'Single Choice',          description: 'One correct answer from 4 options' },
  { value: 'multi',        label: 'Multiple Choice',         description: 'Several correct answers from 4 options' },
  { value: 'numeric',      label: 'Numeric',                 description: 'Type a number as the answer' },
  { value: 'ordering',     label: 'Ordering',                description: 'Arrange items in the correct sequence' },
  { value: 'slider',       label: '🎚️ Slider',               description: 'Drag a slider to the correct value — great for estimating quantities' },
  { value: 'match',        label: '🔗 Match pairs',           description: 'Connect left-column items to their right-column matches' },
  { value: 'fill_expr',    label: '🧩 Fill the expression',  description: 'Drag number chips into blanks to complete a formula' },
  { value: 'visual_pie',   label: '🥧 Visual (Pie chart)',   description: 'Interact with a fraction pie chart' },
  { value: 'visual_angle', label: '📐 Visual (Angle)',       description: 'Measure or identify angles' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

// 'preview' and 'try' are overlays — not numbered steps in the indicator
const STEP_ORDER: Step[] = ['topics', 'settings', 'review', 'save', 'assign'];

function normalizeTopicDisplayKey(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bfractions\b/g, 'fraction')
    .replace(/\bdecimaux\b/g, 'decimal')
    .replace(/\bnombres\b/g, 'nombre');
}

function isSchemaMismatchError(error: unknown) {
  const message = String((error as any)?.message || '');
  return (
    message.includes('Could not find') ||
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('violates foreign key constraint')
  );
}

export function TopicQuizGenerator({ open, onOpenChange, onSaved }: TopicQuizGeneratorProps) {
  const queryClient = useQueryClient();
  const generateMutation = useGenerateQuizFromTopics();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('topics');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings
  const [questionCount, setQuestionCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['single', 'multi']);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [mixMode, setMixMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('fr');

  // Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Save form
  const [bankTitle, setBankTitle] = useState('');
  const [bankDescription, setBankDescription] = useState('');

  // Assign step state
  const [savedBankId, setSavedBankId] = useState<string | null>(null);
  const [assignContext, setAssignContext] = useState<'practice' | 'lesson' | 'both'>('practice');
  const [assignTriggerVideoId, setAssignTriggerVideoId] = useState<string | null>(null);
  // Use first selected topic for video picker; user already chose topic(s) in step 1
  const assignTopicId = selectedTopicIds[0] ?? '';
  const { data: assignVideos = [] } = useLearningVideos(assignTopicId || undefined);

  // Ephemeral QuizBank used for the interactive "Try it" preview
  const tryBank = useMemo<QuizBank>(() => ensureQuizBank({
    quizBankId: '__preview__',
    title: bankTitle || 'Preview',
    shuffle: false,
    questions: generatedQuestions,
  }), [generatedQuestions, bankTitle]);

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

  const { data: countries = [] } = useQuery({
    queryKey: ['learning-countries-for-gen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('code, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch active categories once; subject options are derived from matching topics
  const { data: categories = [] } = useQuery({
    queryKey: ['learning-categories-for-gen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_categories')
        .select('id, subject_id')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: schoolLevels = [] } = useQuery({
    queryKey: ['school-levels-for-gen', selectedCountryCode],
    queryFn: async () => {
      if (!selectedCountryCode) return [];
      const { data, error } = await supabase
        .from('school_levels')
        .select('level_code, level_name, country_code, sort_order')
        .eq('country_code', selectedCountryCode)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCountryCode,
  });

  // Fetch active topics once; curriculum scoping stays normalized client-side
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['learning-topics-for-gen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, description, category_id, curriculum_country_code, curriculum_level_code, curriculum_subject_id, curriculum_subject_id_uuid')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
  });

  const categorySubjectMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.subject_id])),
    [categories],
  );

  const countryScopedTopics = useMemo(() => {
    if (!selectedCountryCode) return [];
    return topics.filter(
      (topic) =>
        String(topic.curriculum_country_code || '').trim().toLowerCase() ===
        String(selectedCountryCode).trim().toLowerCase()
    );
  }, [topics, selectedCountryCode]);

  const levelScopedTopics = useMemo(() => {
    if (!selectedSchoolLevel) return [];
    return countryScopedTopics.filter(
      (topic) => normalizeSchoolLevel(topic.curriculum_level_code) === normalizeSchoolLevel(selectedSchoolLevel)
    );
  }, [countryScopedTopics, selectedSchoolLevel]);

  const resolveTopicSubjectId = (topic: (typeof topics)[number]) =>
    topic.curriculum_subject_id_uuid ||
    topic.curriculum_subject_id ||
    (topic.category_id ? categorySubjectMap.get(topic.category_id) : null);

  const visibleSubjects = useMemo(() => {
    const subjectIds = new Set(
      levelScopedTopics
        .map((topic) => resolveTopicSubjectId(topic))
        .filter(Boolean)
    );
    return subjects.filter((subject) => subjectIds.has(subject.id));
  }, [subjects, levelScopedTopics]);

  const filteredTopics = useMemo(() => {
    const subjectFiltered = selectedSubjectId
      ? levelScopedTopics.filter((topic) => {
          const subjectId = resolveTopicSubjectId(topic);
          return subjectId === selectedSubjectId;
        })
      : [];
    const dedupedTopics = Array.from(
      subjectFiltered.reduce((map, topic) => {
        const key = normalizeTopicDisplayKey(topic.name);
        if (!map.has(key)) {
          map.set(key, topic);
        }
        return map;
      }, new Map<string, (typeof subjectFiltered)[number]>()).values()
    );
    if (!searchQuery.trim()) return dedupedTopics;
    const q = searchQuery.toLowerCase();
    return dedupedTopics.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [levelScopedTopics, searchQuery, selectedSubjectId]);

  const selectedTopicLevel = useMemo(() => {
    const selectedTopics = topics.filter(topic => selectedTopicIds.includes(topic.id));
    const levels = Array.from(new Set(selectedTopics.map(topic => normalizeSchoolLevel(topic.curriculum_level_code)).filter(Boolean)));
    return levels[0] ?? null;
  }, [selectedTopicIds, topics]);

  const selectedTopicLevelLabel = selectedTopicLevel ? getSchoolLevelLabel(selectedTopicLevel) : '';

  const availableTopicLevels = useMemo(() => {
    return dedupeSchoolLevels(schoolLevels).map((level) => ({
      value: normalizeSchoolLevel(level.level_code) || level.level_code,
      label: level.level_name || getSchoolLevelLabel(level.level_code),
    }));
  }, [schoolLevels]);

  const selectedTopicNames = selectedTopicIds
    .map(topicId => topics.find(topic => topic.id === topicId)?.name)
    .filter(Boolean) as string[];
  const assignTopicName = selectedTopicNames[0] ?? 'Selected topic';
  const sortedAssignVideos = [...assignVideos].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const toggleTopic = (topicId: string) => {
    const topic = topics.find((item) => item.id === topicId);
    const topicLevel = normalizeSchoolLevel(topic?.curriculum_level_code);
    if (selectedTopicLevel && topicLevel && topicLevel !== selectedTopicLevel) {
      toast.error('Selected topics must belong to the same school level');
      return;
    }
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
        language: selectedLanguage,
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
      const fullBankPayload = {
        id: bankId,
        title: bankTitle,
        description: bankDescription || null,
        shuffle: true,
        source_type: 'topic_generated',
        subject_id: selectedSubjectId,
        primary_topic_id: selectedTopicIds[0] ?? null,
        source_topic_ids: selectedTopicIds,
        school_levels: selectedTopicLevel ? [selectedTopicLevel] : [],
        source_language: selectedLanguage,
      };
      const legacyBankPayload = {
        id: bankId,
        title: bankTitle,
        description: bankDescription || null,
        shuffle: true,
      };

      const { error: bankError } = await supabase.from('quiz_banks').insert(fullBankPayload as any);
      if (bankError) {
        if (!isSchemaMismatchError(bankError)) throw bankError;
        const { error: legacyBankError } = await supabase.from('quiz_banks').insert(legacyBankPayload);
        if (legacyBankError) throw legacyBankError;
      }

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

      toast.success('Quiz bank saved! Now choose where to assign it.');
      queryClient.invalidateQueries({ queryKey: ['quiz-banks'] });
      setSavedBankId(bankId);
      setAssignContext('practice');
      setAssignTriggerVideoId(null);
      setStep('assign');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!savedBankId || selectedTopicIds.length === 0) return;
    if ((assignContext === 'lesson' || assignContext === 'both') && !assignTriggerVideoId) {
      toast.error('Please select the trigger video');
      return;
    }
    setIsSaving(true);
    try {
      for (const topicId of selectedTopicIds) {
        const isPrimaryTopic = topicId === assignTopicId;
        const contextForTopic = assignContext === 'both' && !isPrimaryTopic ? 'practice' : assignContext;
        await createAssignmentWithFallback({
          bank_id: savedBankId,
          topic_id: topicId,
          is_active: true,
          display_context: contextForTopic,
          trigger_video_id: (contextForTopic !== 'practice') ? assignTriggerVideoId : null,
          trigger_after_n_videos: contextForTopic === 'practice' ? 0 : null,
          video_ids: null,
          min_completed_in_set: null,
        });
        if (assignContext === 'lesson') break;
      }
      queryClient.invalidateQueries({ queryKey: ['quiz-banks-all'] });
      toast.success('Quiz assigned successfully!');
      onSaved?.();
      handleReset();
      onOpenChange(false);
    } catch (e) {
      toast.error('Assignment failed — the quiz was saved but not assigned.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipAssign = async () => {
    // Auto-assign as practice-only so the quiz is immediately available
    if (savedBankId) {
      setIsSaving(true);
      try {
        await Promise.all(selectedTopicIds.map(topicId =>
          createAssignmentWithFallback({
            bank_id: savedBankId,
            topic_id: topicId,
            is_active: true,
            display_context: 'practice',
            trigger_after_n_videos: 0,
            trigger_video_id: null,
            video_ids: null,
            min_completed_in_set: null,
          })
        ));
        queryClient.invalidateQueries({ queryKey: ['quiz-banks-all'] });
        onSaved?.();
      } catch (error) {
        toast.error('Assignment failed — the quiz was saved but not assigned.');
        return;
      } finally {
        setIsSaving(false);
      }
    }
    handleReset();
    onOpenChange(false);
  };

  const createAssignmentWithFallback = async (assignment: {
    bank_id: string;
    topic_id?: string | null;
    trigger_after_n_videos?: number | null;
    video_ids?: string[] | null;
    min_completed_in_set?: number | null;
    is_active?: boolean;
    display_context?: 'practice' | 'lesson' | 'both';
    trigger_video_id?: string | null;
  }) => {
    const { error } = await supabase.from('quiz_bank_assignments').insert(assignment as any);
    if (!error) return;
    if (!isSchemaMismatchError(error)) throw error;

    const legacyAssignment = {
      bank_id: assignment.bank_id,
      topic_id: assignment.topic_id ?? null,
      is_active: assignment.is_active ?? true,
      trigger_after_n_videos: assignment.display_context === 'lesson' ? 1 : 0,
      video_ids: assignment.video_ids ?? null,
      min_completed_in_set: assignment.min_completed_in_set ?? null,
    };
    const { error: legacyError } = await supabase.from('quiz_bank_assignments').insert(legacyAssignment);
    if (legacyError) throw legacyError;
  };

  const handleReset = () => {
    setStep('topics');
    setSelectedCountryCode('');
    setSelectedSubjectId('');
    setSelectedSchoolLevel('');
    setSelectedTopicIds([]);
    setSearchQuery('');
    setQuestionCount(5);
    setQuestionTypes(['single', 'multi']);
    setDifficulty('medium');
    setMixMode(false);
    setSelectedLanguage('fr');
    setGeneratedQuestions([]);
    setEditingQuestionIndex(null);
    setBankTitle('');
    setBankDescription('');
    setSavedBankId(null);
    setAssignContext('practice');
    setAssignTriggerVideoId(null);
  };

  const canProceedFromTopics = !!selectedCountryCode && !!selectedSchoolLevel && !!selectedSubjectId && selectedTopicIds.length > 0;
  const canProceedFromSettings = !!selectedLanguage && (mixMode || questionTypes.length > 0) && questionCount >= 1;

  const getStepIndex = (s: Step) => {
    if (s === 'generating') return STEP_ORDER.indexOf('review');
    if (s === 'preview' || s === 'try') return STEP_ORDER.indexOf('review');
    return STEP_ORDER.indexOf(s);
  };

  return (
    <>
    {/* Read-only preview — answers revealed, no interaction needed */}
    <QuizPreviewDialog
      questions={generatedQuestions}
      open={step === 'preview'}
      onClose={() => setStep('review')}
      onProceedToSave={() => setStep('save')}
    />

    {/* Interactive try-it — full QuizOverlay to test sliders, match, fill-expr etc. */}
    {step === 'try' && user && generatedQuestions.length > 0 && (
      <QuizOverlay
        bank={tryBank}
        userId={user.id}
        onClose={() => setStep('review')}
      />
    )}

    <Dialog open={open && step !== 'preview' && step !== 'try'} onOpenChange={(newOpen) => { if (!newOpen) handleReset(); onOpenChange(newOpen); }}>
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
              <Select value={selectedCountryCode} onValueChange={(value) => {
                setSelectedCountryCode(value);
                setSelectedSchoolLevel('');
                setSelectedSubjectId('');
                setSelectedTopicIds([]);
                setSearchQuery('');
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSchoolLevel} onValueChange={(value) => {
                setSelectedSchoolLevel(value);
                setSelectedSubjectId('');
                setSelectedTopicIds([]);
              }} disabled={!selectedCountryCode}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="School level" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopicLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubjectId} onValueChange={(value) => {
                setSelectedSubjectId(value);
                setSelectedTopicIds([]);
              }} disabled={!selectedCountryCode || !selectedSchoolLevel}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {visibleSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                disabled={!selectedCountryCode || !selectedSchoolLevel || !selectedSubjectId}
              />
            </div>

            <ScrollArea className="border rounded-lg h-[50vh]">
              {!selectedCountryCode ? (
                <div className="p-8 text-center text-muted-foreground">Select a country to start filtering topics</div>
              ) : !selectedSchoolLevel ? (
                <div className="p-8 text-center text-muted-foreground">Select a school level for this country</div>
              ) : !selectedSubjectId ? (
                <div className="p-8 text-center text-muted-foreground">Select a subject to see matching topics</div>
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
                          {topic.curriculum_level_code && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {getSchoolLevelLabel(topic.curriculum_level_code)}
                            </div>
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
                <div className="text-sm">
                  <div><strong>{selectedTopicIds.length}</strong> topic{selectedTopicIds.length !== 1 ? 's' : ''} selected</div>
                  {selectedTopicLevelLabel && (
                    <div className="text-muted-foreground mt-1">School level: {selectedTopicLevelLabel}</div>
                  )}
                </div>
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
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">

              {/* Row: count + difficulty side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">Questions</Label>
                  <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10, 15, 20].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">Difficulty</Label>
                  <div className="flex gap-1 h-8">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(d.value as typeof difficulty)}
                        className={`flex-1 rounded-md text-xs font-medium border transition-colors ${
                          difficulty === d.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((language) => (
                        <SelectItem key={language} value={language}>
                          {language === 'fr' ? 'Français' : 'English'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">School level</Label>
                  <div className="h-8 rounded-md border px-3 flex items-center text-sm text-muted-foreground">
                    {selectedTopicLevelLabel || 'Inherited from topic'}
                  </div>
                </div>
              </div>

              {/* Question types */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Question Types</Label>

                {/* Mix toggle */}
                <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors mb-2 ${
                  mixMode ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                }`}>
                  <Checkbox checked={mixMode} onCheckedChange={(checked) => setMixMode(!!checked)} />
                  <div>
                    <div className="text-xs font-medium">🎲 Mix (Auto)</div>
                    <div className="text-[11px] text-muted-foreground">AI picks the best type for each question</div>
                  </div>
                </label>

                {/* Type cards — 2 columns with description */}
                <div className={`grid grid-cols-2 gap-1.5 ${mixMode ? 'opacity-40 pointer-events-none' : ''}`}>
                  {QUESTION_TYPES.map((type) => {
                    const selected = questionTypes.includes(type.value);
                    return (
                      <label
                        key={type.value}
                        className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            if (checked) setQuestionTypes(prev => [...prev, type.value]);
                            else setQuestionTypes(prev => prev.filter(t => t !== type.value));
                          }}
                          className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium leading-tight">{type.label}</div>
                          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{type.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t mt-3">
              <Button variant="outline" size="sm" onClick={() => setStep('topics')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={!canProceedFromSettings}>
                <Sparkles className="w-4 h-4 mr-1" /> Generate Questions
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
                <Button
                  variant="outline"
                  onClick={handleStartPreview}
                  disabled={generatedQuestions.length === 0}
                  title="See correct answers without interacting"
                >
                  <Check className="w-4 h-4 mr-2" /> Verify answers
                </Button>
                <Button
                  onClick={() => setStep('try')}
                  disabled={generatedQuestions.length === 0}
                  title="Try the exercises interactively — test sliders, match, fill-expr etc."
                >
                  <Play className="w-4 h-4 mr-2" /> Try it
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

        {/* Step: Preview — render the full animated QuizOverlay */}
        {step === 'preview' && null}

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

        {/* Step: Assign */}
        {step === 'assign' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="rounded-lg border bg-muted/40 p-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic</Label>
                <div className="mt-1 font-medium">{assignTopicName}</div>
                {selectedTopicIds.length > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Practice assignment will be created for all {selectedTopicIds.length} selected topics. Video placement uses the first selected topic.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Show this quiz in</Label>
                <RadioGroup
                  value={assignContext}
                  onValueChange={(value) => {
                    setAssignContext(value as 'practice' | 'lesson' | 'both');
                    setAssignTriggerVideoId(null);
                  }}
                  className="space-y-2"
                >
                  <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    assignContext === 'practice' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}>
                    <RadioGroupItem value="practice" className="mt-0.5" />
                    <BookOpen className="h-4 w-4 text-violet-500 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">Practice page only</div>
                      <p className="text-xs text-muted-foreground">Always available in "S'entraîner par thème", no video required.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    assignContext === 'lesson' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}>
                    <RadioGroupItem value="lesson" className="mt-0.5" />
                    <Play className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">After a specific video</div>
                      <p className="text-xs text-muted-foreground">Appears in the lesson player after the selected video is completed.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    assignContext === 'both' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}>
                    <RadioGroupItem value="both" className="mt-0.5" />
                    <Layers className="h-4 w-4 text-green-500 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">Both</div>
                      <p className="text-xs text-muted-foreground">Available on the practice page and after the selected video.</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {(assignContext === 'lesson' || assignContext === 'both') && (
                <div>
                  <Label className="mb-1.5 block">Trigger video</Label>
                  {sortedAssignVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground border rounded-lg p-3">
                      No videos found for {assignTopicName}.
                    </p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      {sortedAssignVideos.map((video: Video, index: number) => {
                        const isSelected = assignTriggerVideoId === video.id;
                        return (
                          <button
                            key={video.id}
                            type="button"
                            onClick={() => setAssignTriggerVideoId(video.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              index > 0 ? 'border-t border-border/60' : ''
                            } ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{video.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between mt-auto pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('save')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkipAssign} disabled={isSaving}>
                  Use practice only
                </Button>
                <Button onClick={handleAssign} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</> : 'Finish'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
