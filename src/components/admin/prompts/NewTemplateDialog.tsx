
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { NewPromptTemplate } from '@/types/admin';

interface NewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTemplate: NewPromptTemplate;
  onNewTemplateChange: (template: NewPromptTemplate) => void;
  onAddTemplate: () => void;
  newTag: string;
  onNewTagChange: (tag: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

export const NewTemplateDialog = ({
  open,
  onOpenChange,
  newTemplate,
  onNewTemplateChange,
  onAddTemplate,
  newTag,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
}: NewTemplateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Prompt Template</DialogTitle>
          <DialogDescription>
            Create a new system prompt template for the AI tutor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="templateName" className="text-right text-sm font-medium">
              Name
            </label>
            <Input
              id="templateName"
              value={newTemplate.name}
              onChange={(e) => onNewTemplateChange({ ...newTemplate, name: e.target.value })}
              className="col-span-3"
              placeholder="e.g., History Tutor"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="templateSubject" className="text-right text-sm font-medium">
              Subject
            </label>
            <Select 
              value={newTemplate.subject} 
              onValueChange={(value) => onNewTemplateChange({ ...newTemplate, subject: value })}
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
            <label htmlFor="templateDescription" className="text-right text-sm font-medium">
              Description
            </label>
            <Input
              id="templateDescription"
              value={newTemplate.description}
              onChange={(e) => onNewTemplateChange({ ...newTemplate, description: e.target.value })}
              className="col-span-3"
              placeholder="Brief description of the template's purpose"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <label htmlFor="templatePrompt" className="text-right text-sm font-medium pt-2">
              Prompt
            </label>
            <Textarea
              id="templatePrompt"
              value={newTemplate.prompt}
              onChange={(e) => onNewTemplateChange({ ...newTemplate, prompt: e.target.value })}
              className="col-span-3 min-h-32"
              placeholder="Enter the system prompt instructions..."
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-right text-sm font-medium pt-2">
              Tags
            </label>
            <div className="col-span-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => onNewTagChange(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddTag();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={onAddTag}
                >
                  Add
                </Button>
              </div>
              
              {newTemplate.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newTemplate.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="px-2 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={() => onRemoveTag(tag)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="templateType" className="text-right text-sm font-medium">
              Type
            </label>
            <Select 
              value={newTemplate.type} 
              onValueChange={(value: 'tutor' | 'grading') => onNewTemplateChange({ ...newTemplate, type: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select template type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutor">Tutor</SelectItem>
                <SelectItem value="grading">Grading</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-studywhiz-600 hover:bg-studywhiz-700"
            onClick={onAddTemplate}
          >
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
