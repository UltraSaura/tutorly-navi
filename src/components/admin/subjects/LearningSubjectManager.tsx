import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Image as ImageIcon, Loader2, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { useAdmin, Subject as ChatSubject } from '@/context/AdminContext';
import { useLearningSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/hooks/useManageLearningContent';
import { DynamicIcon } from './DynamicIcon';
import type { Subject as LearningSubject } from '@/types/learning';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { iconOptions } from './DynamicIcon';
import { toast } from 'sonner';
import { ColorPicker } from './ColorPicker';
import { supabase } from '@/integrations/supabase/client';

interface LearningSubjectData {
  name: string;
  slug: string;
  icon_name: string;
  icon_image_url: string | null;
  color_scheme: string;
  icon_color: string;
  text_color: string;
  font_size: number;
  font_family: string;
  lesson_text_color: string;
  lesson_font_size: number;
  lesson_font_family: string;
  practice_text_color: string;
  practice_font_size: number;
  practice_font_family: string;
  display_context: 'learn' | 'practice' | 'both';
  order_index: number;
  is_active: boolean;
}

type ManagedSubjectRow = {
  id: string;
  chatSubject?: ChatSubject;
  learningSubject?: LearningSubject;
};

const normalizeName = (value: string) => value.trim().toLowerCase();
const DEFAULT_SUBJECT_TEXT_COLOR = '#050B34';
const DEFAULT_SUBJECT_FONT_SIZE = 18;
const DEFAULT_SUBJECT_FONT_FAMILY = 'Poppins, sans-serif';
const SUBJECT_FONT_OPTIONS = [
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'SF Pro Display', value: "'SF Pro Display', system-ui, sans-serif" },
  { label: 'System Sans', value: 'system-ui, sans-serif' },
  { label: 'Georgia Serif', value: 'Georgia, serif' },
] as const;
const STYLE_CONTEXTS = [
  {
    key: 'lesson',
    label: 'Lesson',
    colorField: 'lesson_text_color',
    sizeField: 'lesson_font_size',
    familyField: 'lesson_font_family',
  },
  {
    key: 'practice',
    label: 'Practice',
    colorField: 'practice_text_color',
    sizeField: 'practice_font_size',
    familyField: 'practice_font_family',
  },
] as const;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createInitialData = (row: ManagedSubjectRow): LearningSubjectData => {
  if (row.learningSubject) {
    return {
      name: row.learningSubject.name,
      slug: row.learningSubject.slug,
      icon_name: row.learningSubject.icon_name,
      icon_image_url: row.learningSubject.icon_image_url,
      color_scheme: row.learningSubject.color_scheme,
      icon_color: row.learningSubject.icon_color ?? '#1e3a5f',
      text_color: row.learningSubject.text_color ?? DEFAULT_SUBJECT_TEXT_COLOR,
      font_size: row.learningSubject.font_size ?? DEFAULT_SUBJECT_FONT_SIZE,
      font_family: row.learningSubject.font_family ?? DEFAULT_SUBJECT_FONT_FAMILY,
      lesson_text_color: row.learningSubject.lesson_text_color ?? row.learningSubject.text_color ?? DEFAULT_SUBJECT_TEXT_COLOR,
      lesson_font_size: row.learningSubject.lesson_font_size ?? row.learningSubject.font_size ?? DEFAULT_SUBJECT_FONT_SIZE,
      lesson_font_family: row.learningSubject.lesson_font_family ?? row.learningSubject.font_family ?? DEFAULT_SUBJECT_FONT_FAMILY,
      practice_text_color: row.learningSubject.practice_text_color ?? row.learningSubject.text_color ?? DEFAULT_SUBJECT_TEXT_COLOR,
      practice_font_size: row.learningSubject.practice_font_size ?? row.learningSubject.font_size ?? DEFAULT_SUBJECT_FONT_SIZE,
      practice_font_family: row.learningSubject.practice_font_family ?? row.learningSubject.font_family ?? DEFAULT_SUBJECT_FONT_FAMILY,
      display_context: row.learningSubject.display_context ?? 'both',
      order_index: row.learningSubject.order_index,
      is_active: row.learningSubject.is_active,
    };
  }

  const chatSubject = row.chatSubject;
  const name = chatSubject?.name || 'New subject';

  return {
    name,
    slug: slugify(name),
    icon_name: chatSubject?.icon || 'book',
    icon_image_url: null,
    color_scheme: '#dbeafe',
    icon_color: '#1e3a5f',
    text_color: DEFAULT_SUBJECT_TEXT_COLOR,
    font_size: DEFAULT_SUBJECT_FONT_SIZE,
    font_family: DEFAULT_SUBJECT_FONT_FAMILY,
    lesson_text_color: DEFAULT_SUBJECT_TEXT_COLOR,
    lesson_font_size: DEFAULT_SUBJECT_FONT_SIZE,
    lesson_font_family: DEFAULT_SUBJECT_FONT_FAMILY,
    practice_text_color: DEFAULT_SUBJECT_TEXT_COLOR,
    practice_font_size: DEFAULT_SUBJECT_FONT_SIZE,
    practice_font_family: DEFAULT_SUBJECT_FONT_FAMILY,
    display_context: 'both',
    order_index: chatSubject?.order || 0,
    is_active: chatSubject?.active ?? true,
  };
};

