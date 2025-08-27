import React from "react";
import type { Step } from "./types";
import { fetchExplanation } from "./request";
import { parseConceptResponse } from "./validate";
import { Exercise } from "@/types/chat";
import { useAdmin } from "@/context/AdminContext";

export function useExplanation() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [exerciseQuestion, setExerciseQuestion] = React.useState<string>("");
  
  const { activePromptTemplate, selectedModelId } = useAdmin();

  async function openWithExercise(exerciseRow: Exercise) {
    setOpen(true);
    setLoading(true);
    setError(null);
    setExerciseQuestion(exerciseRow.question ?? "");
    try {
      const raw = await fetchExplanation(
        exerciseRow, 
        undefined, 
        "concept",
        activePromptTemplate,
        selectedModelId
      );
      const payload = parseConceptResponse(raw, exerciseRow.question ?? "");
      setSteps(payload.steps);
      console.log("[Explain] steps set >>>", payload.steps);
    } catch (e: any) {
      setError("Couldn't load explanation. Please try again.");
      setSteps([{ title:"How to approach", body:"Break the problem into smaller steps and re-check your operations.", icon:"lightbulb", kind:"concept" }]);
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, steps, error, openWithExercise, exerciseQuestion };
}