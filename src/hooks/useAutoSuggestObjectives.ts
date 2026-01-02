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