const createBlankSubjectData = (orderIndex: number): LearningSubjectData => ({
  name: 'New subject',
  slug: 'new-subject',
  icon_name: 'book',
  icon_image_url: null,
  color_scheme: '#dbeafe',
  icon_color: '#1e3a5f',
  text_color: DEFAULT_SUBJECT_TEXT_COLOR,
  font_size: DEFAULT_SUBJECT_FONT_SIZE,
  font_family: DEFAULT_SUBJECT_FONT_FAMILY,
  lesson_text_color: DEFAULT_SUBJECT_TEXT_COLOR,
  lesson_font_size: DEFAULT_SUBJECT_FONT_SIZE,
  lesson_font_family: DEFAULT_SUBJECT_FONT_FAMILY,
  practice_text_color: DEFAULT_SUBJECT_TEXT_COLOR,
  practice_font_size: DEFAULT_SUBJECT_FONT_SIZE,
  practice_font_family: DEFAULT_SUBJECT_FONT_FAMILY,
  display_context: 'both',
  order_index: orderIndex,
  is_active: true,
});

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getIconUploadErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('bucket') && lowerMessage.includes('not found')) {
    return 'The subject-icons storage bucket is missing. Apply the latest Supabase migration and try again.';
  }

  if (lowerMessage.includes('row-level security') || lowerMessage.includes('permission')) {
    return 'Upload was blocked by Supabase permissions. Make sure your account has the admin role and the latest storage policies are applied.';
  }

  return message;
};

