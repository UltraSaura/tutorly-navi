import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, BookOpen } from 'lucide-react';
import { LessonContentDisplay } from '@/components/admin/learning/LessonContentDisplay';
import { GenerateLessonButton } from '@/components/admin/learning/GenerateLessonButton';
import { Separator } from '@/components/ui/separator';
import type { LessonContent } from '@/types/learning';

export default function TeacherTopicDetail() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const { data: topic, isLoading } = useQuery({
    queryKey: ['teacher-topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_topics')
        .select(`
          *,
          learning_categories (
            learning_subjects (
              name,
              color_scheme,
              slug
            )
          )
        `)
        .eq('id', topicId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  if (!topic) {
    return <div className="p-4">Topic not found</div>;
  }

  const subject = topic.learning_categories?.learning_subjects;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{topic.name}</h1>
          <p className="text-muted-foreground">
            {subject?.name} • {topic.curriculum_level_code}
          </p>
        </div>
        <GenerateLessonButton 
          topicId={topic.id} 
          hasExistingContent={!!topic.lesson_content}
        />
      </div>

      {/* Topic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topic.description && (
            <p className="text-sm">{topic.description}</p>
          )}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Duration: {topic.estimated_duration_minutes} min</span>
            <span>Videos: {topic.video_count}</span>
            <span>Quizzes: {topic.quiz_count}</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Lesson Content */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Lesson Content
        </h2>
        
        {topic.lesson_content ? (
          <LessonContentDisplay content={topic.lesson_content as unknown as LessonContent} />
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                No lesson content generated yet
              </p>
              <GenerateLessonButton topicId={topic.id} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Student Access Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Student Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Students can view this topic at:{' '}
            <code className="bg-muted px-2 py-1 rounded text-xs">
              /learning/{subject?.slug}/{topic.slug}
            </code>
          </p>
          <Button 
            variant="link" 
            className="px-0"
            onClick={() => window.open(`/learning/${subject?.slug}/${topic.slug}`, '_blank')}
          >
            Preview as student →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
