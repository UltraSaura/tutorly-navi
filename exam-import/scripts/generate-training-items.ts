import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { levelForExam } from "../../src/domain/exams.ts";

type ItemType =
  | "multiple_choice"
  | "short_answer"
  | "numeric"
  | "free_response"
  | "guided_problem"
  | "document_question"
  | "proof"
  | "calculation";
type Difficulty = "easy" | "medium" | "hard";
type Status = "draft" | "reviewed" | "published" | "rejected";
type AnswerType = "numeric" | "short_answer" | "multiple_choice" | "free_response" | "math";
export type QuestionType = "mcq" | "numeric" | "text" | "expression";

export type ValidationSpec = {
  type: "exact" | "range" | "regex";
  value: unknown;
} | null;

interface CliOptions {
  bundle: string;
  out: string;
}

interface BundlePaper {
  id: string;
  pdf_hash: string;
  exam: string;
  level?: string | null;
  session_year: number;
  discipline: string;
  title?: string | null;
}

interface BundleQuestion {
  id: string;
  label?: string;
  text: string;
  answer_type?: string;
  /** QCM choices extracted from table-based exercises */
  choices?: string[];
  /** Nested sub-questions (a., b., c.) from LaTeX enumerate level 2 */
  subquestions?: Array<{ id: string; label: string; text: string }>;
}

interface NormalizedQuestion {
  id: string;
  label: string;
  text: string;
  answer_type?: string;
  choices: string[] | null;
}

interface BundleExercise {
  id: string;
  paper_id: string;
  exam: string;
  session_year: number;
  discipline: string;
  exercise_number: number | null;
  title: string | null;
  parsing_confidence?: "high" | "medium" | "low" | null;
  parsed_content?: {
    context?: string;
    documents?: unknown[];
    questions?: BundleQuestion[];
  } | null;
}

interface ExamBundle {
  papers?: BundlePaper[];
  exercises?: BundleExercise[];
}

interface TrainingItem {
  id: string;
  source_exercise_id: string | null;
  paper_id: string | null;
  exam: string;
  subject_slug: string;
  level: string;
  skill_tags: string[];
  curriculum_objective_ids: string[] | null;
  item_type: ItemType;
  prompt: string;
  context: string | null;
  documents: unknown[];
  choices: unknown[] | null;
  expected_answer: unknown | null;
  solution: string | null;
  hints: unknown[] | null;
  questions: TrainingQuestion[];
  difficulty: Difficulty;
  exam_style: string | null;
  source_year: number | null;
  source_label: string | null;
  metadata: Record<string, unknown>;
  status: Status;
}

interface TrainingQuestion {
  id: string;
  label: string;
  prompt: string;
  answer_type: AnswerType;
  choices: unknown[] | null;
  expected_answer: unknown | null;
  guidance: {
    hints: Array<{ level: number; text: string }>;
    correct_feedback: string;
    almost_feedback: string;
    incorrect_feedback: string;
  };
}

