import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Lightbulb, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { LessonContent } from '@/types/learning';
import { useEffect } from 'react';

interface LessonContentStudentProps {
  topicId: string;
}

export function LessonContentStudent({ topicId }: LessonContentStudentProps) {
  // Scroll to lesson section if URL has hash
  useEffect(() => {
    if (window.location.hash === '#lesson-section') {
      const timer = setTimeout(() => {
        const element = document.getElementById('lesson-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic-lesson-content', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_topics')
        .select('lesson_content')
        .eq('id', topicId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading lesson...</div>;
  }

  if (!topic?.lesson_content) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Lesson content is being prepared. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  const content = topic.lesson_content as unknown as LessonContent;

  return (
    <div id="lesson-section" className="space-y-6">
      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            What you need to know
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed">{content.explanation}</p>
        </CardContent>
      </Card>

      {/* Worked Example */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Lightbulb className="w-5 h-5" />
            See an example
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed text-green-900 dark:text-green-100">
            {content.example}
          </p>
        </CardContent>
      </Card>

      {/* Common Mistakes */}
      {content.common_mistakes.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
              Common mistakes to avoid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {content.common_mistakes.map((mistake, idx) => (
                <li key={idx} className="flex gap-3">
                  <Badge variant="outline" className="h-fit mt-0.5">
                    {idx + 1}
                  </Badge>
                  <span className="flex-1 text-amber-900 dark:text-amber-100">
                    {mistake}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />
    </div>
  );
}
