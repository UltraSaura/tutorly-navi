import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PromptTemplate } from '@/types/admin';
import { formatDistanceToNow } from 'date-fns';

interface ViewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PromptTemplate | null;
}

export const ViewTemplateDialog = ({
  open,
  onOpenChange,
  template,
}: ViewTemplateDialogProps) => {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Template Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Subject</h4>
                <p className="text-sm text-muted-foreground">{template.subject}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Usage Type</h4>
                <Badge variant="secondary">{template.usage_type}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Priority</h4>
                <p className="text-sm text-muted-foreground">{template.priority}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="flex gap-2">
                  {template.is_active && <Badge variant="default">Active</Badge>}
                  {template.auto_activate && <Badge variant="outline">Auto-activate</Badge>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {template.tags.length > 0 && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Prompt Content */}
            <div>
              <h4 className="text-sm font-medium mb-2">Prompt Content</h4>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {template.prompt_content}
                </pre>
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Created:</span> {formatDistanceToNow(template.created_at, { addSuffix: true })}
              </div>
              <div>
                <span className="font-medium">Updated:</span> {formatDistanceToNow(template.updated_at, { addSuffix: true })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};