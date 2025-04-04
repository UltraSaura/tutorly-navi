
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Trash, X, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DynamicIcon } from './DynamicIcon';
import { Subject } from '@/types/admin';

interface DraggableSubjectProps {
  subject: Subject;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const DraggableSubject = ({ subject, onDelete, onToggle }: DraggableSubjectProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${subject.name}?`)) {
      onDelete(subject.id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Card className={`glass ${!subject.active ? 'opacity-70' : ''} hover:shadow-md transition-shadow duration-200`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div 
                className="cursor-move touch-none flex items-center justify-center" 
                {...attributes} 
                {...listeners}
              >
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <div className="bg-studywhiz-100 p-2 rounded-lg">
                    <DynamicIcon name={subject.icon as any} className="h-5 w-5 text-studywhiz-600" />
                  </div>
                  <CardTitle>{subject.name}</CardTitle>
                </div>
                <CardDescription>
                  {subject.description || `Subject ID: ${subject.id}`}
                </CardDescription>
              </div>
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
    </div>
  );
};
