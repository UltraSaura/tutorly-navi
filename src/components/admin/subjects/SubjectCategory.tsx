
import React, { useState } from 'react';
import { Subject } from '@/types/admin';
import { DraggableSubject } from './DraggableSubject';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Edit, Trash, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SubjectCategoryProps {
  category: string;
  subjects: Subject[];
  onToggleSubject: (id: string) => void;
  onDeleteSubject: (id: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  onOpenTutorSettings: (subject: Subject) => void;
}

export const SubjectCategory: React.FC<SubjectCategoryProps> = ({
  category,
  subjects,
  onToggleSubject,
  onDeleteSubject,
  onRenameCategory,
  onDeleteCategory,
  onOpenTutorSettings
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState(category);

  const handleSaveCategory = () => {
    if (newCategoryName && newCategoryName !== category) {
      onRenameCategory(category, newCategoryName);
    }
    setIsEditing(false);
  };

  const handleDeleteCategory = () => {
    if (confirm(`Are you sure you want to delete the "${category}" category and all its subjects?`)) {
      onDeleteCategory(category);
    }
  };

  return (
    <Accordion type="single" collapsible className="mb-6" defaultValue={category}>
      <AccordionItem value={category} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-4 bg-gray-50 dark:bg-gray-800">
          {isEditing ? (
            <div className="flex items-center gap-2 py-2 flex-1">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-8 max-w-xs"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveCategory}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-lg font-medium">{category}</span>
              </AccordionTrigger>
              <Badge variant="outline" className="ml-2">
                {subjects.length}
              </Badge>
            </div>
          )}
          
          {!isEditing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDeleteCategory} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <AccordionContent className="p-3">
          <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {subjects.map(subject => (
                <DraggableSubject
                  key={subject.id}
                  subject={subject}
                  onDelete={onDeleteSubject}
                  onToggle={onToggleSubject}
                  onOpenTutorSettings={onOpenTutorSettings}
                />
              ))}
              {subjects.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No subjects in this category. Drag subjects here or add a new one.
                </div>
              )}
            </div>
          </SortableContext>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
