
import React from 'react';
import { BookOpen, PenLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ExerciseSubmissionFormProps {
  newExercise: string;
  setNewExercise: (exercise: string) => void;
  submitAsExercise: () => void;
}

const ExerciseSubmissionForm = ({ 
  newExercise, 
  setNewExercise, 
  submitAsExercise 
}: ExerciseSubmissionFormProps) => {
  return (
    <div className="flex-1 p-4 flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Submit New Exercise or Homework
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Type or paste your exercise or homework question below. I'll help you work through it step by step.
        </p>
        <Textarea
          placeholder="Enter your exercise or homework question here..."
          value={newExercise}
          onChange={(e) => setNewExercise(e.target.value)}
          className="min-h-[150px] mb-4"
        />
        <Button 
          className="w-full bg-studywhiz-600 hover:bg-studywhiz-700"
          onClick={submitAsExercise}
        >
          <PenLine className="h-5 w-5 mr-2" />
          Submit Exercise
        </Button>
      </div>
      <Separator className="my-4" />
      <div>
        <h3 className="text-md font-medium mb-2">Tips for submitting work:</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>Be specific with your question</li>
          <li>Include any relevant context or background information</li>
          <li>If you're stuck, explain what you've tried so far</li>
          <li>You can also upload photos or files of your work using the buttons in the chat tab</li>
        </ul>
      </div>
    </div>
  );
};

export default ExerciseSubmissionForm;
