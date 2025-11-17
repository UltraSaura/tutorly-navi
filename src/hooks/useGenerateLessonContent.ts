import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useGenerateLessonContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      topicId, 
      modelId = 'openai/gpt-4o-mini' 
    }: { 
      topicId: string; 
      modelId?: string;
    }) => {
      toast({
        title: 'Generating lesson content...',
        description: 'This may take 30-60 seconds',
      });

      const { data, error } = await supabase.functions.invoke('generate-lesson-content', {
        body: { topicId, modelId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Lesson content generated!',
        description: 'The lesson is now ready for students',
      });
      
      queryClient.invalidateQueries({ queryKey: ['learning-topics'] });
      queryClient.invalidateQueries({ queryKey: ['topic', variables.topicId] });
      queryClient.invalidateQueries({ queryKey: ['topic-lesson-content', variables.topicId] });
    },
    onError: (error: Error) => {
      console.error('[useGenerateLessonContent] Error:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
