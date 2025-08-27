import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { PromptTemplate } from '@/types/admin';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PromptTemplate | null;
  onSave: (updates: Partial<PromptTemplate>) => void;
}

export const EditTemplateDialog = ({
  open,
  onOpenChange,
  template,
  onSave,
}: EditTemplateDialogProps) => {
  const [editedTemplate, setEditedTemplate] = useState<Partial<PromptTemplate>>({});
  const [newTag, setNewTag] = useState('');

  // Initialize form when template changes
  React.useEffect(() => {
    if (template) {
      setEditedTemplate({
        name: template.name,
        subject: template.subject,
        description: template.description,
        prompt_content: template.prompt_content,
        tags: [...template.tags],
        usage_type: template.usage_type,
        auto_activate: template.auto_activate,
        priority: template.priority,
      });
    }
  }, [template]);

  if (!template) return null;

  const handleSave = () => {
    onSave(editedTemplate);
    onOpenChange(false);
  };

  const addTag = () => {
    if (newTag.trim() && editedTemplate.tags && !editedTemplate.tags.includes(newTag.trim())) {
      setEditedTemplate({
        ...editedTemplate,
        tags: [...editedTemplate.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (editedTemplate.tags) {
      setEditedTemplate({
        ...editedTemplate,
        tags: editedTemplate.tags.filter(tag => tag !== tagToRemove)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template: {template.name}</DialogTitle>
          <DialogDescription>
            Modify the prompt template settings and content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateName" className="text-right text-sm font-medium">
              Name
            </Label>
            <Input
              id="templateName"
              value={editedTemplate.name || ''}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateSubject" className="text-right text-sm font-medium">
              Subject
            </Label>
            <Select 
              value={editedTemplate.subject || ''} 
              onValueChange={(value) => setEditedTemplate({ ...editedTemplate, subject: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Language Arts">Language Arts</SelectItem>
                <SelectItem value="History">History</SelectItem>
                <SelectItem value="Arts">Arts</SelectItem>
                <SelectItem value="Programming">Programming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateDescription" className="text-right text-sm font-medium">
              Description
            </Label>
            <Input
              id="templateDescription"
              value={editedTemplate.description || ''}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, description: e.target.value })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateType" className="text-right text-sm font-medium">
              Type
            </Label>
            <Select 
              value={editedTemplate.usage_type || ''} 
              onValueChange={(value: 'chat' | 'grading' | 'explanation' | 'math_enhanced') => 
                setEditedTemplate({ ...editedTemplate, usage_type: value })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select template type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="grading">Grading</SelectItem>
                <SelectItem value="explanation">Explanation</SelectItem>
                <SelectItem value="math_enhanced">Math Enhanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templatePriority" className="text-right text-sm font-medium">
              Priority
            </Label>
            <Input
              id="templatePriority"
              type="number"
              value={editedTemplate.priority || 0}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, priority: parseInt(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm font-medium">
              Auto-activate
            </Label>
            <div className="col-span-3">
              <Switch
                checked={editedTemplate.auto_activate || false}
                onCheckedChange={(checked) => setEditedTemplate({ ...editedTemplate, auto_activate: checked })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="templatePrompt" className="text-right text-sm font-medium pt-2">
              Prompt
            </Label>
            <Textarea
              id="templatePrompt"
              value={editedTemplate.prompt_content || ''}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, prompt_content: e.target.value })}
              className="col-span-3 min-h-32"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right text-sm font-medium pt-2">
              Tags
            </Label>
            <div className="col-span-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={addTag}
                >
                  Add
                </Button>
              </div>
              
              {editedTemplate.tags && editedTemplate.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editedTemplate.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="px-2 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={() => removeTag(tag)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};