import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ObjectiveSuggestion {
  objective_id: string;
  objective_text: string;
  domain: string;
  subdomain: string;
  confidence: number;
  reason: string;
}

interface SuggestObjectivesParams {
  topicName: string;
  topicDescription?: string;
  topicKeywords?: string[];
  levelCode?: string;
  countryCode?: string;
}

interface SuggestObjectivesResponse {
  suggestions: ObjectiveSuggestion[];
  message?: string;
}

export function useAutoSuggestObjectives() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SuggestObjectivesParams): Promise<SuggestObjectivesResponse> => {
      const { data, error } = await supabase.functions.invoke('suggest-topic-objectives', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Failed to get suggestions');
      }

      return data as SuggestObjectivesResponse;
    },
    onError: (error) => {
      console.error('Error suggesting objectives:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to suggest objectives',
        variant: 'destructive',
      });
    },
  });
}

// Auto-suggest then auto-link high-confidence objectives
export function useAutoLinkObjectives() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      topicId,
      topicName,
      topicDescription,
      topicKeywords,
      levelCode,
      countryCode,
      confidenceThreshold = 0.85,
    }: {
      topicId: string;
      topicName: string;
      topicDescription?: string;
      topicKeywords?: string[];
      levelCode?: string;
      countryCode?: string;
      confidenceThreshold?: number;
    }): Promise<{ linkedCount: number }> => {
      // 1) Ask AI
      const { data, error } = await supabase.functions.invoke('suggest-topic-objectives', {
        body: {
          topicName,
          topicDescription,
          topicKeywords,
          levelCode,
          countryCode,
        },
      });

      if (error) throw new Error(error.message || 'Failed to get suggestions');

      const suggestions = (data as SuggestObjectivesResponse)?.suggestions || [];
      const highConfidence = suggestions.filter((s) => s.confidence >= confidenceThreshold);

      if (highConfidence.length === 0) return { linkedCount: 0 };

      // 2) Avoid duplicates
      const { data: existingLinks, error: existingError } = await supabase
        .from('topic_objectives')
        .select('objective_id')
        .eq('topic_id', topicId);

      if (existingError) throw new Error(existingError.message);

      const existingIds = new Set((existingLinks || []).map((l) => l.objective_id));
      const toLink = highConfidence.filter((s) => !existingIds.has(s.objective_id));

      if (toLink.length === 0) return { linkedCount: 0 };

      const links = toLink.map((s, idx) => ({
        topic_id: topicId,
        objective_id: s.objective_id,
        order_index: existingIds.size + idx,
      }));

      const { error: insertError } = await supabase.from('topic_objectives').insert(links);
      if (insertError) throw new Error(insertError.message);

      return { linkedCount: toLink.length };
    },
    onSuccess: ({ linkedCount }, variables) => {
      if (linkedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['topic-objectives', variables.topicId] });
        toast({
          title: 'Objectives auto-linked',
          description: `${linkedCount} learning objective${linkedCount > 1 ? 's' : ''} linked automatically`,
        });
      }
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Failed to auto-link objectives';
      toast({
        title: 'Auto-link failed',
        description: msg.includes('row-level security') ? 'Permission denied: admin role required to link objectives.' : msg,
        variant: 'destructive',
      });
    },
  });
}
