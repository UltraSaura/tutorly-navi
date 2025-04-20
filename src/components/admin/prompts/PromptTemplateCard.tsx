
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { PromptTemplate } from '@/types/admin';

interface PromptTemplateCardProps {
  template: PromptTemplate;
  isSelected: boolean;
  onSelect: (template: PromptTemplate) => void;
  onDelete: (templateId: string) => void;
  onSetActive: (templateId: string) => void;
}

export const PromptTemplateCard = ({
  template,
  isSelected,
  onSelect,
  onDelete,
  onSetActive,
}: PromptTemplateCardProps) => {
  return (
    <Card 
      className={`glass cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-studywhiz-500' : ''
      }`}
      onClick={() => onSelect(template)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {template.name}
              {template.isActive && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
                  Active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{template.subject}</CardDescription>
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
        
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Prompt Preview:</p>
          <p className="text-sm text-muted-foreground line-clamp-3">{template.prompt}</p>
        </div>
        
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {template.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Last updated: {template.lastModified.toLocaleDateString()}
        </p>
        
        {!template.isActive && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSetActive(template.id);
            }}
          >
            Set Active
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