const LearningSubjectManager = () => {
  const ui = useInterfaceTranslation();
  const queryClient = useQueryClient();
  const { subjects: chatSubjects } = useAdmin();
  const { data: learningSubjects = [], isLoading } = useLearningSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, LearningSubjectData>>({});
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [customRows, setCustomRows] = useState<ManagedSubjectRow[]>([]);
  const [lessonBulkFontSize, setLessonBulkFontSize] = useState<string>(String(DEFAULT_SUBJECT_FONT_SIZE));
  const [practiceBulkFontSize, setPracticeBulkFontSize] = useState<string>(String(DEFAULT_SUBJECT_FONT_SIZE));
  const [lessonBulkFontFamily, setLessonBulkFontFamily] = useState<string>(DEFAULT_SUBJECT_FONT_FAMILY);
  const [practiceBulkFontFamily, setPracticeBulkFontFamily] = useState<string>(DEFAULT_SUBJECT_FONT_FAMILY);
  const [isApplyingLessonBulkFontSize, setIsApplyingLessonBulkFontSize] = useState(false);
  const [isApplyingPracticeBulkFontSize, setIsApplyingPracticeBulkFontSize] = useState(false);
  const [isApplyingLessonBulkFontFamily, setIsApplyingLessonBulkFontFamily] = useState(false);
  const [isApplyingPracticeBulkFontFamily, setIsApplyingPracticeBulkFontFamily] = useState(false);

  const managedRows = useMemo<ManagedSubjectRow[]>(() => {
    const chatByName = new Map(chatSubjects.map(subject => [normalizeName(subject.name), subject]));
    const chatBySlug = new Map(chatSubjects.map(subject => [slugify(subject.name), subject]));
    const learningByName = new Set(learningSubjects.map(subject => normalizeName(subject.name)));
    const learningBySlug = new Set(learningSubjects.map(subject => subject.slug));

    const learningRows = learningSubjects.map(learningSubject => ({
      id: `learning:${learningSubject.id}`,
      learningSubject,
      chatSubject: chatBySlug.get(learningSubject.slug) || chatByName.get(normalizeName(learningSubject.name)),
    }));

    const unsyncedChatRows = chatSubjects
      .filter(chatSubject => {
        const chatName = normalizeName(chatSubject.name);
        const chatSlug = slugify(chatSubject.name);
        return !learningByName.has(chatName) && !learningBySlug.has(chatSlug);
      })
      .map(chatSubject => ({
        id: `chat:${chatSubject.id}`,
        chatSubject,
        learningSubject: undefined as undefined | (typeof learningSubjects)[number],
      }));

    return [...learningRows, ...unsyncedChatRows, ...customRows].sort((a, b) => {
      const aOrder = (a as ManagedSubjectRow).learningSubject?.order_index ?? (a as ManagedSubjectRow).chatSubject?.order ?? 0;
      const bOrder = (b as ManagedSubjectRow).learningSubject?.order_index ?? (b as ManagedSubjectRow).chatSubject?.order ?? 0;
      return aOrder - bOrder;
    });
  }, [chatSubjects, customRows, learningSubjects]);

  useEffect(() => {
    setEditedData(prev => {
      const next: Record<string, LearningSubjectData> = {};
      managedRows.forEach(row => {
        // Keep in-progress edits; only initialise rows that have no data yet
        // or are not currently being edited (so closed rows pick up DB changes).
        if (prev[row.id] && row.id === editingSubjectId) {
          next[row.id] = prev[row.id];
        } else {
          next[row.id] = createInitialData(row);
        }
      });
      return next;
    });
  }, [managedRows, editingSubjectId]);

  useEffect(() => {
    if (learningSubjects.length === 0) return;
    const firstSubject = learningSubjects[0];
    setLessonBulkFontSize(String(firstSubject?.lesson_font_size ?? firstSubject?.font_size ?? DEFAULT_SUBJECT_FONT_SIZE));
    setPracticeBulkFontSize(String(firstSubject?.practice_font_size ?? firstSubject?.font_size ?? DEFAULT_SUBJECT_FONT_SIZE));
    setLessonBulkFontFamily(firstSubject?.lesson_font_family ?? firstSubject?.font_family ?? DEFAULT_SUBJECT_FONT_FAMILY);
    setPracticeBulkFontFamily(firstSubject?.practice_font_family ?? firstSubject?.font_family ?? DEFAULT_SUBJECT_FONT_FAMILY);
  }, [learningSubjects]);

  const handleEdit = (rowId: string) => {
    setEditingSubjectId(rowId);
  };

  const handleAddSubject = () => {
    const rowId = `new:${crypto.randomUUID()}`;
    const maxOrder = managedRows.reduce((max, row) => {
      const order = row.learningSubject?.order_index ?? row.chatSubject?.order ?? 0;
      return Math.max(max, order);
    }, 0);

    setCustomRows(prev => [...prev, { id: rowId }]);
    setEditedData(prev => ({
      ...prev,
      [rowId]: createBlankSubjectData(maxOrder + 1),
    }));
    setEditingSubjectId(rowId);
  };

  const handleCancel = () => {
    const resetData: Record<string, LearningSubjectData> = {};
    managedRows.forEach(row => {
      resetData[row.id] = createInitialData(row);
    });
    setEditedData(resetData);
    setCustomRows([]);
    setEditingSubjectId(null);
  };

  const updateField = (
    rowId: string,
    field: keyof LearningSubjectData,
    value: string | number | boolean | null
  ) => {
    setEditedData(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value,
      },
    }));
  };

  const parseFontSize = (value: string | number) => {
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 12 || parsed > 36) return null;
    return parsed;
  };

  const handleApplyFontSizeToAll = async (
    context: 'lesson' | 'practice',
    value: string,
  ) => {
    const parsedFontSize = parseFontSize(value);
    if (parsedFontSize === null) {
      toast.error('Font size must be a number between 12 and 36');
      return;
    }

    const field = context === 'lesson' ? 'lesson_font_size' : 'practice_font_size';
    const setPending = context === 'lesson' ? setIsApplyingLessonBulkFontSize : setIsApplyingPracticeBulkFontSize;

    setEditedData((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((rowId) => {
        next[rowId] = { ...next[rowId], [field]: parsedFontSize };
      });
      return next;
    });

    if (learningSubjects.length === 0) {
      toast.success(`${context === 'lesson' ? 'Lesson' : ui("Practice")} font size ${parsedFontSize}px applied to local subject rows`);
      return;
    }

    setPending(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ [field]: parsedFontSize })
        .not('id', 'is', null);
      if (error) throw new Error(error.message ?? error.details ?? JSON.stringify(error));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-learning-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['learning-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['practice-subject-buttons'] }),
      ]);

      toast.success(`Applied ${parsedFontSize}px ${context} font size to all subjects`);
    } catch (error) {
      console.error('Error applying bulk font size:', error);
      toast.error(`Failed to apply font size to all subjects: ${error instanceof Error ? error.message : ui("Unknown error")}`);
    } finally {
      setPending(false);
    }
  };

  const handleApplyFontFamilyToAll = async (
    context: 'lesson' | 'practice',
    value: string,
  ) => {
    const fontFamily = value || DEFAULT_SUBJECT_FONT_FAMILY;
    const field = context === 'lesson' ? 'lesson_font_family' : 'practice_font_family';
    const setPending = context === 'lesson' ? setIsApplyingLessonBulkFontFamily : setIsApplyingPracticeBulkFontFamily;

    setEditedData((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((rowId) => {
        next[rowId] = { ...next[rowId], [field]: fontFamily };
      });
      return next;
    });

    if (learningSubjects.length === 0) {
      toast.success(`${context === 'lesson' ? 'Lesson' : ui("Practice")} font style applied to local subject rows`);
      return;
    }

    setPending(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ [field]: fontFamily })
        .neq('id', '');
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-learning-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['learning-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['practice-subject-buttons'] }),
      ]);

      toast.success(`Applied ${context} font style to all subjects`);
    } catch (error) {
      console.error('Error applying bulk font family:', error);
      toast.error(`Failed to apply font style to all subjects: ${error instanceof Error ? error.message : ui("Unknown error")}`);
    } finally {
      setPending(false);
    }
  };

  const handleIconUpload = async (row: ManagedSubjectRow, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    setUploadingRowId(row.id);

    try {
      const subjectKey = row.learningSubject?.id || row.chatSubject?.id || row.id.replace(':', '-');
      const fileName = sanitizeFileName(file.name) || 'subject-icon';
      const formData = new FormData();
      formData.append('file', file, fileName);
      formData.append('subjectKey', subjectKey);

      const { data, error } = await supabase.functions.invoke<{ publicUrl: string }>('subject-icon-upload', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.publicUrl) throw new Error('Upload did not return an image URL');

      updateField(row.id, 'icon_image_url', data.publicUrl);
      toast.success('Subject icon uploaded');
    } catch (error) {
      console.error('Error uploading subject icon:', error);
      toast.error(`Failed to upload icon: ${getIconUploadErrorMessage(error)}`);
    } finally {
      setUploadingRowId(null);
    }
  };

  const handleSave = async (row: ManagedSubjectRow) => {
    const data = editedData[row.id];
    if (!data) return;

    const parsedLessonFontSize = parseFontSize(data.lesson_font_size);
    const parsedPracticeFontSize = parseFontSize(data.practice_font_size);
    if (parsedLessonFontSize === null || parsedPracticeFontSize === null) {
      toast.error('Lesson and Practice font sizes must be numbers between 12 and 36');
      return;
    }

    try {
      const payload = {
        name: data.name.trim(),
        slug: data.slug.trim(),
        icon_name: data.icon_name,
        icon_image_url: data.icon_image_url,
        color_scheme: data.color_scheme,
        icon_color: data.icon_color,
        text_color: data.text_color,
        font_size: parsedLessonFontSize,
        font_family: data.font_family || DEFAULT_SUBJECT_FONT_FAMILY,
        lesson_text_color: data.lesson_text_color,
        lesson_font_size: parsedLessonFontSize,
        lesson_font_family: data.lesson_font_family || DEFAULT_SUBJECT_FONT_FAMILY,
        practice_text_color: data.practice_text_color,
        practice_font_size: parsedPracticeFontSize,
        practice_font_family: data.practice_font_family || DEFAULT_SUBJECT_FONT_FAMILY,
        display_context: data.display_context,
        order_index: data.order_index,
        is_active: data.is_active,
      };

      if (!payload.name || !payload.slug) {
        toast.error('Subject display name and slug are required');
        return;
      }

      if (row.learningSubject) {
        await updateSubject.mutateAsync({
          id: row.learningSubject.id,
          ...payload,
        });
      } else {
        await createSubject.mutateAsync(payload);
        if (row.id.startsWith('new:')) {
          setCustomRows(prev => prev.filter(customRow => customRow.id !== row.id));
        }
      }

      setEditingSubjectId(null);
      toast.success(`Learning subject "${payload.name}" saved successfully`);
    } catch (error) {
      console.error('Error saving learning subject:', error);
      toast.error(`Failed to save learning subject: ${error instanceof Error ? error.message : ui("Unknown error")}`);
    }
  };

  const handleDelete = async (row: ManagedSubjectRow) => {
    const data = editedData[row.id];
    const name = data?.name || row.learningSubject?.name || row.chatSubject?.name || 'this subject';

    if (!row.learningSubject && row.id.startsWith('new:')) {
      setCustomRows(prev => prev.filter(customRow => customRow.id !== row.id));
      setEditedData(prev => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setEditingSubjectId(null);
      return;
    }

    if (!row.learningSubject) return;

    const confirmed = window.confirm(
      `Delete "${name}"? This will also delete categories, topics, videos, and quizzes under this subject.`
    );

    if (!confirmed) return;

    try {
      await deleteSubject.mutateAsync(row.learningSubject.id);
      toast.success(`Learning subject "${name}" deleted`);
    } catch (error) {
      console.error('Error deleting learning subject:', error);
      toast.error(`Failed to delete learning subject: ${error instanceof Error ? error.message : ui("Unknown error")}`);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">{ui("Loading learning subjects...")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{ui("Learning Platform Subjects")}</h2>
          <p className="text-muted-foreground">
            {ui("Manage subject buttons, high-definition icon images, and where each button appears.")}
          </p>
        </div>
        <Button onClick={handleAddSubject}>
          <Plus className="mr-2 h-4 w-4" />
          {ui("Add subject button")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-2">
          <Label htmlFor="lesson-bulk-subject-font-size">{ui("Font size for all lesson subjects")}</Label>
          <Input
            id="lesson-bulk-subject-font-size"
            type="number"
            min={12}
            max={36}
            value={lessonBulkFontSize}
            onChange={(e) => setLessonBulkFontSize(e.target.value)}
            className="w-32"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleApplyFontSizeToAll('lesson', lessonBulkFontSize)}
          disabled={isApplyingLessonBulkFontSize}
        >
          {isApplyingLessonBulkFontSize ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ui("Apply to all lesson subjects")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {ui("Updates lesson subject-title sizes everywhere the Learn tiles appear.")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-2">
          <Label htmlFor="lesson-bulk-subject-font-family">{ui("Font style for all lesson subjects")}</Label>
          <Select value={lessonBulkFontFamily} onValueChange={setLessonBulkFontFamily}>
            <SelectTrigger id="lesson-bulk-subject-font-family" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_FONT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleApplyFontFamilyToAll('lesson', lessonBulkFontFamily)}
          disabled={isApplyingLessonBulkFontFamily}
        >
          {isApplyingLessonBulkFontFamily ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ui("Apply style to all lesson subjects")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {ui("Changes the subject title font family everywhere the Learn tiles appear.")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-2">
          <Label htmlFor="practice-bulk-subject-font-size">{ui("Font size for all practice subjects")}</Label>
          <Input
            id="practice-bulk-subject-font-size"
            type="number"
            min={12}
            max={36}
            value={practiceBulkFontSize}
            onChange={(e) => setPracticeBulkFontSize(e.target.value)}
            className="w-32"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleApplyFontSizeToAll('practice', practiceBulkFontSize)}
          disabled={isApplyingPracticeBulkFontSize}
        >
          {isApplyingPracticeBulkFontSize ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ui("Apply to all practice subjects")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {ui("Updates practice subject-title sizes everywhere the Practice tiles appear.")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-2">
          <Label htmlFor="practice-bulk-subject-font-family">{ui("Font style for all practice subjects")}</Label>
          <Select value={practiceBulkFontFamily} onValueChange={setPracticeBulkFontFamily}>
            <SelectTrigger id="practice-bulk-subject-font-family" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_FONT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleApplyFontFamilyToAll('practice', practiceBulkFontFamily)}
          disabled={isApplyingPracticeBulkFontFamily}
        >
          {isApplyingPracticeBulkFontFamily ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ui("Apply style to all practice subjects")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {ui("Changes the subject title font family everywhere the Practice tiles appear.")}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ui("Preview")}</TableHead>
              <TableHead>{ui("Subject display name")}</TableHead>
              <TableHead>{ui("Slug")}</TableHead>
              <TableHead>{ui("Upload icon image")}</TableHead>
              <TableHead>{ui("Fallback icon")}</TableHead>
              <TableHead>{ui("Color Scheme")}</TableHead>
              <TableHead>{ui("Text Style")}</TableHead>
              <TableHead>{ui("Display")}</TableHead>
              <TableHead>{ui("Order")}</TableHead>
              <TableHead>{ui("Active")}</TableHead>
              <TableHead>{ui("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managedRows.map((row) => {
              const isEditing = editingSubjectId === row.id;
              const data = editedData[row.id];
              const isSynced = !!row.learningSubject;
              const isUploading = uploadingRowId === row.id;
              const canDelete = !!row.learningSubject || row.id.startsWith('new:');

              if (!data) return null;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex w-24 flex-col items-center gap-2 rounded-lg border bg-muted/40 p-2 text-center">
                      {data.icon_image_url ? (
                        <img
                          src={data.icon_image_url}
                          alt=""
                          className="h-12 w-12 rounded-md object-contain"
                        />
                      ) : (
                        <DynamicIcon name={data.icon_name} className="h-8 w-8" />
                      )}
                      <span
                        className="line-clamp-2 font-medium leading-tight"
                        style={{ color: data.lesson_text_color, fontSize: `${data.lesson_font_size}px`, fontFamily: data.lesson_font_family }}
                      >
                        {data.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-48">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label htmlFor={`subject-name-${row.id}`} className="sr-only">
                          {ui("Subject display name")}
                        </Label>
                        <Input
                          id={`subject-name-${row.id}`}
                          value={data.name}
                          onChange={(e) => updateField(row.id, 'name', e.target.value)}
                          placeholder={ui("Subject display name")}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="font-medium">{data.name}</span>
                        {!isSynced && (
                          <span className="block text-xs text-muted-foreground">{ui("(Not synced)")}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={data.slug}
                        onChange={(e) => updateField(row.id, 'slug', e.target.value)}
                        className="w-32"
                        placeholder="subject-slug"
                      />
                    ) : (
                      <span className="text-sm">{data.slug}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label
                          htmlFor={`subject-icon-upload-${row.id}`}
                          className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          {isUploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {ui("Upload icon image")}
                        </Label>
                        <Input
                          id={`subject-icon-upload-${row.id}`}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={isUploading}
                          onChange={(event) => {
                            void handleIconUpload(row, event.target.files?.[0] || null);
                            event.target.value = '';
                          }}
                        />
                        {data.icon_image_url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateField(row.id, 'icon_image_url', null)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {ui("Remove image")}
                          </Button>
                        ) : null}
                      </div>
                    ) : data.icon_image_url ? (
                      <span className="text-sm text-muted-foreground">{ui("Image uploaded")}</span>
                    ) : (
                      <span className="inline-flex items-center text-sm text-muted-foreground">
                        <ImageIcon className="mr-1 h-4 w-4" />
                        {ui("No image")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={data.icon_name}
                        onValueChange={(value) => updateField(row.id, 'icon_name', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map(icon => (
                            <SelectItem key={icon.value} value={icon.value}>
                              {icon.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{data.icon_name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <div>
                          <span className="text-xs text-muted-foreground mb-1 block">{ui("Fond")}</span>
                          <ColorPicker
                            value={data.color_scheme}
                            onChange={(color) => updateField(row.id, 'color_scheme', color)}
                            format="hex"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground mb-1 block">{ui("Icône")}</span>
                          <ColorPicker
                            value={data.icon_color}
                            onChange={(color) => updateField(row.id, 'icon_color', color)}
                            format="hex"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded border border-border flex-shrink-0" style={{ backgroundColor: data.color_scheme }} />
                        <div className="w-5 h-5 rounded border border-border flex-shrink-0" style={{ backgroundColor: data.icon_color }} />
                        <span className="text-xs font-mono text-muted-foreground">{data.color_scheme}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          {STYLE_CONTEXTS.map((styleContext) => (
                            <div key={styleContext.key} className="rounded-lg border p-3">
                              <span className="mb-2 block text-sm font-medium">{styleContext.label} {ui("text style")}</span>
                              <div className="flex flex-col gap-3">
                                <div>
                                  <span className="mb-1 block text-xs text-muted-foreground">{ui("Text color")}</span>
                                  <ColorPicker
                                    value={String(data[styleContext.colorField])}
                                    onChange={(color) => updateField(row.id, styleContext.colorField as keyof LearningSubjectData, color)}
                                    format="hex"
                                  />
                                </div>
                                <div>
                                  <span className="mb-1 block text-xs text-muted-foreground">{ui("Font size")}</span>
                                  <Input
                                    type="number"
                                    min={12}
                                    max={36}
                                    value={Number(data[styleContext.sizeField])}
                                    onChange={(e) => updateField(row.id, styleContext.sizeField as keyof LearningSubjectData, parseInt(e.target.value, 10) || DEFAULT_SUBJECT_FONT_SIZE)}
                                    className="w-24"
                                  />
                                </div>
                                <div>
                                  <span className="mb-1 block text-xs text-muted-foreground">{ui("Font style")}</span>
                                  <Select
                                    value={String(data[styleContext.familyField])}
                                    onValueChange={(value) => updateField(row.id, styleContext.familyField as keyof LearningSubjectData, value)}
                                  >
                                    <SelectTrigger className="w-56">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SUBJECT_FONT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {STYLE_CONTEXTS.map((styleContext) => (
                          <div key={styleContext.key} className="rounded-lg border p-2">
                            <div className="mb-1 text-xs font-medium text-muted-foreground">{styleContext.label}</div>
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded border border-border" style={{ backgroundColor: String(data[styleContext.colorField]) }} />
                              <span className="text-xs font-mono text-muted-foreground">{String(data[styleContext.colorField])}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{Number(data[styleContext.sizeField])}px</div>
                            <div className="text-sm text-muted-foreground">
                              {SUBJECT_FONT_OPTIONS.find((option) => option.value === String(data[styleContext.familyField]))?.label ?? String(data[styleContext.familyField])}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={data.display_context}
                        onValueChange={(value: 'learn' | 'practice' | 'both') => updateField(row.id, 'display_context', value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">{ui("Learn + Practice")}</SelectItem>
                          <SelectItem value="learn">{ui("Learn only")}</SelectItem>
                          <SelectItem value="practice">{ui("Practice only")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">
                        {data.display_context === 'both'
                          ? ui("Learn + Practice")
                          : data.display_context === 'learn'
                            ? ui("Learn only")
                            : ui("Practice only")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={data.order_index}
                        onChange={(e) => updateField(row.id, 'order_index', parseInt(e.target.value, 10) || 0)}
                        className="w-20"
                      />
                    ) : (
                      <span className="text-sm">{data.order_index}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Switch
                        checked={data.is_active}
                        onCheckedChange={(checked) => updateField(row.id, 'is_active', checked)}
                      />
                    ) : (
                      <span className={data.is_active ? 'text-green-600' : 'text-red-600'}>
                        {data.is_active ? ui("Active") : 'Inactive'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSave(row)}
                          disabled={createSubject.isPending || updateSubject.isPending || isUploading}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {ui("Save")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                        >
                          <X className="w-4 h-4 mr-1" />
                          {ui("Cancel")}
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(row)}
                            disabled={deleteSubject.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {ui("Delete")}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(row.id)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          {ui("Edit")}
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(row)}
                            disabled={deleteSubject.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        <p className="mb-2">
          <strong>{ui("Note:")}</strong> {ui("This section manages learning-specific properties for subjects. Subject icon images and display names are separate fields.")}
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>{ui("Subject display name:")}</strong> {ui("Text shown on the Learn and Practice subject buttons")}</li>
          <li><strong>{ui("Upload icon image:")}</strong> {ui("High-definition image shown on subject buttons; fallback icon is used when no image is uploaded")}</li>
          <li><strong>{ui("Fallback icon:")}</strong> {ui("Lucide icon name or emoji used only when no icon image exists")}</li>
          <li><strong>{ui("Color Scheme:")}</strong> {ui("Tile background color supporting RGB or hex values")}</li>
          <li><strong>{ui("Text Style:")}</strong> {ui("Lesson and Practice each have separate title color, size, and font family controls")}</li>
          <li><strong>{ui("Display:")}</strong> {ui("Choose whether the button appears on Learn, Practice, or both")}</li>
          <li><strong>{ui("Order:")}</strong> {ui("Display order in the learning platform")}</li>
          <li><strong>{ui("Active:")}</strong> {ui("Whether the subject button is visible anywhere")}</li>
        </ul>
      </div>
    </div>
  );
};

export default LearningSubjectManager;