export interface EnrichedQuestion extends NormalizedQuestion {
  type: QuestionType;
  skill: string;
  validation: ValidationSpec;
  guidance: TrainingQuestion["guidance"];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const bundle = JSON.parse(await readFile(options.bundle, "utf8")) as ExamBundle;
  const papersById = new Map((bundle.papers ?? []).map((paper) => [paper.id, paper]));
  const items = (bundle.exercises ?? []).flatMap((exercise) => generateItemsForExercise(exercise, papersById.get(exercise.paper_id)));

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify({ training_items: items }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${options.out}`);
  console.log(`Training items: ${items.length}; published: ${items.filter((item) => item.status === "published").length}; draft: ${items.filter((item) => item.status === "draft").length}`);
}

function generateItemsForExercise(exercise: BundleExercise, paper: BundlePaper | undefined): TrainingItem[] {
  if (isAmiens2021TemperatureExercise(exercise)) {
    return generateAmiens2021TemperatureItems(exercise, paper);
  }

  const questions = (exercise.parsed_content?.questions ?? []).flatMap((question) => splitQuestionIntoTrainingQuestions(question));
  if (questions.length === 0) return [];

  const sourceExerciseUuid = deterministicUuid(`exam_exercise:${exercise.id}`);
  const paperUuid = paper ? deterministicUuid(`exam_paper:${paper.pdf_hash || paper.id}`) : null;
  const level = resolveTrainingItemLevel(exercise, paper);

  // Top-level exercise context (shared across all questions)
  const exerciseContext = exercise.parsed_content?.context ?? "";

  // Build a per-question part-context map so each question's tag inference uses only
  // its own part's context, preventing cross-part vocabulary contamination.
  // (e.g. Exercise 5 Partie B "pavé droit / m^3" should NOT tag Partie A arithmetic items)
  const questionPartContextMap = new Map<string, string>();
  for (const part of exercise.parsed_content?.parts ?? []) {
    const partCtx = (part as Record<string, unknown>).context as string ?? "";
    for (const q of ((part as Record<string, unknown>).questions as Array<{id: string}>) ?? []) {
      questionPartContextMap.set(q.id, partCtx);
    }
  }

  // For QCM exercises (all questions are multiple_choice from a table), assign diagrams
  // per-question rather than giving every item all exercise diagrams.
  //
  // Important: check for [Schéma] on the ORIGINAL (pre-split, pre-cleanPrompt) question texts
  // because cleanPrompt strips [Schéma] before we ever reach the questions.map() loop below.
  const allQcmChoices = questions.map((q) => q.choices ?? detectQcmChoices(q.text));
  const isQcmExercise = allQcmChoices.every((c) => c && c.length >= 2);
  const exerciseImageDocs = isQcmExercise
    ? sanitizeDocumentsForTraining(
        (exercise.parsed_content?.documents ?? []).filter(
          (d) => (d as Record<string, unknown>).type === "image"
        )
      )
    : [];
  // Build a map: question id → diagram document (from original question texts).
  // Only used for QCM exercises; other exercises always get all docs.
  const questionDiagramMap = new Map<string, unknown>();
  if (isQcmExercise && exerciseImageDocs.length > 0) {
    let dIdx = 0;
    for (const origQ of exercise.parsed_content?.questions ?? []) {
      if (origQ.text?.includes("[Schéma]") && dIdx < exerciseImageDocs.length) {
        questionDiagramMap.set(origQ.id, exerciseImageDocs[dIdx++]);
      }
    }
  }

  return questions.map((question, qIndex) => {
    const qcmChoices = question.choices ?? detectQcmChoices(question.text);
    // Pass choices to inferItemType so it can shortcut to "multiple_choice" when they exist
    const itemType = inferItemType(question.text, question.answer_type, qcmChoices);
    // Use only the question's own part context (not all parts) to avoid cross-part tag bleed
    const ownPartContext = questionPartContextMap.get(question.id) ?? "";
    const tagText = `${question.text} ${exerciseContext} ${ownPartContext}`;

    // Per-question documents: QCM items only get their own diagram (looked up by question id).
    // Non-QCM exercises keep all exercise documents on every item (e.g. roulette image in Ex1).
    let itemDocuments: unknown[];
    if (isQcmExercise) {
      // question.id for non-split questions is the original id (e.g. "3", "4", "6")
      // for split subquestions it's "2-2a" — strip the parent prefix to get the original id
      const origId = question.id.includes("-") ? question.id.split("-")[0] : question.id;
      const diagramDoc = questionDiagramMap.get(origId);
      itemDocuments = diagramDoc ? [diagramDoc] : [];
    } else {
      itemDocuments = sanitizeDocumentsForTraining(exercise.parsed_content?.documents ?? []);
    }

    return {
      id: deterministicUuid(`training_item:${exercise.id}:${qIndex}:${question.id}`),
      source_exercise_id: sourceExerciseUuid,
      paper_id: paperUuid,
      exam: exercise.exam,
      subject_slug: subjectSlugForDiscipline(exercise.discipline),
      level,
      skill_tags: inferSkillTags(tagText),
      curriculum_objective_ids: null,
      item_type: itemType,
      prompt: cleanPrompt(question.text),
      context: cleanNullable(exerciseContext),
      documents: itemDocuments,
      choices: qcmChoices,
      expected_answer: null,
      solution: null,
      hints: null,
      questions: [
        buildTrainingQuestion({
          id: question.id,
          label: question.label ?? `${question.id}.`,
          prompt: cleanPrompt(question.text),
          answerType: answerTypeForItemType(itemType),
          choices: qcmChoices,
          expectedAnswer: null,
          guidance: genericGuidanceForText(question.text),
        }),
      ],
      difficulty: inferDifficulty(itemType, question.text),
      exam_style: "dnb_official",
      source_year: exercise.session_year,
      source_label: sourceLabel(exercise, paper),
      metadata: {
        source_question_id: question.id,
        source_question_label: question.label ?? `${question.id}.`,
        confidence: exercise.parsing_confidence ?? "medium",
        can_generate_similar: true,
        source_pattern_summary: summarizePattern(question.text),
        transformation_notes: "Generated from parsed annale question; requires review before publication.",
      },
      status: "draft",
    };
  });
}

export function splitQuestionIntoTrainingQuestions(question: BundleQuestion): NormalizedQuestion[] {
  const text = cleanPrompt(question.text);
  // Prefer explicit choices from the bundle (QCM table extraction), fall back to text detection
  // detectQcmChoices needs raw text (before cleanPrompt collapses \n) to find newline-separated expressions
  const qcmChoices = question.choices?.length ? question.choices : detectQcmChoices(question.text);

  // If the question has structured sub-questions (from LaTeX enumerate level 2), use those
  const bundleSubquestions = question.subquestions;
  if (bundleSubquestions && bundleSubquestions.length > 0) {
    return bundleSubquestions.map((sub) => ({
      id: `${question.id}-${sub.id}`,
      label: sub.label,
      text: cleanPrompt(sub.text),
      answer_type: question.answer_type,
      // detectQcmChoices must run on raw text (before cleanPrompt collapses \n to spaces)
      // so that newline-separated expressions like E_1 = ...\nE_2 = ... are detected
      choices: detectQcmChoices(sub.text),
    }));
  }

  // Try to find sub-questions embedded in the text (fallback for text-based parsing)
  const subquestions = splitLetteredSubquestions(text);
  if (subquestions.length > 1) {
    return subquestions.map((sub, index) => ({
      id: `${question.id}-${sub.label.replace(/[^a-z0-9]+/gi, "").toLowerCase() || index + 1}`,
      label: sub.label,
      text: sub.text,
      answer_type: question.answer_type,
      choices: detectQcmChoices(sub.text),
    }));
  }

  // Skip questions with no meaningful text (bare container labels like "3.")
  if (!text || text === `${question.id}.` || text === question.label?.trim()) {
    return [];
  }

  return [{
    id: question.id,
    label: question.label ?? `${question.id}.`,
    text,
    answer_type: question.answer_type,
    choices: qcmChoices,
  }];
}

export function splitLetteredSubquestions(text: string): Array<{ label: string; text: string }> {
  const normalized = text.replace(/\s+/g, " ").trim();
  const marker = /(?:^|\s)([a-z])(?:\)|\.|\s+-)\s+/gi;
  const matches = [...normalized.matchAll(marker)].filter((match) => {
    const letter = match[1].toLowerCase();
    return letter >= "a" && letter <= "h";
  });

  if (matches.length < 2) return [];

  return matches.map((match, index) => {
    const next = matches[index + 1];
    const markerStart = match.index ?? 0;
    const textStart = markerStart + match[0].length;
    const textEnd = next?.index ?? normalized.length;
    return {
      label: `${match[1].toLowerCase()}.`,
      text: normalized.slice(textStart, textEnd).trim(),
    };
  }).filter((part) => part.text.length > 0);
}

// ---------------------------------------------------------------------------
// 3-stage splitting pipeline
// ---------------------------------------------------------------------------

export function splitParts(text: string): Array<{ id: string; title: string | null; content: string }> {
  const parts = text.split(/(?=Partie\s+[A-Z])/i);
  const result = parts
    .map((part, index) => ({
      id: `part_${index}`,
      title: part.match(/Partie\s+[A-Z]/i)?.[0] ?? null,
      content: part.trim(),
    }))
    .filter((p) => p.content.length > 0);
  return result.length > 0 ? result : [{ id: "part_0", title: null, content: text.trim() }];
}

export function splitMainQuestions(text: string): string[] {
  return text
    .split(/(?=\n?\s*\d+[.)]\s+)/)
    .map((q) => q.trim())
    .filter((q) => q.length > 20);
}

export function splitSubQuestions(text: string): string[] {
  const subs = text.split(/(?=\b[a-d][.)]\s+)/i);
  if (subs.length <= 1) return [text];
  return subs.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function cleanQuestionText(text: string): string {
  return text
    .replace(/^(\d+[.)]\s*)/, "")
    .replace(/^([a-d][.)]\s*)/i, "")
    .replace(/Exercice\s+\d+/i, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractQuestions(exerciseText: string): NormalizedQuestion[] {
  if (!exerciseText || exerciseText.trim().length === 0) return [];
  const parts = splitParts(exerciseText);
  const questions: NormalizedQuestion[] = [];

  for (const [partIndex, part] of parts.entries()) {
    const mainQs = splitMainQuestions(part.content);
    for (const [mainIndex, mainQ] of mainQs.entries()) {
      const subQs = splitSubQuestions(mainQ);
      for (const [subIndex, subQ] of subQs.entries()) {
        const text = cleanQuestionText(subQ);
        if (text.length <= 15) continue;
        const letterSuffix = subQs.length > 1 && subIndex > 0
          ? String.fromCharCode(96 + subIndex)
          : "";
        questions.push({
          id: `p${partIndex}_q${mainIndex}_s${subIndex}`,
          label: `${mainIndex + 1}${letterSuffix}.`,
          text,
          answer_type: undefined,
          choices: detectQcmChoices(text),
        });
      }
    }
  }

  return questions;
}

export function detectQcmChoices(text: string): string[] | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const responseMatches = [...normalized.matchAll(/Réponse\s+([A-D])\s*:?\s*([^]*?)(?=\s+Réponse\s+[A-D]\s*:?\s*|$)/gi)];
  const responseChoices = responseMatches
    .map((match) => cleanPrompt(match[2] || `Réponse ${match[1].toUpperCase()}`))
    .filter(Boolean);
  if (responseChoices.length >= 2) return responseChoices;

  // Detect labelled algebraic expressions on separate lines: E_1 = ...\nE_2 = ...\nE_3 = ...
  // These appear when \qquad-separated display-math propositions were each put on their own line.
  // Only trigger for questions that ask to "recopier" or "choisir" among labelled propositions.
  const exprLines = text.split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[A-Z][_\d]*\s*=/.test(l));  // lines like "E_1 = ..." or "A = ..."
  if (
    exprLines.length >= 2 &&
    /parmi|proposition|recopier|choisir/i.test(normalized)
  ) return exprLines.map((l) => cleanPrompt(l));

  const bulletMatches = [...normalized.matchAll(/(?:^|\s)[-•]\s*([^•-]+?)(?=\s[-•]\s|$)/g)]
    .map((match) => cleanPrompt(match[1]))
    .filter((choice) => choice.length > 0);
  // Only treat bullets as QCM choices when the question clearly signals MCQ phrasing,
  // AND does NOT use "recopier" (which means "copy out the answer", not "tick a box")
  if (
    bulletMatches.length >= 2 &&
    /qcm|choisir|proposition|réponse/i.test(normalized) &&
    !/recopier/i.test(normalized)
  ) return bulletMatches;

  return null;
}

function generateAmiens2021TemperatureItems(exercise: BundleExercise, paper: BundlePaper | undefined): TrainingItem[] {
  const sourceExerciseUuid = deterministicUuid(`exam_exercise:${exercise.id}`);
  const paperUuid = paper ? deterministicUuid(`exam_paper:${paper.pdf_hash || paper.id}`) : null;
  const level = resolveTrainingItemLevel(exercise, paper);
  const documents = sanitizeDocumentsForTraining(exercise.parsed_content?.documents ?? []);
  const base = {
    source_exercise_id: sourceExerciseUuid,
    paper_id: paperUuid,
    exam: exercise.exam,
    subject_slug: "mathematiques",
    level,
    curriculum_objective_ids: null,
    context: "Le tableau donne les températures moyennes mensuelles à Tours en 2019.",
    documents,
    hints: null,
    exam_style: "dnb_official",
    source_year: 2021,
    source_label: sourceLabel(exercise, paper),
    status: "published" as const,
  };

  const specs: Array<Omit<TrainingItem, keyof typeof base | "id" | "metadata" | "questions"> & { key: string; metadata?: Record<string, unknown> }> = [
    {
      key: "temperature-novembre",
      item_type: "short_answer",
      prompt: "Quelle a été la température moyenne à Tours en novembre 2019 ?",
      skill_tags: ["lecture_tableau", "statistiques"],
      choices: null,
      expected_answer: { value: "8,2 °C", accepted: ["8,2", "8,2 °C", "8.2", "8.2 °C"] },
      solution: "En novembre, le tableau indique 8,2 °C.",
      difficulty: "easy",
      metadata: {
        guidance: guidanceMetadata("Lecture directe dans un tableau de données."),
      },
    },
    {
      key: "etendue",
      item_type: "numeric",
      prompt: "Détermine l’étendue de cette série.",
      skill_tags: ["statistiques", "etendue"],
      choices: null,
      expected_answer: { value: 18.2, unit: "°C", accepted: ["18,2", "18.2", "18,2 °C", "18.2 °C"] },
      solution: "Max 22,6 ; min 4,4 ; étendue = 22,6 - 4,4 = 18,2.",
      difficulty: "medium",
      metadata: {
        guidance: guidanceMetadata("Identifier le maximum et le minimum puis calculer l'écart."),
      },
    },
    {
      key: "formule-moyenne",
      item_type: "short_answer",
      prompt: "Quelle formule faut-il saisir en N2 pour calculer la moyenne annuelle ?",
      skill_tags: ["tableur", "moyenne"],
      choices: null,
      expected_answer: { value: "=MOYENNE(B2:M2)", accepted: ["=MOYENNE(B2:M2)", "MOYENNE(B2:M2)", "=AVERAGE(B2:M2)"] },
      solution: "La moyenne des douze mois se calcule avec =MOYENNE(B2:M2).",
      difficulty: "medium",
      metadata: {
        guidance: guidanceMetadata("Utiliser une formule de tableur sur la plage mensuelle."),
      },
    },
    {
      key: "verifier-moyenne",
      item_type: "free_response",
      prompt: "Vérifie que la température moyenne annuelle est 13,1 °C.",
      skill_tags: ["moyenne", "calcul"],
      choices: null,
      expected_answer: { value: "Somme des températures divisée par 12, arrondie à 13,1 °C." },
      solution: "On additionne les 12 températures puis on divise par 12. On obtient environ 13,1 °C.",
      difficulty: "medium",
      metadata: {
        guidance: guidanceMetadata("Reconstituer la moyenne à partir de la somme des valeurs."),
      },
    },
    {
      key: "pourcentage-augmentation",
      item_type: "multiple_choice",
      prompt: "Le pourcentage d’augmentation entre 2009 et 2019, arrondi à l’unité, est-il de 7 %, 10 % ou 13 % ?",
      skill_tags: ["pourcentage", "evolution"],
      choices: ["7 %", "10 %", "13 %"],
      expected_answer: { value: "10 %" },
      solution: "((13,1 - 11,9) / 11,9) × 100 ≈ 10,1 %, donc 10 % arrondi à l’unité.",
      difficulty: "medium",
      metadata: {
        guidance: guidanceMetadata("Comparer une évolution relative aux propositions données."),
      },
    },
  ];

  return specs.map((spec) => ({
    id: deterministicUuid(`training_item:${exercise.id}:${spec.key}`),
    ...base,
    ...spec,
    questions: [
      buildTrainingQuestion({
        id: "q1",
        label: "1.",
        prompt: spec.prompt,
        answerType: answerTypeForItemType(spec.item_type),
        choices: spec.choices,
        expectedAnswer: spec.expected_answer,
        guidance: guidanceForAmiensTemperatureSpec(spec.key),
      }),
    ],
    metadata: {
      source_question_id: spec.key,
      confidence: "high",
      reviewed_from_source: true,
      can_generate_similar: true,
      source_pattern_summary: "Lire et exploiter un tableau de températures mensuelles: lecture directe, étendue, moyenne, tableur, pourcentage d'évolution.",
      transformation_notes: "Item explicitly normalized and validated from DNB Amiens 2021 Exercice 1.",
      ...(spec.metadata ?? {}),
    },
  }));
}

function buildTrainingQuestion({
  id,
  label,
  prompt,
  answerType,
  choices,
  expectedAnswer,
  guidance,
}: {
  id: string;
  label: string;
  prompt: string;
  answerType: AnswerType;
  choices: unknown[] | null;
  expectedAnswer: unknown | null;
  guidance: TrainingQuestion["guidance"];
}): TrainingQuestion {
  return {
    id,
    label,
    prompt,
    answer_type: answerType,
    choices,
    expected_answer: expectedAnswer,
    guidance,
  };
}

function answerTypeForItemType(itemType: ItemType): AnswerType {
  if (itemType === "numeric" || itemType === "calculation") return "numeric";
  if (itemType === "multiple_choice") return "multiple_choice";
  if (itemType === "free_response" || itemType === "guided_problem" || itemType === "proof") return "free_response";
  return "short_answer";
}

function guidanceForAmiensTemperatureSpec(key: string): TrainingQuestion["guidance"] {
  if (key === "etendue") {
    return {
      hints: [
        { level: 1, text: "Cherche la température la plus élevée." },
        { level: 2, text: "Cherche la température la plus basse." },
        { level: 3, text: "Calcule maximum - minimum." },
      ],
      correct_feedback: "Oui, tu as bien identifié la méthode de l'étendue.",
      almost_feedback: "Tu es proche : vérifie les deux valeurs utilisées.",
      incorrect_feedback: "Reviens au tableau et cherche la plus grande puis la plus petite valeur.",
    };
  }

  if (key === "temperature-novembre") {
    return {
      hints: [
        { level: 1, text: "Repère la colonne du mois de novembre." },
        { level: 2, text: "Lis la valeur sur la ligne des températures." },
        { level: 3, text: "N'oublie pas l'unité indiquée dans le tableau." },
      ],
      correct_feedback: "Bonne lecture du tableau.",
      almost_feedback: "Tu es proche : vérifie que tu lis bien la colonne de novembre.",
      incorrect_feedback: "Reviens à la ligne des températures et à la colonne N.",
    };
  }

  if (key === "formule-moyenne") {
    return {
      hints: [
        { level: 1, text: "Une moyenne de tableur utilise une fonction dédiée." },
        { level: 2, text: "La plage doit couvrir les douze mois." },
        { level: 3, text: "Écris la fonction avec la plage allant de B2 à M2." },
      ],
      correct_feedback: "Oui, la plage des douze mois est bien utilisée.",
      almost_feedback: "Tu es proche : vérifie la fonction ou la plage de cellules.",
      incorrect_feedback: "Repère les cellules des douze températures avant d'écrire la formule.",
    };
  }

  if (key === "verifier-moyenne") {
    return {
      hints: [
        { level: 1, text: "Une moyenne se calcule avec la somme des valeurs." },
        { level: 2, text: "Il y a douze températures mensuelles." },
        { level: 3, text: "Explique la division par 12 et l'arrondi au dixième." },
      ],
      correct_feedback: "Bonne méthode : tu justifies la moyenne avec le calcul attendu.",
      almost_feedback: "Tu es proche : précise la somme, la division par 12 ou l'arrondi.",
      incorrect_feedback: "Reprends la définition d'une moyenne avant de conclure.",
    };
  }

  return {
    hints: [
      { level: 1, text: "Identifie la valeur de départ et la valeur d'arrivée." },
      { level: 2, text: "Calcule l'écart puis compare-le à la valeur de départ." },
      { level: 3, text: "Convertis le résultat en pourcentage puis choisis la proposition la plus proche." },
    ],
    correct_feedback: "Bonne réponse : tu as bien raisonné sur l'évolution relative.",
    almost_feedback: "Tu es proche : vérifie l'arrondi à l'unité.",
    incorrect_feedback: "Reprends la formule d'un pourcentage d'évolution.",
  };
}

/**
 * Generate topic-aware hints and feedback based on the question text.
 * Uses the same cognitive verb tiers as inferDifficulty for consistency.
 */
function genericGuidanceForText(text: string): TrainingQuestion["guidance"] {
  const n = text.toLowerCase();

  // ── Probability ──────────────────────────────────────────────────────────────
  if (/probabilit/.test(n)) return {
    hints: [
      { level: 1, text: "Liste les cas favorables et le nombre total de cas possibles." },
      { level: 2, text: "La probabilité = (nombre de cas favorables) ÷ (total des cas)." },
      { level: 3, text: "Vérifie que la probabilité est bien entre 0 et 1." },
    ],
    correct_feedback: "Bonne réponse : ton raisonnement probabiliste est correct.",
    almost_feedback: "Tu es proche : vérifie le dénominateur (total des cas).",
    incorrect_feedback: "Recommence en listant tous les cas possibles et les cas favorables.",
  };

  // ── Geometry / proof ─────────────────────────────────────────────────────────
  if (/démontrer|montrer que|rectangle en|pythagore|thalès/.test(n)) return {
    hints: [
      { level: 1, text: "Identifie les données utiles dans l'énoncé et sur la figure." },
      { level: 2, text: "Rappelle le théorème ou la propriété que tu vas utiliser." },
      { level: 3, text: "Rédige ta démonstration étape par étape : hypothèse → application → conclusion." },
    ],
    correct_feedback: "Bonne démonstration : la rédaction est complète.",
    almost_feedback: "La méthode est bonne, mais la rédaction doit être plus complète.",
    incorrect_feedback: "Reviens à la figure et identifie la propriété applicable (Pythagore, Thalès, angles…).",
  };

  // ── Area / volume ─────────────────────────────────────────────────────────────
  if (/aire|surface|volume|périmètre/.test(n)) return {
    hints: [
      { level: 1, text: "Identifie la forme géométrique et ses dimensions." },
      { level: 2, text: "Rappelle la formule : aire d'un disque = π × R², aire d'un triangle = (base × hauteur) ÷ 2…" },
      { level: 3, text: "Remplace les valeurs et calcule. N'oublie pas les unités (cm², m²…)." },
    ],
    correct_feedback: "Bonne réponse : formule et calcul corrects.",
    almost_feedback: "Le calcul est presque bon : vérifie les unités et l'arrondi.",
    incorrect_feedback: "Revérifie quelle formule s'applique à cette forme géométrique.",
  };

  // ── Statistics / data analysis ────────────────────────────────────────────────
  if (/étendue|maximum|minimum|médiane|moyenne|quartile/.test(n)) return {
    hints: [
      { level: 1, text: "Trie les valeurs de la série dans l'ordre croissant." },
      { level: 2, text: "Pour la médiane : repère la valeur du milieu (ou la moyenne des deux valeurs centrales)." },
      { level: 3, text: "Relis les données pour vérifier que ta valeur est cohérente avec la série." },
    ],
    correct_feedback: "Bonne méthode de traitement de données.",
    almost_feedback: "Tu es proche : as-tu bien trié la série en ordre croissant ?",
    incorrect_feedback: "Reviens aux données et trie-les d'abord de la plus petite à la plus grande.",
  };

  // ── Percentages / proportionality ────────────────────────────────────────────
  if (/pourcentage|augmentation|diminution|évolution|taux/.test(n)) return {
    hints: [
      { level: 1, text: "Identifie la valeur de départ et la variation." },
      { level: 2, text: "Taux d'évolution = (valeur finale − valeur initiale) ÷ valeur initiale." },
      { level: 3, text: "Convertis en pourcentage (× 100) et vérifie le signe (+/−)." },
    ],
    correct_feedback: "Bonne réponse : tu as bien calculé ce taux.",
    almost_feedback: "Tu es proche : vérifie l'arrondi ou la valeur de référence utilisée.",
    incorrect_feedback: "Reprends la formule du taux d'évolution et identifie la valeur initiale.",
  };

  // ── Algebra / functions ───────────────────────────────────────────────────────
  if (/fonction|image|antécédent|f\(x\)|expression|équation|développer|factoriser/.test(n)) return {
    hints: [
      { level: 1, text: "Lis la question en entier : s'agit-il d'une image (calcul direct) ou d'un antécédent (équation à résoudre) ?" },
      { level: 2, text: "Pour l'image de x : substitue x dans l'expression de f(x) et calcule." },
      { level: 3, text: "Pour l'antécédent : pose f(x) = valeur connue et résous l'équation." },
    ],
    correct_feedback: "Bonne réponse : tu as bien appliqué la définition de la fonction.",
    almost_feedback: "Tu es proche : vérifie si la question demande l'image ou l'antécédent.",
    incorrect_feedback: "Relis la question : cherche-t-on f(−4) (image) ou f(x) = 3 (antécédent) ?",
  };

  // ── Arithmetic / prime numbers / GCD ─────────────────────────────────────────
  if (/premier|decompos|pgcd|ppcm|diviseur|multiple/.test(n)) return {
    hints: [
      { level: 1, text: "Essaie de diviser par 2, puis par 3, puis par 5, puis par 7…" },
      { level: 2, text: "Écris la décomposition en facteurs premiers sous forme de puissances." },
      { level: 3, text: "Le PGCD = produit des facteurs communs à la puissance minimale." },
    ],
    correct_feedback: "Bonne décomposition en facteurs premiers.",
    almost_feedback: "Tu es proche : vérifie que tous les facteurs sont bien premiers.",
    incorrect_feedback: "Recommence la division euclidienne ou la décomposition en branche.",
  };

  // ── Programming / Scratch ─────────────────────────────────────────────────────
  if (/programme|scratch|algorithme|boucle|variable|script/.test(n)) return {
    hints: [
      { level: 1, text: "Lis le programme bloc par bloc dans l'ordre d'exécution." },
      { level: 2, text: "Applique chaque instruction avec la valeur de départ choisie." },
      { level: 3, text: "Note les valeurs intermédiaires de chaque variable à chaque étape." },
    ],
    correct_feedback: "Bonne exécution du programme.",
    almost_feedback: "Tu es proche : as-tu bien suivi l'ordre des instructions ?",
    incorrect_feedback: "Reprends depuis le début du programme et applique chaque bloc une fois.",
  };

  // ── Generic fallback ─────────────────────────────────────────────────────────
  return {
    hints: [
      { level: 1, text: "Repère les données importantes dans l'énoncé." },
      { level: 2, text: "Choisis la méthode ou la propriété adaptée à cette question." },
      { level: 3, text: "Rédige ta réponse complète et vérifie les unités si nécessaire." },
    ],
    correct_feedback: "Bonne réponse.",
    almost_feedback: "Tu es proche : relis et vérifie les calculs.",
    incorrect_feedback: "Relis l'énoncé et repère les données utiles avant de recommencer.",
  };
}

function guidanceMetadata(summary: string): Record<string, unknown> {
  return {
    source_pattern_summary: summary,
    guidance_scope: "per_question",
  };
}

function isAmiens2021TemperatureExercise(exercise: BundleExercise): boolean {
  return exercise.exam === "dnb"
    && exercise.session_year === 2021
    && exercise.discipline === "mathematiques"
    && exercise.exercise_number === 1
    && (exercise.parsed_content?.documents ?? []).some((doc) => isRecord(doc) && doc.id === "table-temperatures");
}

function sanitizeDocumentsForTraining(documents: unknown[]): unknown[] {
  return documents.map((document) => {
    if (!isRecord(document)) return document;
    return document;
  });
}

/**
 * Cognitive verb tiers (Bloom's taxonomy adapted for French middle-school math).
 * Used by inferDifficulty and inferItemType.
 */
const COGNITIVE_VERBS = {
  // Tier 1 — recall / apply (easy–medium)
  apply: /\b(calculer|déterminer|trouver|compléter|lire|relever|recopier|choisir|sélectionner|cocher)\b/i,
  // Tier 2 — understand / analyse (medium)
  analyse: /\b(expliquer|déduire|en déduire|vérifier|comparer|justifier que|montrer que|utiliser|appliquer)\b/i,
  // Tier 3 — synthesise / evaluate / prove (hard)
  synthesise: /\b(démontrer|prouver|établir|raisonner|construire la preuve|déduire que|montrer que|affirmer)\b/i,
} as const;

function inferItemType(text: string, parsedAnswerType: string | undefined, choices?: string[] | null): ItemType {
  const normalized = text.toLowerCase();
  // If structured choices were already extracted by the QCM parser, trust them
  if (parsedAnswerType === "multiple_choice" || (choices && choices.length >= 2)) return "multiple_choice";
  // Linguistic MCQ markers: "Parmi les N propositions" / "Parmi les réponses" / "Choisir parmi"
  if (/parmi les\s+\d+\s+|parmi les réponses|choisir parmi|sélectionner (la|une) réponse/i.test(normalized)) return "multiple_choice";
  // Historical DNB anomaly: explicit percentage choices
  if (/\b(7\s*%|10\s*%|13\s*%)\b/.test(normalized)) return "multiple_choice";
  // Proof / demonstration → free_response (structured writeup required)
  if (COGNITIVE_VERBS.synthesise.test(normalized)) return "free_response";
  // Short justifications / explanations → free_response
  // Also: "A-t-il raison?" / "a-t-elle raison?" / "ont-ils raison?" require written justification
  if (/\b(justifier|expliquer|pourquoi|montrer|vérifier|comparer)\b/i.test(normalized)) return "free_response";
  if (/a-t-(?:il|elle|on)\s+raison|ont-ils\s+raison|affirm(?:e|ent|ation)/i.test(normalized)) return "free_response";
  // Numeric computation
  if (/\b(calculer|déterminer|combien|étendue|moyenne|pourcentage|probabilité|volume|aire|longueur|hauteur|rayon|diamètre|angle|distance|mesure|résultat|valeur)\b/i.test(normalized)) return "numeric";
  // Expression / formula writing
  if (/\b(exprimer|écrire|donner l'expression|développer|réduire|factoriser|simplifier)\b/i.test(normalized)) return "short_answer";
  // Document-dependent questions
  if (/\b(tableau|figure|document|graphique|schéma|programme|script)\b/i.test(normalized)) return "document_question";
  return "short_answer";
}

/**
 * Infer curriculum-aligned skill tags from a question prompt.
 * Covers all major DNB Maths domains: Numbers, Algebra, Geometry, Data, Programming.
 */
function inferSkillTags(text: string): string[] {
  const n = text.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents for broader matching
  const tags = new Set<string>();

  // NOTE: use \b word-boundary anchors to avoid false-positives
  // (e.g. "paire" contains "aire", "noire" contains "oire" etc.)

  // ── Nombres et calculs ───────────────────────────────────────────────────────
  if (/\bfraction\b|numerat|denominat|\brapport\b|\bquotient\b/.test(n)) tags.add("fractions");
  // Also catch caret notation: (-5)^3 or x^2 in question text
  if (/\bpuissance\b|\bexposant\b|\bcar[ré]+\b|\bcube\b|racine carr|\^\d|\d\^/.test(n)) tags.add("puissances");
  // "produit de facteurs premiers" / "decomposer" / "pgcd" / sachet-distribution context
  if (/\bpremier\b|decompos|facteur premier|\bpgcd\b|\bppcm\b/.test(n)) tags.add("arithmetique");
  if (/d[eé]cimal|\bvirgule\b|\barrondi\b|approxi/.test(n)) tags.add("calcul_decimal");
  if (/\bpourcentage\b|augmentation|diminution|[eé]volution|\btaux\b/.test(n)) tags.add("pourcentages");
  if (/proportion|\b[eé]chelle\b|grandeur propor/.test(n)) tags.add("proportionnalite");
  // "multiple" alone is too broad (matches "choix multiple" in QCM context); require "multiple de" or "multiples de"
  // Also detect equal-distribution problems (PGCD context): "nombre de sachets", "répartir", "le plus grand nombre"
  if (/\bpgcd\b|\bppcm\b|\bdiviseur\b|\bmultiples? de\b|divisib|\best un multiple\b/.test(n)) tags.add("divisibilite");
  // "sachet" is a strong PGCD-problem indicator in French middle-school arithmetic
  if (/nombre de\s+(?:sachets?|groupes?|lots?|[eé]quipes?|bouquets?|rang[eé]es?)|\b[rr][eé]partir|\bdistribuer\b|\ble plus grand nombre\b|\bsachets?\b/.test(n)) tags.add("divisibilite");

  // ── Calcul littéral & fonctions ─────────────────────────────────────────────
  if (/\bfonction\b|\bimage\b|\bant[eé]c[eé]dent\b|\bf\(x\)|\bcourbe\b|repr[eé]sentation graphi/.test(n)) tags.add("fonctions");
  if (/d[eé]velopp|r[eé]dui|factori|\bidentit[eé]\b|distributi/.test(n)) tags.add("calcul_litteral");
  if (/[eé]quation|r[eé]soudre|in[eé]quation|\bsolution\b|\binconnue\b/.test(n)) tags.add("equations");
  // \blettre\b also matches "la lettre correspondant" in QCM preamble; remove it (use "variable" / "inconnue" instead)
  // x\b alone matches "choix" (ends with x at word boundary); use \bx\b (standalone x) for algebraic variables
  if (/\bexpression\b|\bvariable\b|\binconnue\b|substituer|remplacer|\bx\b/.test(n)) tags.add("calcul_litteral");
  if (/programme de calcul|\bscratch\b|\bboucle\b|\bcondition\b|\balgorithme\b|\bscript\b|s[eé]quence/.test(n)) tags.add("programmation");

  // ── Géométrie ────────────────────────────────────────────────────────────────
  if (/\btriangle\b|rectangle en|\bhypot[eé]nuse\b|\bpythagore\b|\bcos\b|\bsin\b|\btan\b|\bangle\b|\bcosinus\b|\bsinus\b/.test(n)) tags.add("trigonometrie");
  if (/\bcercle\b|\brayon\b|\bdiametre\b|\bdiamètre\b|\bdisque\b|\barc\b|\binscrit\b/.test(n)) tags.add("cercles");
  // Use \baire\b to avoid matching "paire", "aire" as standalone word only
  if (/\baire\b|\bsurface\b|\bvolume\b|p[eé]rim[eè]tre|\bpav[eé]\b|\bprisme\b|\bcylindre\b/.test(n)) tags.add("aires_volumes");
  // "image de X par la fonction" is a function concept, not geometric transformation;
  // only tag transformations when the geometric context is explicit
  if (/sym[eé]trie|rotation|\btranslation\b|transformation|\bimage d[u']\s*point\b|\bimage du\b/.test(n)) tags.add("transformations");
  if (/\bquadrilat[eè]re\b|\bpolyg[oô]ne\b|\blosange\b|parall[eé]logramme|trap[eè]ze/.test(n)) tags.add("geometrie_plane");
  if (/thal[eè]s|semblable|configuration de thal/.test(n)) tags.add("thales");
  if (/\bvecteur\b|coordonn[eé]es|\brepère\b|\babscisse\b|\bordonnée\b/.test(n)) tags.add("reperage");

  // ── Données & probabilités ───────────────────────────────────────────────────
  if (/probabilit|fr[eé]quence relative|\bhasard\b|al[eé]atoire/.test(n)) tags.add("probabilites");
  if (/\bmoyenne\b|\bm[eé]diane\b|[eé]tendue|\bquartile\b|statistique|\bs[eé]rie\b|\beffectif\b/.test(n)) tags.add("statistiques");
  if (/tableau de valeurs|tableau de donn[eé]es|fr[eé]quence/.test(n)) tags.add("lecture_donnees");
  if (/\btableur\b|\bcellule\b|formule tableur|feuille de calcul/.test(n)) tags.add("tableur");

  // ── Raisonnement ────────────────────────────────────────────────────────────
  if (COGNITIVE_VERBS.synthesise.test(text)) tags.add("demonstration");
  if (/justifier|\bpourquoi\b|expliquer pourquoi|a-t-(?:il|elle|on) raison|ont-ils raison|vrai ou faux/.test(n)) tags.add("justification");

  // Fallback: mark as DNB official exam content so it's at least searchable
  if (tags.size === 0) tags.add("annale_dnb");
  return [...tags];
}

/**
 * Infer difficulty using Bloom's taxonomy cognitive verb tiers + structural heuristics.
 * Returns "easy" | "medium" | "hard".
 */
function inferDifficulty(itemType: ItemType, text: string): Difficulty {
  const n = text.toLowerCase();

  // Tier 3 — synthesis/proof: always hard
  if (COGNITIVE_VERBS.synthesise.test(text)) return "hard";
  // Multi-step proofs signalled by "donc" / "en déduire" chains
  if (/\b(en déduire|donc|par conséquent)\b.*\b(calculer|déterminer)\b/i.test(text)) return "hard";
  // Explicit proof/justification verbs: hard
  if (/\bjustifier|démontrer|prouver|vérifier que\b/i.test(n)) return "hard";
  // Very long prompts (multi-step word problems)
  if (text.length > 280) return "hard";

  // Tier 2 — analysis: medium
  // "Pourquoi" and "A-t-il raison?" questions require arithmetic reasoning / justification
  if (/\bpourquoi\b|a-t-(?:il|elle|on)\s+raison|ont-ils\s+raison/i.test(n)) return "medium";
  if (COGNITIVE_VERBS.analyse.test(text)) return "medium";
  if (itemType === "numeric" || itemType === "calculation") return "medium";
  if (itemType === "multiple_choice") return "medium";
  // "Parmi", "choisir", "recopier" suggests evaluation/selection = medium
  if (/\b(parmi|choisir|sélectionner|recopier)\b/i.test(n)) return "medium";
  // Expression writing / algebraic manipulation
  if (/\b(exprimer|développer|factoriser|réduire|simplifier)\b/i.test(n)) return "medium";

  // Tier 1 — recall/apply: easy
  if (COGNITIVE_VERBS.apply.test(text)) return "easy";
  return "easy";
}

function summarizePattern(text: string): string {
  const compact = cleanPrompt(text);
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function sourceLabel(exercise: BundleExercise, paper: BundlePaper | undefined): string {
  const title = paper?.title ?? "Sujet officiel";
  const exerciseLabel = exercise.title ?? (exercise.exercise_number !== null ? `Exercice ${exercise.exercise_number}` : "Exercice");
  return `${title} - ${exerciseLabel}`;
}

function subjectSlugForDiscipline(discipline: string): string {
  if (discipline === "mathematiques") return "mathematiques";
  return discipline.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
}

export function resolveTrainingItemLevel(exercise: Pick<BundleExercise, "exam">, paper?: Pick<BundlePaper, "level" | "exam">): string {
  return cleanNullable(paper?.level) ?? levelForExam(paper?.exam ?? exercise.exam) ?? "unknown";
}

// ---------------------------------------------------------------------------
// Pure helper functions for skill detection, validation, guidance & enrichment
// ---------------------------------------------------------------------------

export function detectSkill(text: string, context = ""): string {
  const n = (text + " " + context).toLowerCase();
  if (/tableau|cellule|formule|tableur|feuille de calcul|ligne|colonne/.test(n)) return "spreadsheet";
  if (/moyenne|étendue|médiane|série|écart|données/.test(n)) return "statistics";
  if (/probabilit|hasard|chance/.test(n)) return "probability";
  if (/pourcentage|évolution|augmentation|diminution/.test(n)) return "percentages";
  if (/triangle|angle|symétrie|rotation|figure|périmètre|géométrie|cercle|segment/.test(n)) return "geometry";
  if (/équation|inéquation|développer|factoriser|expression|calcul littéral/.test(n)) return "algebra";
  if (/fraction|quotient/.test(n)) return "fractions";
  if (/volume|capacité|contenance/.test(n)) return "volume";
  return "general_math";
}

export function buildValidation(itemType: ItemType, expectedAnswer: unknown): ValidationSpec {
  if (expectedAnswer === null || expectedAnswer === undefined) return null;

  if (itemType === "multiple_choice") {
    const val = isRecord(expectedAnswer) ? expectedAnswer.value : expectedAnswer;
    if (typeof val === "string") return { type: "exact", value: val };
  }

  if (itemType === "numeric" || itemType === "calculation") {
    const val = isRecord(expectedAnswer) ? expectedAnswer.value : expectedAnswer;
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
    if (Number.isFinite(num)) {
      const round2 = (v: number) => Math.round(v * 100) / 100;
      return { type: "range", value: [round2(num - 0.1), round2(num + 0.1)] };
    }
  }

  if (itemType === "short_answer") {
    const val = isRecord(expectedAnswer) ? expectedAnswer.value : expectedAnswer;
    if (typeof val === "string") return { type: "exact", value: val };
  }

  return null;
}

export function detectQuestionType(text: string): QuestionType {
  const t = text.toLowerCase();
  if (/calculer|combien|déterminer|donner la valeur/.test(t)) return "numeric";
  if (/choisir|parmi|quelle est la bonne réponse/.test(t)) return "mcq";
  if (/résoudre|équation|expression/.test(t)) return "expression";
  if (/justifier|expliquer|pourquoi|montrer que/.test(t)) return "text";
  return "text";
}

export function buildValidationFromContext(text: string, context: string): ValidationSpec {
  const combined = text + " " + context;
  const numberMatch = combined.match(/[-+]?\d+(?:[.,]\d+)?/);
  if (!numberMatch) return null;
  const expected = parseFloat((numberMatch[0] ?? "").replace(",", "."));
  if (!Number.isFinite(expected)) return null;
  const tolerance = Math.max(0.01, Math.abs(expected * 0.02));
  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  return { type: "range", value: [round3(expected - tolerance), round3(expected + tolerance)] };
}

export function buildGuidance(
  text: string,
  type: QuestionType,
  skill: string,
  documents: unknown[],
): TrainingQuestion["guidance"] {
  const hasTable = (documents as Array<Record<string, unknown>>).some((d) => d.type === "table");
  const hasGraph = (documents as Array<Record<string, unknown>>).some((d) => d.type === "graph");

  if (hasTable) {
    return {
      hints: [
        { level: 1, text: "Regarde le tableau et repère la bonne ligne." },
        { level: 2, text: "Identifie la colonne correspondant à la question." },
        { level: 3, text: "Lis la valeur à l'intersection ligne/colonne." },
      ],
      correct_feedback: "Bonne lecture du tableau.",
      almost_feedback: "Tu es proche : vérifie la ligne ou la colonne utilisée.",
      incorrect_feedback: "Reviens au tableau et localise les données demandées.",
    };
  }

  if (hasGraph) {
    return {
      hints: [
        { level: 1, text: "Observe le graphique et repère les axes." },
        { level: 2, text: "Identifie la valeur demandée sur l'axe correct." },
        { level: 3, text: "Lis la valeur avec l'unité indiquée." },
      ],
      correct_feedback: "Bonne lecture du graphique.",
      almost_feedback: "Tu es proche : vérifie les axes et l'unité.",
      incorrect_feedback: "Reviens au graphique et repère les graduations.",
    };
  }

  if (skill === "statistics") {
    return {
      hints: [
        { level: 1, text: "Identifie toutes les valeurs de la série." },
        { level: 2, text: "Applique la formule adaptée (moyenne, étendue, médiane…)." },
        { level: 3, text: "Vérifie ton calcul et l'unité du résultat." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie le calcul ou les valeurs utilisées.",
      incorrect_feedback: "Reprends la définition de la mesure demandée et refais le calcul.",
    };
  }

  if (type === "numeric") {
    return {
      hints: [
        { level: 1, text: "Repère les données utiles dans l'énoncé." },
        { level: 2, text: "Fais le calcul étape par étape." },
        { level: 3, text: "Vérifie ton résultat et n'oublie pas l'unité." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie chaque étape du calcul.",
      incorrect_feedback: "Reprends le calcul depuis le début en utilisant les données de l'énoncé.",
    };
  }

  // Generic fallback — delegates to topic-aware logic
  return genericGuidanceForText(text);
}

export function enrichQuestion(
  question: NormalizedQuestion,
  context: string,
  documents: unknown[],
): EnrichedQuestion {
  const type = detectQuestionType(question.text);
  const skill = detectSkill(question.text, context);
  const validation = buildValidationFromContext(question.text, context);
  const guidance = buildGuidance(question.text, type, skill, documents);
  return { ...question, type, skill, validation, guidance };
}

function cleanPrompt(value: string): string {
  let s = value;
  // Strip raw LaTeX display math delimiters \[...\]
  s = s.replace(/\\\[/g, " ").replace(/\\\]/g, " ");
  // Strip remaining LaTeX commands (e.g. \[1,46~;...\] in statistics question)
  s = s.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, " ");
  // Strip [Schéma — voir document original] placeholders from QCM question prompts
  // (the actual diagram image is in the documents array, not the prompt)
  s = s.replace(/\[Schéma[^\]]*\]/g, "").replace(/\[Schéma\]/g, "");
  // Strip labelled expression choices (E_1 = ..., E_2 = ...) from the prompt text
  // when they are embedded after the question sentence — they appear as radio buttons instead
  s = s.replace(/\n[A-Z][_\d]*\s*=[\s\S]*/g, "");
  return s.replace(/\s+/g, " ").trim();
}

function cleanNullable(value: string | null | undefined): string | null {
  const cleaned = cleanPrompt(value ?? "");
  return cleaned.length > 0 ? cleaned : null;
}

function deterministicUuid(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const hash = new Uint8Array(new ArrayBuffer(16));
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const byte of bytes) {
    h1 ^= byte;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= byte + ((h1 >>> 24) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  for (let i = 0; i < 16; i += 1) {
    const value = i < 8 ? h1 : h2;
    hash[i] = (value >>> ((i % 4) * 8)) & 0xff;
    h1 = Math.imul(h1 ^ hash[i], 0x01000193);
    h2 = Math.imul(h2 ^ hash[i], 0x85ebca6b);
  }
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    bundle: "exam-import/bundles/dnb-amiens-2021-maths.json",
    out: "exam-import/bundles/training-items-dnb-2021-maths.json",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--bundle" && value !== undefined) {
      options.bundle = value;
      index += 1;
    } else if (arg === "--out" && value !== undefined) {
      options.out = value;
      index += 1;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete option: ${arg ?? ""}`);
    }
  }
  return options;
}

function printHelp(): void {
  console.log(`Usage: npm run generate:training-items -- [options]

Options:
  --bundle exam-import/bundles/dnb-amiens-2021-maths.json
  --out exam-import/bundles/training-items-dnb-2021-maths.json
`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isCliEntrypoint = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isCliEntrypoint) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
