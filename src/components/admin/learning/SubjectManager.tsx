import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLearningSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/hooks/useManageLearningContent';
import { DynamicIcon } from '../subjects/DynamicIcon';
import type { Subject } from '@/types/learning';

const SubjectManager = () => {
  const { data: subjects = [], isLoading } = useLearningSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon_name: '',
    color_scheme: '',
    order_index: 0,
    is_active: true,
    language: 'en',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSubject) {
      await updateSubject.mutateAsync({ id: editingSubject.id, ...formData });
    } else {
      await createSubject.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      slug: subject.slug,
      icon_name: subject.icon_name,
      color_scheme: subject.color_scheme,
      order_index: subject.order_index,
      is_active: subject.is_active,
      language: (subject as any).language || 'en',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all categories, topics, videos, and quizzes under this subject.')) {
      await deleteSubject.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      slug: '',
      icon_name: '',
      color_scheme: '',
      order_index: 0,
      is_active: true,
      language: 'en',
    });
  };

  if (isLoading) {
    return <div>Loading subjects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Subjects</h2>
          <p className="text-muted-foreground">Manage learning subjects and their properties</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <Label htmlFor="icon_name">Icon Name (Lucide or emoji)</Label>
                <Input
                  id="icon_name"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  placeholder="Calculator or 🔢"
                  required
                />
              </div>
              <div>
                <Label htmlFor="color_scheme">Color Scheme (CSS class)</Label>
                <Input
                  id="color_scheme"
                  value={formData.color_scheme}
                  onChange={(e) => setFormData({ ...formData, color_scheme: e.target.value })}
                  placeholder="bg-blue-500"
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Icon</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell>
                <DynamicIcon name={subject.icon_name} className="w-6 h-6" />
              </TableCell>
              <TableCell className="font-medium">{subject.name}</TableCell>
              <TableCell>{(subject as any).language || 'en'}</TableCell>
              <TableCell>{subject.slug}</TableCell>
              <TableCell>{subject.order_index}</TableCell>
              <TableCell>
                <span className={subject.is_active ? 'text-green-600' : 'text-red-600'}>
                  {subject.is_active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(subject)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(subject.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SubjectManager;
