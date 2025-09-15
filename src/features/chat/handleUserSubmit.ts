import { isLikelyMath } from "@/lib/math-detect";
import { detectAnswer } from "@/lib/answer-detect";
import { normalizeToLatex } from "@/lib/math-normalize";

// You'll call your existing server endpoints from here:
import { sendMessageToAI } from "@/services/chatService";           // your existing chat call
import { evaluateHomework } from "@/services/homeworkGrading";       // returns "CORRECT" | "INCORRECT"
import { fetchExplanation } from "@/features/explanations/request"; // calls your Admin-managed Explanation prompt
import { Exercise, Message } from "@/types/chat";

type RouteResult =
  | { route: "chat" }
  | { route: "coach"; latex: string }
  | { route: "grade"; latex: string; studentAnswer: string };

export function routeUserInput(raw: string): RouteResult {
  const isMath = isLikelyMath(raw);
  if (!isMath) return { route: "chat" };

  const { hasAnswer, extracted } = detectAnswer(raw);
  const { latex } = normalizeToLatex(raw);

  if (!hasAnswer) return { route: "coach", latex };
  return { route: "grade", latex, studentAnswer: extracted ?? raw };
}

export async function handleUserSubmit(raw: string, ctx: {
  response_language: "fr" | "en",
  grade_level?: string,
  country?: string,
  learning_style?: string,
  attempt_count?: number,
  teacherReveal?: boolean,
  selectedModelId: string,
  messages: Message[]
}) {

  const routed = routeUserInput(raw);

  if (routed.route === "chat") {
    const result = await sendMessageToAI(raw, ctx.messages, ctx.selectedModelId, ctx.response_language);
    return result;
  }

  if (routed.route === "coach") {
    // Render math nicely, then ask for an attempt (no grader yet)
    renderMathCard(routed.latex);
    
    const exercise: Exercise = {
      id: Date.now().toString(),
      question: raw,
      userAnswer: '',
      expanded: false,
      isCorrect: false,
      attemptCount: 0,
      attempts: [],
      lastAttemptDate: new Date(),
      needsRetry: true
    };
    
    const explanation = await fetchExplanation(
      exercise,
      ctx.selectedModelId,
      {
        gradeLevel: ctx.grade_level,
        language: ctx.response_language,
        country: ctx.country
      },
      "concept"
    );
    
    return { data: { content: explanation } };
  }

  if (routed.route === "grade") {
    const exercise: Exercise = {
      id: Date.now().toString(),
      question: raw,
      userAnswer: routed.studentAnswer,
      expanded: false,
      isCorrect: false,
      attemptCount: 1,
      attempts: [],
      lastAttemptDate: new Date(),
      needsRetry: false
    };
    
    const gradedExercise = await evaluateHomework(
      exercise,
      ctx.attempt_count ?? 1,
      ctx.response_language,
      ctx.selectedModelId
    );

    showGradingBadge(gradedExercise.isCorrect ? "CORRECT" : "INCORRECT");

    if (gradedExercise.isCorrect) {
      // optional: light extension coaching
      const explanation = await fetchExplanation(
        gradedExercise,
        ctx.selectedModelId,
        {
          gradeLevel: ctx.grade_level,
          language: ctx.response_language,
          country: ctx.country
        },
        "concept"
      );
      return { data: { content: explanation } };
    }

    // Return the graded exercise with explanation
    return { 
      data: { 
        content: gradedExercise.explanation || "Please try again.",
        exercise: gradedExercise
      } 
    };
  }
}

// Stub UI helpers to avoid TS errors (replace with your actual UI functions)
function renderMathCard(latex: string) { /* show LaTeX in your message list */ }
function showGradingBadge(v: "CORRECT" | "INCORRECT") { /* tiny UI tag */ }