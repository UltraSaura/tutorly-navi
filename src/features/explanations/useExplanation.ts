import React from "react";
import { Exercise } from "@/types/chat";
import { useTwoCardTeaching } from "./useTwoCardTeaching";
import { useLanguage } from "@/context/LanguageContext";

// Utility function to map language codes to full names for AI
const mapLanguageForAI = (languageCode: string): string => {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'fr': 'French'
  };
  return languageMap[languageCode] || 'English';
};

export function useExplanation() {
  const twoCardTeaching = useTwoCardTeaching();
  const { language } = useLanguage();

  async function openWithExercise(exerciseRow: Exercise) {
    // Convert exercise to the format expected by two-card teaching
    const exerciseData = {
      prompt: exerciseRow.question,
      userAnswer: exerciseRow.userAnswer,
      subject: exerciseRow.subjectId || "math"
    };
    
    const profile = {
      response_language: mapLanguageForAI(language),
      grade_level: "High School"
    };
    
    await twoCardTeaching.openFor(exerciseData, profile);
  }

  return { 
    open: twoCardTeaching.open, 
    setOpen: twoCardTeaching.setOpen, 
    loading: twoCardTeaching.loading, 
    sections: twoCardTeaching.sections, 
    error: twoCardTeaching.error, 
    openWithExercise,
    exerciseQuestion: twoCardTeaching.sections?.exercise || ""
  };
}