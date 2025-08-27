import React from "react";
import { Exercise } from "@/types/chat";
import { useTwoCardTeaching } from "./useTwoCardTeaching";

export function useExplanation() {
  const twoCardTeaching = useTwoCardTeaching();

  async function openWithExercise(exerciseRow: Exercise) {
    // Convert exercise to the format expected by two-card teaching
    const exerciseData = {
      prompt: exerciseRow.question,
      userAnswer: exerciseRow.userAnswer,
      subject: exerciseRow.subjectId || "math"
    };
    
    const profile = {
      response_language: "English",
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