import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';
import { useGenerateLessonContent } from '@/hooks/useGenerateLessonContent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GenerateLessonButtonProps {
  topicId: string;
  hasExistingContent?: boolean;
}

export function GenerateLessonButton({ 
  topicId, 
  hasExistingContent = false 
}: GenerateLessonButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const generateLesson = useGenerateLessonContent();

  const handleGenerate = async () => {
    await generateLesson.mutateAsync({ topicId });
    setDialogOpen(false);
  };

  if (!hasExistingContent) {
    return (
      <Button 
        onClick={handleGenerate}
        disabled={generateLesson.isPending}
      >
        {generateLesson.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Wand2 className="w-4 h-4 mr-2" />
        )}
        Generate Lesson Content
      </Button>
    );
  }

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={generateLesson.isPending}>
          {generateLesson.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          Regenerate Lesson
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate Lesson Content?</AlertDialogTitle>
          <AlertDialogDescription>
            This will overwrite the existing lesson content with newly generated content.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleGenerate}>
            Regenerate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
