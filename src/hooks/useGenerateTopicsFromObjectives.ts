import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GenerateTopicsParams {
  category_id: string;
  country_code?: string;
  level_code?: string | null;
  subject_id_uuid?: string | null;
  dry_run?: boolean;
}

export interface PreviewTopic {
  level_code: string;
  subject_id_uuid: string | null;
  subject_name: string | null;
  domain_id_uuid: string | null;
  domain_name: string | null;
  subdomain_id_uuid: string | null;
  topic_name: string;
  slug: string;
  objective_count: number;
  status: "will_create" | "already_exists" | "skipped_orphan";
  existing_topic_id?: string;
}

export interface GenerateTopicsResult {
  dry_run: boolean;
  created: number;
  skipped_existing: number;
  links_added: number;
  topics: PreviewTopic[];
  message?: string;
}

export const useGenerateTopicsFromObjectives = () => {
  return useMutation<GenerateTopicsResult, Error, GenerateTopicsParams>({
    mutationFn: async (params) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-topics-from-objectives",
        { body: params },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as GenerateTopicsResult;
    },
  });
};
