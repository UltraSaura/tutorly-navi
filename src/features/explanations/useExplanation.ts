import React from "react";
import type { Step } from "./types";
import { fetchExplanation } from "./request";
import { parseConceptResponse } from "./validate";
import { Exercise } from "@/types/chat";

export function useExplanation() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function openWithExercise(exerciseRow: Exercise) {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchExplanation(exerciseRow, undefined, undefined, "concept"); // calls AI and returns raw text
      const payload = parseConceptResponse(raw);       // parses to { steps }
      setSteps(payload.steps);
      console.log("[Explain] steps set >>>", payload.steps);
    } catch (e: any) {
      setError("Couldn't load explanation. Please try again.");
      setSteps([{ title:"How to approach", body:"Break the problem into smaller steps and re-check your operations.", icon:"lightbulb", kind:"concept" }]);
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, steps, error, openWithExercise };
}