import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ObjectiveWithSuccessCriteria, Task, Objective } from '@/types/curriculum';

/**
 * Fetch objectives linked to a specific topic
 * Includes success criteria
 */
export function useTopicObjectives(topicId: string | undefined) {
  return useQuery({
    queryKey: ['topic-objectives', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      
      // Get linked objective IDs
      const { data: links, error: linksError } = await supabase
        .from('topic_objectives')
        .select('objective_id, order_index')
        .eq('topic_id', topicId)
        .order('order_index');
      
      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];
      
      const objectiveIds = links.map(l => l.objective_id);
      
      // Get objectives with success criteria
      const { data: objectives, error: objError } = await supabase
        .from('objectives')
        .select(`
          *,
          success_criteria (*)
        `)
        .in('id', objectiveIds);
      
      if (objError) throw objError;
      
      // Sort by order_index from links
      const sortedObjectives = objectives?.sort((a, b) => {
        const aIndex = links.find(l => l.objective_id === a.id)?.order_index || 0;
        const bIndex = links.find(l => l.objective_id === b.id)?.order_index || 0;
        return aIndex - bIndex;
      });
      
      return sortedObjectives as ObjectiveWithSuccessCriteria[];
    },
    enabled: !!topicId,
  });
}

/**
 * Fetch tasks for a list of success criteria IDs
 */
export function useTasksForSuccessCriteria(successCriteriaIds: string[]) {
  return useQuery({
    queryKey: ['tasks-for-success-criteria', successCriteriaIds],
    queryFn: async () => {
      if (!successCriteriaIds || successCriteriaIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('success_criterion_id', successCriteriaIds)
        .order('type', { ascending: true });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: successCriteriaIds.length > 0,
  });
}

/**
 * Add objective to topic
 */
export function useLinkObjectiveToTopic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ topicId, objectiveId, orderIndex }: { 
      topicId: string; 
      objectiveId: string; 
      orderIndex: number;
    }) => {
      const { error } = await supabase
        .from('topic_objectives')
        .insert({ topic_id: topicId, objective_id: objectiveId, order_index: orderIndex });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['topic-objectives', variables.topicId] });
      toast({ title: 'Objective linked', description: 'Objective added to topic' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to link objective', 
        variant: 'destructive' 
      });
    },
  });
}

/**
 * Remove objective from topic
 */
export function useUnlinkObjectiveFromTopic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ topicId, objectiveId }: { 
      topicId: string; 
      objectiveId: string;
    }) => {
      const { error } = await supabase
        .from('topic_objectives')
        .delete()
        .eq('topic_id', topicId)
        .eq('objective_id', objectiveId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['topic-objectives', variables.topicId] });
      toast({ title: 'Objective removed', description: 'Objective removed from topic' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to unlink objective', 
        variant: 'destructive' 
      });
    },
  });
}

/**
 * Get objectives filtered by curriculum (for objective selector UI)
 * Uses legacy text fields (level, subdomain) as fallback when IDs are null
 */
export function useObjectivesByCurriculum({
  subjectId,
  domainId,
  subdomainId,
  levelCode,
  subdomainLabel,
}: {
  subjectId?: string;
  domainId?: string;
  subdomainId?: string;
  levelCode?: string;
  subdomainLabel?: string;
}) {
  return useQuery({
    queryKey: ['objectives-by-curriculum', { subjectId, domainId, subdomainId, levelCode, subdomainLabel }],
    queryFn: async () => {
      // Try ID-based query first
      if (subjectId && domainId && subdomainId) {
        const { data, error } = await supabase
          .from('objectives')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('domain_id', domainId)
          .eq('subdomain_id', subdomainId)
          .order('id');
        
        if (error) throw error;
        if (data && data.length > 0) return data as Objective[];
      }
      
      // Fallback: query by legacy text fields (level and subdomain)
      if (levelCode) {
        let query = supabase
          .from('objectives')
          .select('*')
          .ilike('level', `%${levelCode}%`);
        
        // Also filter by subdomain label if provided
        if (subdomainLabel) {
          query = query.eq('subdomain', subdomainLabel);
        }
        
        const { data, error } = await query.order('id');
        
        if (error) throw error;
        return data as Objective[];
      }
      
      return [];
    },
    enabled: !!(subjectId && domainId && subdomainId) || !!levelCode,
  });
}
