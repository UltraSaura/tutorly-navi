import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Subject, Category, Topic, Video, Quiz } from '@/types/learning';

// Subjects
export const useLearningSubjects = () => {
  return useQuery({
    queryKey: ['admin-learning-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_subjects')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as Subject[];
    },
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subject: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('learning_subjects')
        .insert(subject)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subject: ${error.message}`);
    },
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subject> & { id: string }) => {
      const { data, error } = await supabase
        .from('learning_subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-subjects'] });
      toast.success('Subject updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subject: ${error.message}`);
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-subjects'] });
      toast.success('Subject deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subject: ${error.message}`);
    },
  });
};

// Categories
export const useLearningCategories = (subjectId?: string) => {
  return useQuery({
    queryKey: ['admin-learning-categories', subjectId],
    queryFn: async () => {
      let query = supabase
        .from('learning_categories')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Category[];
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('learning_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('learning_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
};

// Topics
export const useLearningTopics = (categoryId?: string) => {
  return useQuery({
    queryKey: ['admin-learning-topics', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('learning_topics')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Topic[];
    },
  });
};

export const useCreateTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (topic: Omit<Topic, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('learning_topics')
        .insert(topic)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-topics'] });
      toast.success('Topic created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create topic: ${error.message}`);
    },
  });
};

export const useUpdateTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Topic> & { id: string }) => {
      const { data, error } = await supabase
        .from('learning_topics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-topics'] });
      toast.success('Topic updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update topic: ${error.message}`);
    },
  });
};

export const useDeleteTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_topics')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-topics'] });
      toast.success('Topic deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete topic: ${error.message}`);
    },
  });
};

// Videos
export const useLearningVideos = (topicId?: string) => {
  return useQuery({
    queryKey: ['admin-learning-videos', topicId],
    queryFn: async () => {
      let query = supabase
        .from('learning_videos')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Video[];
    },
  });
};

export const useCreateVideo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (video: Omit<Video, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('learning_videos')
        .insert(video)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-videos'] });
      toast.success('Video created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create video: ${error.message}`);
    },
  });
};

export const useUpdateVideo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Video> & { id: string }) => {
      const { data, error } = await supabase
        .from('learning_videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-videos'] });
      toast.success('Video updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update video: ${error.message}`);
    },
  });
};

export const useDeleteVideo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_videos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-videos'] });
      toast.success('Video deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete video: ${error.message}`);
    },
  });
};

// Quizzes
export const useLearningQuizzes = (videoId?: string) => {
  return useQuery({
    queryKey: ['admin-learning-quizzes', videoId],
    queryFn: async () => {
      let query = supabase
        .from('video_quizzes')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (videoId) {
        query = query.eq('video_id', videoId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Quiz[];
    },
  });
};

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (quiz: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('video_quizzes')
        .insert(quiz)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-quizzes'] });
      toast.success('Quiz created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create quiz: ${error.message}`);
    },
  });
};

export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quiz> & { id: string }) => {
      const { data, error } = await supabase
        .from('video_quizzes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-quizzes'] });
      toast.success('Quiz updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update quiz: ${error.message}`);
    },
  });
};

export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('video_quizzes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-learning-quizzes'] });
      toast.success('Quiz deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete quiz: ${error.message}`);
    },
  });
};
