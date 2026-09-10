import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

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
  const ui = useInterfaceTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{ui("Create New Prompt Template")}</DialogTitle>
          <DialogDescription>
            {ui("Create a new system prompt template for the AI tutor.")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="templateName" className="text-right text-sm font-medium">
              {ui("Name")}
            </label>
            <Input
              id="templateName"
              value={newTemplate.name}
              onChange={(e) => onNewTemplateChange({ ...newTemplate, name: e.target.value })}
              className="col-span-3"
              placeholder={ui("e.g., History Tutor")}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="templateSubject" className="text-right text-sm font-medium">
              {ui("Subject")}
            </label>
            <Select 
              value={newTemplate.subject} 
              onValueChange={(value) => onNewTemplateChange({ ...newTemplate, subject: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={ui("Select subject")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">{ui("General")}</SelectItem>
                <SelectItem value="Mathematics">{ui("Mathematics")}</SelectItem>
                <SelectItem value="Science">{ui("Science")}</SelectItem>
                <SelectItem value="Language Arts">{ui("Language Arts")}</SelectItem>
                <SelectItem value="History">{ui("History")}</SelectItem>
                <SelectItem value="Arts">{ui("Arts")}</SelectItem>
                <SelectItem value="Programming">{ui("Programming")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="templateDescription" className="text-right text-sm font-medium">
              {ui("Description")}
            </label>
            <Input
              id="templateDescription"
              value={newTemplate.description}
              onChange={(e) => onNewTemplateChange({ ...newTemplate, description: e.target.value })}
              className="col-span-3"
              placeholder={ui("Brief description of the template's purpose")}
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <label htmlFor="templatePrompt" className="text-right text-sm font-medium pt-2">
              {ui("Prompt")}
            </label>
            <Textarea
              id="templatePrompt"
              value={newTemplate.prompt_content}
              onChange={(e) => onNewTemplateChange({ ...newTemplate, prompt_content: e.target.value })}
              className="col-span-3 min-h-32"
              placeholder={ui("Enter the system prompt instructions...")}
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-right text-sm font-medium pt-2">
              {ui("Tags")}
            </label>
            <div className="col-span-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => onNewTagChange(e.target.value)}
                  placeholder={ui("Add a tag")}
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
                  {ui("Add")}
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
              {ui("Type")}
            </label>
            <Select 
              value={newTemplate.usage_type} 
              onValueChange={(value: 'chat' | 'grading' | 'explanation' | 'math_enhanced' | 'grouped_retry_practice') => onNewTemplateChange({ ...newTemplate, usage_type: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={ui("Select template type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">{ui("Chat")}</SelectItem>
                <SelectItem value="grading">{ui("Grading")}</SelectItem>
                <SelectItem value="explanation">{ui("Explanation")}</SelectItem>
                <SelectItem value="math_enhanced">{ui("Math Enhanced")}</SelectItem>
                <SelectItem value="grouped_retry_practice">{ui("Grouped Retry Practice")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ui("Cancel")}
          </Button>
          <Button 
            className="bg-stuwy-600 hover:bg-stuwy-700"
            onClick={onAddTemplate}
          >
            {ui("Create Template")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
