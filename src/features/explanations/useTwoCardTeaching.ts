import React from "react";
import { requestTwoCardTeaching } from "./promptClient";
import { parseTwoCardText, TeachingSections } from "./twoCardParser";

export function useTwoCardTeaching() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<TeachingSections | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function openFor(row: any, profile: { response_language?: string; grade_level?: string }) {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const raw = await requestTwoCardTeaching({
        exercise_content: row?.prompt ?? "",
        student_answer: row?.userAnswer ?? "",
        subject: row?.subject ?? "math",
        response_language: profile?.response_language ?? "English",
        grade_level: profile?.grade_level ?? "High School",
      });
      const parsed = parseTwoCardText(raw);
      if (!parsed.concept && !parsed.example && !parsed.strategy) {
        setSections({
          exercise: "Your exercise",
          concept: "We'll focus on the exact math idea you need here.",
          example: "Here's a similar example with different numbers.",
          strategy: "1) Understand the goal  2) Apply the rules  3) Check your result.",
          pitfall: "Don't apply an operation to only one part.",
          check: "Explain why your steps are valid.",
        });
      } else {
        setSections(parsed);
      }
    } catch (e:any) {
      setError("Couldn't load the teaching explanation. Please try again.");
      setSections({
        exercise: "Your exercise",
        concept: "We'll focus on the exact math idea you need here.",
        example: "Here's a similar example with different numbers.",
        strategy: "1) Understand the goal  2) Apply the rules  3) Check your result.",
        pitfall: "Don't apply an operation to only one part.",
        check: "Explain why your steps are valid.",
      });
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, loading, sections, error, openFor };
}