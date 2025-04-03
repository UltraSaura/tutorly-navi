
import { useState } from 'react';
import { Plus, Trash, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdmin, Subject } from '@/context/AdminContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const SubjectManagement = () => {
  const { subjects, addSubject, updateSubject, deleteSubject, toggleSubjectActive } = useAdmin();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState('book');
  
  const handleAddSubject = () => {
    if (!newSubjectName) {
      toast.error('Subject name is required');
      return;
    }
    
    addSubject({
      name: newSubjectName,
      description: newSubjectDesc,
      icon: newSubjectIcon,
      active: true
    });
    
    // Reset form
    setNewSubjectName('');
    setNewSubjectDesc('');
    setNewSubjectIcon('book');
    setShowAddDialog(false);
  };
  
  const iconOptions = [
    { value: 'calculator', label: 'Calculator' },
    { value: 'book', label: 'Book' },
    { value: 'book-open', label: 'Book Open' },
    { value: 'globe', label: 'Globe' },
    { value: 'atom', label: 'Atom' },
    { value: 'flask-conical', label: 'Flask' },
    { value: 'dna', label: 'DNA' },
    { value: 'landmark', label: 'Landmark' },
    { value: 'code', label: 'Code' },
    { value: 'languages', label: 'Languages' },
    { value: 'pencil', label: 'Pencil' },
    { value: 'palette', label: 'Palette' },
    { value: 'music', label: 'Music' },
    { value: 'stethoscope', label: 'Medicine' }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subject Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage subjects for homework and document analysis
          </p>
        </div>
        
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {subjects.map(subject => (
          <SubjectCard 
            key={subject.id} 
            subject={subject} 
            onToggle={toggleSubjectActive}
            onDelete={deleteSubject}
          />
        ))}
      </div>
    </div>
  );
};

interface SubjectCardProps {
  subject: Subject;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const SubjectCard = ({ subject, onToggle, onDelete }: SubjectCardProps) => {
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${subject.name}?`)) {
      onDelete(subject.id);
    }
  };
  
  return (
    <Card className={`glass ${!subject.active ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{subject.name}</CardTitle>
            <CardDescription>
              {subject.description || `Subject ID: ${subject.id}`}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Switch 
              id={`subject-active-${subject.id}`}
              checked={subject.active}
              onCheckedChange={() => onToggle(subject.id)}
            />
            <Label htmlFor={`subject-active-${subject.id}`}>
              {subject.active ? 'Active' : 'Inactive'}
            </Label>
          </div>
          
          <div className="text-muted-foreground text-sm">
            {subject.active ? 
              <div className="flex items-center text-green-500">
                <Check className="h-4 w-4 mr-1" /> Available for analysis
              </div> : 
              <div className="flex items-center text-amber-500">
                <X className="h-4 w-4 mr-1" /> Not available
              </div>
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectManagement;
