
import React from 'react';
import { Check, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Subject } from '@/types/admin';
import { DynamicIcon } from '@/components/admin/subjects/DynamicIcon';

interface SubjectSelectorProps {
  subjects: Subject[];
  selectedSubject: string | null;
  onSelectSubject: (subjectId: string | null) => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({ 
  subjects, 
  selectedSubject, 
  onSelectSubject 
}) => {
  // Group subjects by category
  const subjectsByCategory = subjects.reduce((acc, subject) => {
    const category = subject.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);
  
  // Sort categories
  const sortedCategories = Object.keys(subjectsByCategory).sort();
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Subject Tutors</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onSelectSubject(null)}
          className={!selectedSubject ? "border-studywhiz-600 text-studywhiz-600" : ""}
        >
          <BookOpen className="h-4 w-4 mr-1" /> General Tutor
        </Button>
      </div>
      
      <ScrollArea className="h-[4.5rem]">
        <div className="flex gap-2 pb-2 overflow-x-auto">
          {sortedCategories.map(category => (
            <div key={category} className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">{category}</span>
              <div className="flex gap-2">
                {subjectsByCategory[category].map(subject => (
                  <Button
                    key={subject.id}
                    variant={subject.id === selectedSubject ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelectSubject(subject.id)}
                    className={`flex items-center gap-1 ${
                      subject.id === selectedSubject ? "bg-studywhiz-600" : ""
                    } ${subject.tutorActive ? "border-studywhiz-300" : ""}`}
                    disabled={!subject.active}
                  >
                    <DynamicIcon name={subject.icon as any || "book"} className="h-4 w-4" />
                    <span>{subject.name}</span>
                    {subject.tutorActive && (
                      <div className="w-2 h-2 rounded-full bg-green-500 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SubjectSelector;
