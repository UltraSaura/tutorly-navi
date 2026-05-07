import type { ExamExercise } from "../parsers/pdf-to-exam.ts";

export interface SchoolProgramEntry {
  id: string;
  level?: string;
  subject?: string;
  domain?: string;
  subdomain?: string;
  objective?: string;
  text?: string;
  keywords?: string[];
}

export interface ExerciseProgramLink {
  exercise_id: string;
  program_entry_id: string;
  program_entry_type: "objective" | "success_criterion" | "topic" | "unknown";
  confidence: number;
  rationale: string;
}

export function proposeExerciseProgramLinks(
  exercises: ExamExercise[],
  programEntries: SchoolProgramEntry[],
): ExerciseProgramLink[] {
  if (programEntries.length === 0) return [];

  return exercises.flatMap((exercise) => {
    const scored = programEntries
      .map((entry) => ({ entry, score: scoreExerciseAgainstEntry(exercise, entry) }))
      .filter((candidate) => candidate.score >= 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(({ entry, score }) => ({
      exercise_id: exercise.id,
      program_entry_id: entry.id,
      program_entry_type: inferEntryType(entry),
      confidence: Number(score.toFixed(2)),
      rationale: buildRationale(exercise, entry, score),
    }));
  });
}

function scoreExerciseAgainstEntry(exercise: ExamExercise, entry: SchoolProgramEntry): number {
  const exerciseTokens = tokenize(exercise.raw_text);
  const entryTokens = tokenize([entry.domain, entry.subdomain, entry.objective, entry.text, ...(entry.keywords ?? [])].join(" "));
  if (exerciseTokens.size === 0 || entryTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of entryTokens) {
    if (exerciseTokens.has(token)) overlap += 1;
  }

  const base = overlap / Math.max(entryTokens.size, 1);
  const subjectBoost = normalize(entry.subject ?? "").includes(normalize(exercise.discipline)) ? 0.15 : 0;
  const levelBoost = entry.level === "3eme" ? 0.08 : 0;
  return Math.min(1, base + subjectBoost + levelBoost);
}

function inferEntryType(entry: SchoolProgramEntry): ExerciseProgramLink["program_entry_type"] {
  if (entry.objective !== undefined || entry.text !== undefined) return "objective";
  return "unknown";
}

function buildRationale(exercise: ExamExercise, entry: SchoolProgramEntry, score: number): string {
  const label = entry.objective ?? entry.text ?? entry.subdomain ?? entry.domain ?? entry.id;
  return `Correspondance lexicale avec "${label}" dans ${exercise.discipline}, niveau vise 3eme; score heuristique ${score.toFixed(2)}.`;
}

function tokenize(value: string): Set<string> {
  const stopWords = new Set(["avec", "dans", "pour", "une", "des", "les", "aux", "sur", "que", "qui", "est", "sont", "par"]);
  return new Set(
    normalize(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !stopWords.has(token)),
  );
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
