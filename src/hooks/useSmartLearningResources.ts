import { useQuery } from "@tanstack/react-query";
import {
  extractLearningContext,
  getRecommendedLearningResources,
} from "@/services/smartLearningResources";
import type { ExtractLearningContextInput } from "@/types/smart-learning";

export function useSmartLearningResources(input: ExtractLearningContextInput | null, studentId?: string, limit = 4) {
  return useQuery({
    queryKey: ["smart-learning-resources", input, studentId, limit],
    queryFn: async () => {
      if (!input) return { skillMatches: [], recommendations: [] };
      const skillMatches = await extractLearningContext(input);
      const recommendations = await getRecommendedLearningResources({
        studentId,
        skillMatches,
        gradeLevel: input.gradeLevel,
        country: input.country,
        language: input.responseLanguage || "en",
        limit,
      });
      return { skillMatches, recommendations };
    },
    enabled: !!input,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
