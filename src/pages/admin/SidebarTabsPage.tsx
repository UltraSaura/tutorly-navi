
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarTab {
  id: string;
  title: string;
  path: string;
  icon_name: string;
  is_visible: boolean;
  user_type: string;
  sort_order: number;
}

const SortableTabItem = ({ tab, onEdit, onDelete }: { tab: SidebarTab; onEdit: (tab: SidebarTab) => void; onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tab.title}</span>
          <span className="text-xs text-gray-500">({tab.path})</span>
        </div>
        <div className="text-sm text-gray-500">
          Icon: {tab.icon_name} | Type: {tab.user_type} | Order: {tab.sort_order}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Visible</span>
        <Switch checked={tab.is_visible} disabled />
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(tab)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(tab.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const SidebarTabsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTab, setEditingTab] = useState<SidebarTab | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    path: '',
    icon_name: '',
    is_visible: true,
    user_type: 'user',
  });

  const { data: tabs = [], isLoading } = useQuery({
    queryKey: ['sidebar-tabs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sidebar_tabs')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as SidebarTab[];
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: async (tab: Partial<SidebarTab> & { id: string }) => {
      const { error } = await supabase
        .from('sidebar_tabs')
        .update(tab)
        .eq('id', tab.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-tabs'] });
      toast({ title: 'Tab updated successfully' });
    },
  });

  const createTabMutation = useMutation({
    mutationFn: async (tab: Omit<SidebarTab, 'id'>) => {
      const { error } = await supabase
        .from('sidebar_tabs')
        .insert(tab);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-tabs'] });
      toast({ title: 'Tab created successfully' });
      setIsAddingNew(false);
      setFormData({
        title: '',
        path: '',
        icon_name: '',
        is_visible: true,
        user_type: 'user',
      });
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sidebar_tabs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-tabs'] });
      toast({ title: 'Tab deleted successfully' });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = tabs.findIndex(tab => tab.id === active.id);
    const newIndex = tabs.findIndex(tab => tab.id === over.id);
    
    const newTabs = arrayMove(tabs, oldIndex, newIndex);
    
    // Update sort orders
    newTabs.forEach((tab, index) => {
      updateTabMutation.mutate({ id: tab.id, sort_order: index });
    });
  };

  const handleEdit = (tab: SidebarTab) => {
    setEditingTab(tab);
    setFormData({
      title: tab.title,
      path: tab.path,
      icon_name: tab.icon_name,
      is_visible: tab.is_visible,
      user_type: tab.user_type,
    });
  };

  const handleSave = () => {
    if (editingTab) {
      updateTabMutation.mutate({ id: editingTab.id, ...formData });
      setEditingTab(null);
    } else {
      createTabMutation.mutate({ ...formData, sort_order: tabs.length });
    }
  };

  const handleCancel = () => {
    setEditingTab(null);
    setIsAddingNew(false);
    setFormData({
      title: '',
      path: '',
      icon_name: '',
      is_visible: true,
      user_type: 'user',
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sidebar Tab Management</h1>
        <Button onClick={() => setIsAddingNew(true)} disabled={isAddingNew || editingTab}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Tab
        </Button>
      </div>

      {(isAddingNew || editingTab) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTab ? 'Edit Tab' : 'Add New Tab'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Dashboard"
                />
              </div>
              <div>
                <Label htmlFor="path">Path</Label>
                <Input
                  id="path"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  placeholder="e.g., /dashboard"
                />
              </div>
              <div>
                <Label htmlFor="icon_name">Icon Name</Label>
                <Input
                  id="icon_name"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  placeholder="e.g., LayoutDashboard"
                />
              </div>
              <div>
                <Label htmlFor="user_type">User Type</Label>
                <Select value={formData.user_type} onValueChange={(value) => setFormData({ ...formData, user_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
              />
              <Label>Visible</Label>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave}>
                {editingTab ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Sidebar Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <SortableTabItem
                    key={tab.id}
                    tab={tab}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteTabMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};

export default SidebarTabsPage;
