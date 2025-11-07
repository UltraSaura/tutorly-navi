import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Question } from '@/types/quiz-bank';

// Quiz Bank Questions
export const useQuizBankQuestions = (bankId?: string) => {
  return useQuery({
    queryKey: ['quiz-bank-questions', bankId],
    queryFn: async () => {
      if (!bankId) return [];
      
      const { data, error } = await supabase
        .from('quiz_bank_questions')
        .select('*')
        .eq('bank_id', bankId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item.payload,
        dbId: item.id,
        position: item.position,
      })) as (Question & { dbId: string; position: number })[];
    },
    enabled: !!bankId,
  });
};

export const useCreateQuizBankQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bankId, question, position }: { bankId: string; question: Question; position: number }) => {
      const { data, error } = await supabase
        .from('quiz_bank_questions')
        .insert({
          id: question.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          bank_id: bankId,
          payload: question,
          position,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-questions', variables.bankId] });
      toast.success('Question added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add question: ${error.message}`);
    },
  });
};

export const useUpdateQuizBankQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dbId, bankId, question, position }: { dbId: string; bankId: string; question: Question; position: number }) => {
      const { data, error } = await supabase
        .from('quiz_bank_questions')
        .update({
          payload: question,
          position,
        })
        .eq('id', dbId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-questions', variables.bankId] });
      toast.success('Question updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update question: ${error.message}`);
    },
  });
};

export const useDeleteQuizBankQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dbId, bankId }: { dbId: string; bankId: string }) => {
      const { error } = await supabase
        .from('quiz_bank_questions')
        .delete()
        .eq('id', dbId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-questions', variables.bankId] });
      toast.success('Question deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    },
  });
};

// Quiz Bank Assignments
export const useQuizBankAssignments = (bankId?: string) => {
  return useQuery({
    queryKey: ['quiz-bank-assignments', bankId],
    queryFn: async () => {
      let query = supabase
        .from('quiz_bank_assignments')
        .select('*');
      
      if (bankId) {
        query = query.eq('bank_id', bankId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useCreateQuizBankAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignment: {
      bank_id: string;
      topic_id?: string;
      trigger_after_n_videos?: number;
      video_ids?: string[];
      min_completed_in_set?: number;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('quiz_bank_assignments')
        .insert(assignment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-assignments', variables.bank_id] });
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-assignments'] });
      toast.success('Assignment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });
};

export const useUpdateQuizBankAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('quiz_bank_assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-assignments', data.bank_id] });
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-assignments'] });
      toast.success('Assignment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });
};

export const useDeleteQuizBankAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, bankId }: { id: string; bankId: string }) => {
      const { error } = await supabase
        .from('quiz_bank_assignments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-assignments', variables.bankId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-bank-assignments'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete assignment: ${error.message}`);
    },
  });
};

