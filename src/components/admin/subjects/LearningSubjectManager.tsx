import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Image as ImageIcon, Loader2, Pencil, Save, Upload, X } from 'lucide-react';
import { useAdmin, Subject as ChatSubject } from '@/context/AdminContext';
import { useLearningSubjects, useCreateSubject, useUpdateSubject } from '@/hooks/useManageLearningContent';
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
  order_index: number;
  is_active: boolean;
}

type ManagedSubjectRow = {
  id: string;
  chatSubject?: ChatSubject;
  learningSubject?: LearningSubject;
};

const normalizeName = (value: string) => value.trim().toLowerCase();

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
    order_index: chatSubject?.order || 0,
    is_active: chatSubject?.active ?? true,
  };
};

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
  const { subjects: chatSubjects } = useAdmin();
  const { data: learningSubjects = [], isLoading } = useLearningSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, LearningSubjectData>>({});
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);

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
      }));

    return [...learningRows, ...unsyncedChatRows].sort((a, b) => {
      const aOrder = a.learningSubject?.order_index ?? a.chatSubject?.order ?? 0;
      const bOrder = b.learningSubject?.order_index ?? b.chatSubject?.order ?? 0;
      return aOrder - bOrder;
    });
  }, [chatSubjects, learningSubjects]);

  useEffect(() => {
    const initialData: Record<string, LearningSubjectData> = {};
    managedRows.forEach(row => {
      initialData[row.id] = createInitialData(row);
    });
    setEditedData(initialData);
  }, [managedRows]);

  const handleEdit = (rowId: string) => {
    setEditingSubjectId(rowId);
  };

  const handleCancel = () => {
    const resetData: Record<string, LearningSubjectData> = {};
    managedRows.forEach(row => {
      resetData[row.id] = createInitialData(row);
    });
    setEditedData(resetData);
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

    try {
      const payload = {
        name: data.name.trim(),
        slug: data.slug.trim(),
        icon_name: data.icon_name,
        icon_image_url: data.icon_image_url,
        color_scheme: data.color_scheme,
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
      }

      setEditingSubjectId(null);
      toast.success(`Learning subject "${payload.name}" saved successfully`);
    } catch (error) {
      console.error('Error saving learning subject:', error);
      toast.error(`Failed to save learning subject: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading learning subjects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Platform Subjects</h2>
          <p className="text-muted-foreground">
            Manage learning-specific properties for your subjects. These settings control how subjects appear in the learning platform.
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Subject display name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Upload icon image</TableHead>
              <TableHead>Fallback icon</TableHead>
              <TableHead>Color Scheme</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managedRows.map((row) => {
              const isEditing = editingSubjectId === row.id;
              const data = editedData[row.id];
              const isSynced = !!row.learningSubject;
              const isUploading = uploadingRowId === row.id;

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
                      <span className="line-clamp-2 text-xs font-medium">{data.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-48">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label htmlFor={`subject-name-${row.id}`} className="sr-only">
                          Subject display name
                        </Label>
                        <Input
                          id={`subject-name-${row.id}`}
                          value={data.name}
                          onChange={(e) => updateField(row.id, 'name', e.target.value)}
                          placeholder="Subject display name"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="font-medium">{data.name}</span>
                        {!isSynced && (
                          <span className="block text-xs text-muted-foreground">(Not synced)</span>
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
                          Upload icon image
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
                            Remove image
                          </Button>
                        ) : null}
                      </div>
                    ) : data.icon_image_url ? (
                      <span className="text-sm text-muted-foreground">Image uploaded</span>
                    ) : (
                      <span className="inline-flex items-center text-sm text-muted-foreground">
                        <ImageIcon className="mr-1 h-4 w-4" />
                        No image
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
                      <ColorPicker
                        value={data.color_scheme}
                        onChange={(color) => updateField(row.id, 'color_scheme', color)}
                        format="rgb"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-border flex-shrink-0"
                          style={{ backgroundColor: data.color_scheme }}
                        />
                        <span className="text-sm font-mono">{data.color_scheme}</span>
                      </div>
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
                        {data.is_active ? 'Active' : 'Inactive'}
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
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(row.id)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
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
          <strong>Note:</strong> This section manages learning-specific properties for subjects.
          Subject icon images and display names are separate fields.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Subject display name:</strong> Text shown below the image on learning tiles</li>
          <li><strong>Upload icon image:</strong> Image shown above the subject name; fallback icon is used when no image is uploaded</li>
          <li><strong>Fallback icon:</strong> Lucide icon name or emoji used only when no icon image exists</li>
          <li><strong>Color Scheme:</strong> Tile background color supporting RGB or hex values</li>
          <li><strong>Order:</strong> Display order in the learning platform</li>
          <li><strong>Active:</strong> Whether the subject is visible in the learning platform</li>
        </ul>
      </div>
    </div>
  );
};

export default LearningSubjectManager;
