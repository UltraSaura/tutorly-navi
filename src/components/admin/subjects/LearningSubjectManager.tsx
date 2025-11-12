import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X } from 'lucide-react';
import { useAdmin, Subject as ChatSubject } from '@/context/AdminContext';
import { useLearningSubjects, useCreateSubject, useUpdateSubject } from '@/hooks/useManageLearningContent';
import { DynamicIcon } from './DynamicIcon';
import type { Subject as LearningSubject } from '@/types/learning';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { iconOptions } from './DynamicIcon';
import { toast } from 'sonner';

interface LearningSubjectData {
  slug: string;
  icon_name: string;
  color_scheme: string;
  order_index: number;
  is_active: boolean;
}

const LearningSubjectManager = () => {
  const { subjects: chatSubjects } = useAdmin();
  const { data: learningSubjects = [], isLoading } = useLearningSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, LearningSubjectData>>({});

  // Create a map of learning subjects by name for quick lookup
  const learningSubjectsMap = useMemo(() => {
    const map = new Map<string, LearningSubject>();
    learningSubjects.forEach(subject => {
      map.set(subject.name.toLowerCase(), subject);
    });
    return map;
  }, [learningSubjects]);

  // Initialize edited data for all chat subjects
  useEffect(() => {
    const initialData: Record<string, LearningSubjectData> = {};
    chatSubjects.forEach(chatSubject => {
      const learningSubject = learningSubjectsMap.get(chatSubject.name.toLowerCase());
      if (learningSubject) {
        // Subject exists in learning, use its data
        initialData[chatSubject.id] = {
          slug: learningSubject.slug,
          icon_name: learningSubject.icon_name,
          color_scheme: learningSubject.color_scheme,
          order_index: learningSubject.order_index,
          is_active: learningSubject.is_active,
        };
      } else {
        // Subject doesn't exist in learning, create defaults
        initialData[chatSubject.id] = {
          slug: chatSubject.name.toLowerCase().replace(/\s+/g, '-'),
          icon_name: chatSubject.icon || 'book',
          color_scheme: 'bg-blue-500',
          order_index: chatSubject.order || 0,
          is_active: chatSubject.active,
        };
      }
    });
    setEditedData(initialData);
  }, [chatSubjects, learningSubjectsMap]);

  const handleEdit = (chatSubjectId: string) => {
    setEditingSubjectId(chatSubjectId);
  };

  const handleCancel = () => {
    setEditingSubjectId(null);
    // Reset to original values
    const resetData: Record<string, LearningSubjectData> = {};
    chatSubjects.forEach(chatSubject => {
      const learningSubject = learningSubjectsMap.get(chatSubject.name.toLowerCase());
      if (learningSubject) {
        resetData[chatSubject.id] = {
          slug: learningSubject.slug,
          icon_name: learningSubject.icon_name,
          color_scheme: learningSubject.color_scheme,
          order_index: learningSubject.order_index,
          is_active: learningSubject.is_active,
        };
      } else {
        resetData[chatSubject.id] = {
          slug: chatSubject.name.toLowerCase().replace(/\s+/g, '-'),
          icon_name: chatSubject.icon || 'book',
          color_scheme: 'bg-blue-500',
          order_index: chatSubject.order || 0,
          is_active: chatSubject.active,
        };
      }
    });
    setEditedData(resetData);
  };

  const handleSave = async (chatSubjectId: string) => {
    const chatSubject = chatSubjects.find(s => s.id === chatSubjectId);
    if (!chatSubject) return;

    const data = editedData[chatSubjectId];
    if (!data) return;

    const learningSubject = learningSubjectsMap.get(chatSubject.name.toLowerCase());

    try {
      if (learningSubject) {
        // Update existing learning subject
        await updateSubject.mutateAsync({
          id: learningSubject.id,
          name: chatSubject.name, // Keep name in sync
          slug: data.slug,
          icon_name: data.icon_name,
          color_scheme: data.color_scheme,
          order_index: data.order_index,
          is_active: data.is_active,
        });
      } else {
        // Create new learning subject
        await createSubject.mutateAsync({
          name: chatSubject.name,
          slug: data.slug,
          icon_name: data.icon_name,
          color_scheme: data.color_scheme,
          order_index: data.order_index,
          is_active: data.is_active,
        });
      }
      setEditingSubjectId(null);
      toast.success(`Learning subject "${chatSubject.name}" saved successfully`);
    } catch (error) {
      console.error('Error saving learning subject:', error);
      toast.error(`Failed to save learning subject: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateField = (chatSubjectId: string, field: keyof LearningSubjectData, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [chatSubjectId]: {
        ...prev[chatSubjectId],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading learning subjects...</div>;
  }

  // Sort chat subjects by order
  const sortedChatSubjects = [...chatSubjects].sort((a, b) => (a.order || 0) - (b.order || 0));

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
              <TableHead>Icon</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Icon Name</TableHead>
              <TableHead>Color Scheme</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChatSubjects.map((chatSubject) => {
              const isEditing = editingSubjectId === chatSubject.id;
              const data = editedData[chatSubject.id];
              const learningSubject = learningSubjectsMap.get(chatSubject.name.toLowerCase());
              const isSynced = !!learningSubject;

              if (!data) return null;

              return (
                <TableRow key={chatSubject.id}>
                  <TableCell>
                    <DynamicIcon name={data.icon_name} className="w-6 h-6" />
                  </TableCell>
                  <TableCell className="font-medium">
                    {chatSubject.name}
                    {!isSynced && (
                      <span className="ml-2 text-xs text-muted-foreground">(Not synced)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={data.slug}
                        onChange={(e) => updateField(chatSubject.id, 'slug', e.target.value)}
                        className="w-32"
                        placeholder="subject-slug"
                      />
                    ) : (
                      <span className="text-sm">{data.slug}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={data.icon_name}
                        onValueChange={(value) => updateField(chatSubject.id, 'icon_name', value)}
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
                      <Input
                        value={data.color_scheme}
                        onChange={(e) => updateField(chatSubject.id, 'color_scheme', e.target.value)}
                        className="w-32"
                        placeholder="bg-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-mono">{data.color_scheme}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={data.order_index}
                        onChange={(e) => updateField(chatSubject.id, 'order_index', parseInt(e.target.value) || 0)}
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
                        onCheckedChange={(checked) => updateField(chatSubject.id, 'is_active', checked)}
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
                          onClick={() => handleSave(chatSubject.id)}
                          disabled={createSubject.isPending || updateSubject.isPending}
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
                        onClick={() => handleEdit(chatSubject.id)}
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
          Subjects are first created in the "Chat/Homework Subjects" tab, then enriched here with learning platform settings.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Slug:</strong> URL-friendly identifier (e.g., "mathematics" becomes "mathematics")</li>
          <li><strong>Icon Name:</strong> Lucide icon name or emoji</li>
          <li><strong>Color Scheme:</strong> Tailwind CSS class for subject color (e.g., "bg-blue-500")</li>
          <li><strong>Order:</strong> Display order in the learning platform</li>
          <li><strong>Active:</strong> Whether the subject is visible in the learning platform</li>
        </ul>
      </div>
    </div>
  );
};

export default LearningSubjectManager;

