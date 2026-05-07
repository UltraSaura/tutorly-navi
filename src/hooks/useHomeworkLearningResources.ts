import { useQuery } from "@tanstack/react-query";
import {
  getHomeworkLearningResources,
  type HomeworkLearningResourcesInput,
} from "@/services/homeworkLearningResources";

export function useHomeworkLearningResources(input: HomeworkLearningResourcesInput | null) {
  return useQuery({
    queryKey: ["homework-learning-resources", "row-scoped-v2", input],
    queryFn: () =>
      input
        ? getHomeworkLearningResources(input)
        : Promise.resolve({ skillMatches: [], recommendations: [] }),
    enabled: !!input,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
