
import { useState, useMemo } from 'react';
import { Plus, Trash, Check, X, FolderPlus, Settings, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdmin, Subject } from '@/context/AdminContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SubjectCategory } from './subjects/SubjectCategory';
import { iconOptions } from './subjects/DynamicIcon';
import { Badge } from '@/components/ui/badge';

const SubjectManagement = () => {
  const { subjects, addSubject, updateSubject, deleteSubject, toggleSubjectActive, getAvailableModels } = useAdmin();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState('book');
  const [newSubjectCategory, setNewSubjectCategory] = useState('Uncategorized');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  // Tutor settings
  const [tutorActive, setTutorActive] = useState(false);
  const [tutorModelId, setTutorModelId] = useState('');
  const [tutorSystemPrompt, setTutorSystemPrompt] = useState('');
  
  // Get available models
  const availableModels = getAvailableModels();
  
  // Group subjects by category
  const subjectsByCategory = useMemo(() => {
    const categories: Record<string, Subject[]> = {};
    
    subjects.forEach(subject => {
      const category = subject.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(subject);
    });
    
    // Sort subjects within each category by order
    Object.keys(categories).forEach(category => {
      categories[category].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    
    return categories;
  }, [subjects]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Get all category names
  const categories = Object.keys(subjectsByCategory).sort();
  
  const handleAddSubject = () => {
    if (!newSubjectName) {
      toast.error('Subject name is required');
      return;
    }
    
    // Find the highest order in the category to place new subject at the end
    const categorySubjects = subjectsByCategory[newSubjectCategory] || [];
    const highestOrder = categorySubjects.length > 0 
      ? Math.max(...categorySubjects.map(s => s.order || 0)) 
      : -1;
    
    addSubject({
      name: newSubjectName,
      description: newSubjectDesc,
      icon: newSubjectIcon,
      category: newSubjectCategory,
      order: highestOrder + 1,
      active: true
    });
    
    // Reset form
    setNewSubjectName('');
    setNewSubjectDesc('');
    setNewSubjectIcon('book');
    setShowAddDialog(false);
  };
  
  const handleAddCategory = () => {
    if (!newCategoryName) {
      toast.error('Category name is required');
      return;
    }
    
    if (categories.includes(newCategoryName)) {
      toast.error('Category already exists');
      return;
    }
    
    // Create an empty category
    // The category will be added to the subjects when a subject is moved to it
    toast.success(`Category ${newCategoryName} created`);
    setShowAddCategoryDialog(false);
    setNewCategoryName('');
  };
  
  const handleOpenTutorSettings = (subject: Subject) => {
    setEditingSubject(subject);
    setTutorActive(subject.tutorActive || false);
    setTutorModelId(subject.tutorModelId || '');
    setTutorSystemPrompt(subject.tutorSystemPrompt || '');
    setShowTutorDialog(true);
  };
  
  const handleSaveTutorSettings = () => {
    if (!editingSubject) return;
    
    updateSubject(editingSubject.id, {
      ...editingSubject,
      tutorActive,
      tutorModelId,
      tutorSystemPrompt
    });
    
    toast.success(`Tutor settings updated for ${editingSubject.name}`);
    setShowTutorDialog(false);
    setEditingSubject(null);
  };
  
  const handleRenameCategory = (oldName: string, newName: string) => {
    if (categories.includes(newName)) {
      toast.error('Category already exists');
      return;
    }
    
    // Update all subjects in this category
    const subjectsToUpdate = subjectsByCategory[oldName] || [];
    subjectsToUpdate.forEach(subject => {
      updateSubject(subject.id, { ...subject, category: newName });
    });
    
    toast.success(`Category renamed from "${oldName}" to "${newName}"`);
  };
  
  const handleDeleteCategory = (categoryName: string) => {
    const subjectsToUpdate = subjectsByCategory[categoryName] || [];
    
    // Move all subjects to Uncategorized
    subjectsToUpdate.forEach(subject => {
      if (categoryName !== 'Uncategorized') {
        updateSubject(subject.id, { ...subject, category: 'Uncategorized' });
      } else {
        // If deleting Uncategorized, just delete all subjects
        deleteSubject(subject.id);
      }
    });
    
    toast.success(`Category "${categoryName}" deleted`);
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveSubjectId(event.active.id.toString());
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSubjectId(null);
    
    if (!over || active.id === over.id) return;
    
    // Find the subject being dragged
    const activeSubject = subjects.find(s => s.id === active.id);
    if (!activeSubject) return;
    
    // Find the target subject
    const overSubject = subjects.find(s => s.id === over.id);
    if (!overSubject) return;
    
    // If they're in the same category, reorder
    if (activeSubject.category === overSubject.category) {
      const categorySubjects = [...(subjectsByCategory[activeSubject.category || 'Uncategorized'] || [])];
      const oldIndex = categorySubjects.findIndex(s => s.id === active.id);
      const newIndex = categorySubjects.findIndex(s => s.id === over.id);
      
      const reordered = arrayMove(categorySubjects, oldIndex, newIndex);
      
      // Update orders
      reordered.forEach((subject, index) => {
        updateSubject(subject.id, { ...subject, order: index });
      });
    } else {
      // Move to a different category
      const newCategory = overSubject.category || 'Uncategorized';
      const categorySubjects = [...(subjectsByCategory[newCategory] || [])];
      const targetIndex = categorySubjects.findIndex(s => s.id === over.id);
      
      // Insert at the target position in the new category
      updateSubject(activeSubject.id, {
        ...activeSubject,
        category: newCategory,
        order: overSubject.order
      });
      
      // Update orders for all affected subjects
      const subjectsToUpdate = categorySubjects.slice(targetIndex);
      subjectsToUpdate.forEach(subject => {
        updateSubject(subject.id, { ...subject, order: (subject.order || 0) + 1 });
      });
    }
  };
  
  // Generate default system prompt for a subject
  const generateDefaultSystemPrompt = (subject: Subject) => {
    return `You are an educational AI tutor specializing in ${subject.name}.
Your role is to provide expert assistance in this subject area, helping students understand concepts, solve problems, and learn new skills.

When helping with ${subject.name} topics:
1. Provide clear, concise explanations tailored to the student's level
2. Use examples and analogies relevant to ${subject.name} to illustrate concepts
3. Break down complex problems into manageable steps
4. Encourage critical thinking and problem-solving skills
5. Offer constructive feedback on student work
6. Relate concepts to real-world applications when possible
7. Use appropriate terminology and notation for ${subject.name}

Always be patient, encouraging, and supportive in your interactions.`;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subject Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage subjects for homework and document analysis
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <FolderPlus className="h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new category to organize your subjects.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    placeholder="e.g., Science"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancel</Button>
                <Button className="bg-studywhiz-600 hover:bg-studywhiz-700" onClick={handleAddCategory}>
                  Add Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-studywhiz-600 hover:bg-studywhiz-700">
                <Plus className="mr-2 h-4 w-4" /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>
                  Add a new subject for homework and document analysis.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                    id="subjectName"
                    placeholder="e.g., Physics"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subjectDesc">Description (Optional)</Label>
                  <Input
                    id="subjectDesc"
                    placeholder="Brief description"
                    value={newSubjectDesc}
                    onChange={(e) => setNewSubjectDesc(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subjectCategory">Category</Label>
                  <Select value={newSubjectCategory} onValueChange={setNewSubjectCategory}>
                    <SelectTrigger id="subjectCategory">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subjectIcon">Icon</Label>
                  <Select value={newSubjectIcon} onValueChange={setNewSubjectIcon}>
                    <SelectTrigger id="subjectIcon">
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => (
                        <SelectItem key={icon.value} value={icon.value}>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button className="bg-studywhiz-600 hover:bg-studywhiz-700" onClick={handleAddSubject}>
                  Add Subject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Tutor Settings Dialog */}
      <Dialog open={showTutorDialog} onOpenChange={setShowTutorDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSubject && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-studywhiz-600" />
                  <span>{editingSubject.name} Tutor Settings</span>
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              Configure subject-specific tutor settings and AI behavior
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tutorActive">Enable Subject Tutor</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, this subject will use its own model and prompts
                </p>
              </div>
              <Switch 
                id="tutorActive" 
                checked={tutorActive}
                onCheckedChange={setTutorActive}
              />
            </div>
            
            {tutorActive && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tutorModel">AI Model</Label>
                  <Select 
                    value={tutorModelId} 
                    onValueChange={setTutorModelId}
                  >
                    <SelectTrigger id="tutorModel">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem 
                          key={model.id} 
                          value={model.id}
                          disabled={model.disabled}
                        >
                          {model.name} ({model.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which AI model to use when this subject is selected
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">Custom System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder={editingSubject ? generateDefaultSystemPrompt(editingSubject) : ""}
                    value={tutorSystemPrompt}
                    onChange={(e) => setTutorSystemPrompt(e.target.value)}
                    className="min-h-32"
                  />
                  <div className="flex justify-between">
                    <p className="text-xs text-muted-foreground">
                      Define how the AI should behave when helping with this subject
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => editingSubject && setTutorSystemPrompt(generateDefaultSystemPrompt(editingSubject))}
                    >
                      Generate Default
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTutorDialog(false)}>Cancel</Button>
            <Button 
              className="bg-studywhiz-600 hover:bg-studywhiz-700" 
              onClick={handleSaveTutorSettings}
            >
              Save Tutor Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-medium">Categories</h2>
          <Badge className="ml-1 text-xs">{categories.length}</Badge>
          <span className="text-sm text-muted-foreground ml-auto">Drag subjects to reorder or move between categories</span>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        >
          {categories.map(category => (
            <SubjectCategory
              key={category}
              category={category}
              subjects={subjectsByCategory[category] || []}
              onToggleSubject={toggleSubjectActive}
              onDeleteSubject={deleteSubject}
              onRenameCategory={handleRenameCategory}
              onDeleteCategory={handleDeleteCategory}
              onOpenTutorSettings={handleOpenTutorSettings}
            />
          ))}
        </DndContext>
      </div>
    </div>
  );
};

export default SubjectManagement;
