import { useMutation } from '@tanstack/react-query';
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

// Hook to auto-suggest and link objectives for a topic
export function useAutoLinkObjectives() {
  const { toast } = useToast();
  const suggestMutation = useAutoSuggestObjectives();

  return useMutation({
    mutationFn: async ({
      topicId,
      topicName,
      topicDescription,
      topicKeywords,
      levelCode,
      countryCode,
      confidenceThreshold = 0.9,
    }: {
      topicId: string;
      topicName: string;
      topicDescription?: string;
      topicKeywords?: string[];
      levelCode?: string;
      countryCode?: string;
      confidenceThreshold?: number;
    }): Promise<{ linkedCount: number; suggestions: ObjectiveSuggestion[] }> => {
      // Get suggestions from AI
      const result = await suggestMutation.mutateAsync({
        topicName,
        topicDescription,
        topicKeywords,
        levelCode,
        countryCode,
      });

      const suggestions = result.suggestions || [];
      const highConfidence = suggestions.filter(s => s.confidence >= confidenceThreshold);

      // Get existing linked objectives to avoid duplicates
      const { data: existingLinks } = await supabase
        .from('topic_objectives')
        .select('objective_id')
        .eq('topic_id', topicId);

      const existingIds = new Set((existingLinks || []).map(l => l.objective_id));
      const toLink = highConfidence.filter(s => !existingIds.has(s.objective_id));

      // Link high-confidence objectives
      if (toLink.length > 0) {
        const links = toLink.map((s, idx) => ({
          topic_id: topicId,
          objective_id: s.objective_id,
          order_index: existingIds.size + idx,
        }));

        const { error } = await supabase
          .from('topic_objectives')
          .insert(links);

        if (error) {
          console.error('Error linking objectives:', error);
          throw new Error('Failed to link objectives');
        }
      }

      return {
        linkedCount: toLink.length,
        suggestions: suggestions.filter(s => s.confidence < confidenceThreshold),
      };
    },
    onSuccess: ({ linkedCount }) => {
      if (linkedCount > 0) {
        toast({
          title: 'Objectives auto-linked',
          description: `${linkedCount} learning objective${linkedCount > 1 ? 's' : ''} linked automatically based on AI analysis`,
        });
      }
    },
    onError: (error) => {
      console.error('Error auto-linking objectives:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to auto-link objectives',
        variant: 'destructive',
      });
    },
  });
}