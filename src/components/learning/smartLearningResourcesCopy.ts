import type { LearningResourceRecommendation } from "@/types/smart-learning";

export function getSmartLearningResourcesCopy(language: string, source?: string) {
  const fr = language === "fr";
  const homework = source === "homework";
  return {
    title: homework ? (fr ? "Pour t’aider" : "To help you") : (fr ? "Apprendre ce sujet" : "Learn more about this"),
    detectedTopic: homework ? (fr ? "Sujets trouvés" : "Topics found") : (fr ? "Tu travailles sur :" : "You are learning:"),
    loading: fr ? "Recherche de vidéos et quiz utiles..." : "Finding helpful videos and quizzes...",
    empty: fr
      ? "Aucune vidéo ni aucun quiz correspondant pour le moment. Essaie plutôt un petit exercice."
      : "No matching videos or quizzes yet. Try a quick practice question instead.",
    video: fr ? "Regarder" : "Watch",
    quiz: fr ? "Essayer" : "Try",
    practice: fr ? "S'entraîner" : "Practice",
    matchReason: fr ? "Correspond à :" : "Matches:",
  };
}

export function getVisibleLearningResources(recommendations: LearningResourceRecommendation[]) {
  return recommendations.slice(0, 4);
}
