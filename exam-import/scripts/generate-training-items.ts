import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { levelForExam } from "../../src/domain/exams.ts";
import type { ParsedCorrectionBundle, ParsedQuestionCorrection } from "../parsers/parse-corrections.ts";

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
type QuestionType = "mcq" | "numeric" | "text" | "expression";

type ValidationSpec = {
  type: "exact" | "range" | "regex";
  value: unknown;
} | null;

interface CliOptions {
  bundle: string;
  out: string;
  corrections?: string;
}

type CorrectionsMap = Map<string, ParsedQuestionCorrection>;

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
  skill: string;
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
  type: QuestionType;
  prompt: string;
  answer_type: AnswerType;
  choices: unknown[] | null;
  expected_answer: unknown | null;
  validation: ValidationSpec;
  guidance: {
    hints: Array<{ level: number; text: string }>;
    correct_feedback: string;
    almost_feedback: string;
    incorrect_feedback: string;
  };
}

interface EnrichedQuestion extends NormalizedQuestion {
  type: QuestionType;
  skill: string;
  validation: ValidationSpec;
  guidance: TrainingQuestion["guidance"];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const bundle = JSON.parse(await readFile(options.bundle, "utf8")) as ExamBundle;
  const papersById = new Map((bundle.papers ?? []).map((paper) => [paper.id, paper]));

  const correctionsMap: CorrectionsMap = new Map();
  if (options.corrections) {
    const raw = JSON.parse(await readFile(options.corrections, "utf8")) as ParsedCorrectionBundle;
    for (const c of raw.corrections ?? []) {
      correctionsMap.set(`${c.exercise_number}:${c.question_id}`, c);
    }
    console.log(`Loaded ${correctionsMap.size} corrections from ${options.corrections}`);
  }

  const items = (bundle.exercises ?? []).flatMap((exercise) =>
    generateItemsForExercise(exercise, papersById.get(exercise.paper_id), correctionsMap),
  );

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify({ training_items: items }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${options.out}`);
  console.log(`Training items: ${items.length}; published: ${items.filter((item) => item.status === "published").length}; draft: ${items.filter((item) => item.status === "draft").length}`);
}

function generateItemsForExercise(exercise: BundleExercise, paper: BundlePaper | undefined, correctionsMap: CorrectionsMap = new Map()): TrainingItem[] {
  if (isAmiens2021TemperatureExercise(exercise)) {
    return generateAmiens2021TemperatureItems(exercise, paper);
  }

  const structuredQuestions = (exercise.parsed_content?.questions ?? []).flatMap((question) => splitQuestionIntoTrainingQuestions(question));
  let questions: NormalizedQuestion[];
  if (structuredQuestions.length > 0) {
    questions = structuredQuestions;
  } else {
    const rawText = exercise.parsed_content?.context ?? "";
    const extracted = extractQuestions(rawText);
    if (extracted.length > 0) {
      questions = extracted;
    } else {
      console.warn(`⚠️ splitting failed for exercise ${exercise.exercise_number ?? exercise.id}`);
      questions = fallbackQuestions(exercise);
    }
  }
  if (questions.length === 0) return [];

  const sourceExerciseUuid = deterministicUuid(`exam_exercise:${exercise.id}`);
  const paperUuid = paper ? deterministicUuid(`exam_paper:${paper.pdf_hash || paper.id}`) : null;
  const level = resolveTrainingItemLevel(exercise, paper);
  const documents = sanitizeDocumentsForTraining(exercise.parsed_content?.documents ?? []);
  const exerciseContext = exercise.parsed_content?.context ?? "";

  return questions.map((question) => {
    const enriched = enrichQuestion(question, exerciseContext, documents);
    const qcmChoices = enriched.choices ?? detectQcmChoices(enriched.text);
    const itemType = qcmChoices ? "multiple_choice" : inferItemType(enriched.text, enriched.answer_type);
    const answerType = answerTypeForItemType(itemType);
    const correction = correctionsMap.get(`${exercise.exercise_number}:${question.id}`) ?? null;
    // Corrections take priority: override validation and guidance when available
    const expectedAnswer = correction ? { value: correction.correct_answer } : null;
    const guidance = correction ? guidanceFromCorrection(correction, enriched.text) : enriched.guidance;
    const validationOverride = correction ? buildValidation(itemType, expectedAnswer) : enriched.validation;
    return {
      id: deterministicUuid(`training_item:${exercise.id}:${question.id}`),
      source_exercise_id: sourceExerciseUuid,
      paper_id: paperUuid,
      exam: exercise.exam,
      subject_slug: subjectSlugForDiscipline(exercise.discipline),
      level,
      skill: enriched.skill,
      skill_tags: inferSkillTags(enriched.text),
      curriculum_objective_ids: null,
      item_type: itemType,
      prompt: cleanPrompt(enriched.text),
      context: cleanNullable(exerciseContext),
      documents,
      choices: qcmChoices,
      expected_answer: null,
      solution: null,
      hints: null,
      questions: [
        buildTrainingQuestion({
          id: question.id,
          label: question.label ?? `${question.id}.`,
          prompt: cleanPrompt(enriched.text),
          answerType,
          itemType,
          choices: qcmChoices,
          expectedAnswer,
          guidance,
          validationOverride,
          questionType: enriched.type,
        }),
      ],
      difficulty: inferDifficulty(itemType, enriched.text),
      exam_style: "dnb_official",
      source_year: exercise.session_year,
      source_label: sourceLabel(exercise, paper),
      metadata: {
        source_question_id: question.id,
        source_question_label: question.label ?? `${question.id}.`,
        confidence: exercise.parsing_confidence ?? "medium",
        can_generate_similar: true,
        source_pattern_summary: summarizePattern(enriched.text),
        transformation_notes: "Generated from parsed annale question; requires review before publication.",
      },
      status: "draft",
    };
  });
}

export function splitQuestionIntoTrainingQuestions(question: BundleQuestion): NormalizedQuestion[] {
  const text = cleanPrompt(question.text);
  const qcmChoices = detectQcmChoices(text);
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
    .split(/(?=\n?\s*\d+[\.\)]\s+)/)
    .map((q) => q.trim())
    .filter((q) => q.length > 20);
}

export function splitSubQuestions(text: string): string[] {
  const subs = text.split(/(?=\b[a-d][\.\)]\s+)/i);
  if (subs.length <= 1) return [text];
  return subs.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function cleanQuestionText(text: string): string {
  return text
    .replace(/^(\d+[\.\)]\s*)/, "")
    .replace(/^([a-d][\.\)]\s*)/i, "")
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

  const bulletMatches = [...normalized.matchAll(/(?:^|\s)[-•]\s*([^•-]+?)(?=\s[-•]\s|$)/g)]
    .map((match) => cleanPrompt(match[1]))
    .filter((choice) => choice.length > 0);
  if (bulletMatches.length >= 2 && /qcm|choisir|proposition|réponse/i.test(normalized)) return bulletMatches;

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
    skill: "statistics",
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
    skill: detectSkill(spec.prompt),
    questions: [
      buildTrainingQuestion({
        id: "q1",
        label: "1.",
        prompt: spec.prompt,
        answerType: answerTypeForItemType(spec.item_type),
        itemType: spec.item_type,
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
  itemType,
  choices,
  expectedAnswer,
  guidance,
  validationOverride,
  questionType,
}: {
  id: string;
  label: string;
  prompt: string;
  answerType: AnswerType;
  itemType: ItemType;
  choices: unknown[] | null;
  expectedAnswer: unknown | null;
  guidance: TrainingQuestion["guidance"];
  validationOverride?: ValidationSpec | null;
  questionType?: QuestionType;
}): TrainingQuestion {
  return {
    id,
    label,
    type: questionType ?? answerTypeToQuestionType(answerType),
    prompt,
    answer_type: answerType,
    choices,
    expected_answer: expectedAnswer,
    validation: validationOverride !== undefined ? validationOverride : buildValidation(itemType, expectedAnswer),
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

function guidanceFromCorrection(
  correction: ParsedQuestionCorrection,
  questionText: string,
): TrainingQuestion["guidance"] {
  const generic = genericGuidanceForText(questionText);
  const steps = correction.explanation_steps;

  // Use up to 2 steps as partial method hints (never the full answer)
  const hints: Array<{ level: number; text: string }> = [];
  if (steps[0]) hints.push({ level: 1, text: steps[0] });
  if (steps[1]) hints.push({ level: 2, text: steps[1] });
  // Third hint falls back to generic so we never reveal the answer
  if (generic.hints[2]) hints.push({ level: 3, text: generic.hints[2].text });

  return {
    hints: hints.length > 0 ? hints : generic.hints,
    correct_feedback: "Bonne réponse !",
    almost_feedback: "Tu es proche, vérifie ton calcul ou les données utilisées.",
    incorrect_feedback: "Relis l'énoncé et suis les étapes de méthode une par une.",
  };
}

function genericGuidanceForText(text: string): TrainingQuestion["guidance"] {
  const n = text.toLowerCase();

  if (/étendue|maximum|minimum/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Repère d'abord les valeurs utiles." },
        { level: 2, text: "Compare les valeurs extrêmes de la série." },
        { level: 3, text: "Calcule : valeur max − valeur min." },
      ],
      correct_feedback: "Bonne méthode.",
      almost_feedback: "Tu es proche : vérifie les valeurs utilisées.",
      incorrect_feedback: "Reviens aux données et cherche la plus grande et la plus petite valeur.",
    };
  }

  if (/moyenne/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Rappel : moyenne = somme des valeurs ÷ nombre de valeurs." },
        { level: 2, text: "Additionne toutes les valeurs de la série." },
        { level: 3, text: "Divise par le nombre de valeurs et arrondis si demandé." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie le diviseur ou l'arrondi.",
      incorrect_feedback: "Reprends le calcul : somme des valeurs puis division par leur nombre.",
    };
  }

  if (/probabilit/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Identifie l'événement et les cas favorables." },
        { level: 2, text: "Compte le nombre total de cas possibles." },
        { level: 3, text: "Probabilité = cas favorables ÷ cas totaux." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie le numérateur ou le dénominateur.",
      incorrect_feedback: "Reviens à la définition de la probabilité et recompte les cas.",
    };
  }

  if (/pourcentage|évolution|augmentation|diminution/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Identifie la valeur de départ et la valeur d'arrivée." },
        { level: 2, text: "Calcule l'écart puis divise par la valeur de départ." },
        { level: 3, text: "Multiplie par 100 pour obtenir le pourcentage." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie l'arrondi ou la valeur de référence.",
      incorrect_feedback: "Reprends la formule : (arrivée − départ) ÷ départ × 100.",
    };
  }

  if (/triangle|angle|périmètre|aire|figure|symétrie/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Identifie les données connues sur la figure." },
        { level: 2, text: "Rappelle-toi la propriété ou la formule adaptée." },
        { level: 3, text: "Pose le calcul proprement et vérifie l'unité." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie les données ou la formule utilisée.",
      incorrect_feedback: "Relis l'énoncé et identifie la propriété géométrique à appliquer.",
    };
  }

  if (/tableau|cellule|formule|tableur/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Repère les données dans le tableau." },
        { level: 2, text: "Identifie les cellules à utiliser." },
        { level: 3, text: "Écris la formule complète avec la plage de cellules." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : vérifie la plage de cellules ou la fonction.",
      incorrect_feedback: "Reviens au tableau et identifie les cellules contenant les données utiles.",
    };
  }

  if (/justifier|expliquer|montrer|vérifier|démontrer/.test(n)) {
    return {
      hints: [
        { level: 1, text: "Identifie ce que tu dois montrer ou justifier." },
        { level: 2, text: "Rappelle la propriété ou la définition à utiliser." },
        { level: 3, text: "Rédige ton raisonnement en une ou deux phrases claires." },
      ],
      correct_feedback: "Bonne réponse.",
      almost_feedback: "Tu es proche : précise ton raisonnement ou la propriété invoquée.",
      incorrect_feedback: "Reprends l'énoncé et identifie ce que tu dois démontrer.",
    };
  }

  return {
    hints: [
      { level: 1, text: "Repère les informations importantes dans l'énoncé." },
      { level: 2, text: "Choisis la méthode adaptée à la question." },
      { level: 3, text: "Rédige une réponse courte et vérifie les unités si nécessaire." },
    ],
    correct_feedback: "Bonne réponse.",
    almost_feedback: "Tu es proche.",
    incorrect_feedback: "Relis la question et repère les données utiles.",
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

function fallbackQuestions(exercise: BundleExercise): NormalizedQuestion[] {
  const context = cleanNullable(exercise.parsed_content?.context);
  if (!context || context.length < 20) return [];
  return [{
    id: "q_fallback",
    label: "1.",
    text: context.slice(0, 500),
    answer_type: undefined,
    choices: null,
  }];
}

function sanitizeDocumentsForTraining(documents: unknown[]): unknown[] {
  return documents.map((document) => {
    if (!isRecord(document)) return document;
    return { ...document, usage: document.usage ?? "shared" };
  });
}

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

// ---------------------------------------------------------------------------
// Enrichment pipeline
// ---------------------------------------------------------------------------

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

function answerTypeToQuestionType(answerType: AnswerType): QuestionType {
  if (answerType === "multiple_choice") return "mcq";
  if (answerType === "numeric") return "numeric";
  if (answerType === "math") return "expression";
  return "text";
}

function inferItemType(text: string, parsedAnswerType: string | undefined): ItemType {
  const normalized = text.toLowerCase();
  if (parsedAnswerType === "multiple_choice" || /\b(7\s*%|10\s*%|13\s*%)\b/.test(normalized)) return "multiple_choice";
  if (/\bjustifier|expliquer|montrer|vérifier|démontrer|preuve\b/i.test(normalized)) return "free_response";
  if (/\bcalculer|déterminer|combien|étendue|moyenne|pourcentage|probabilité|volume|aire|longueur|hauteur\b/i.test(normalized)) return "numeric";
  if (/\btableau|figure|document|graphique\b/i.test(normalized)) return "document_question";
  return "short_answer";
}

function inferSkillTags(text: string): string[] {
  const normalized = text.toLowerCase();
  const tags = new Set<string>();
  if (/tableau|cellule|formule|feuille de calcul/.test(normalized)) tags.add("tableur");
  if (/moyenne|étendue|serie|série|température/.test(normalized)) tags.add("statistiques");
  if (/pourcentage|augmentation|evolution|évolution/.test(normalized)) tags.add("pourcentage");
  if (/probabilit/.test(normalized)) tags.add("probabilites");
  if (/symétrie|rotation|homothétie|figure/.test(normalized)) tags.add("geometrie");
  if (/calculer|déterminer|vérifier/.test(normalized)) tags.add("calcul");
  return tags.size > 0 ? [...tags] : ["annale_dnb"];
}

function inferDifficulty(itemType: ItemType, text: string): Difficulty {
  if (itemType === "free_response" || text.length > 260) return "hard";
  if (itemType === "numeric" || itemType === "calculation" || itemType === "multiple_choice") return "medium";
  return "easy";
}

function summarizePattern(text: string): string {
  const compact = cleanPrompt(text);
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function sourceLabel(exercise: BundleExercise, paper: BundlePaper | undefined): string {
  const title = paper?.title ?? "Sujet officiel";
  const exerciseLabel = exercise.exercise_number !== null ? `Exercice ${exercise.exercise_number}` : "Exercice";
  return `${title} - ${exerciseLabel}`;
}

function subjectSlugForDiscipline(discipline: string): string {
  if (discipline === "mathematiques") return "mathematiques";
  return discipline.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
}

export function resolveTrainingItemLevel(exercise: Pick<BundleExercise, "exam">, paper?: Pick<BundlePaper, "level" | "exam">): string {
  return cleanNullable(paper?.level) ?? levelForExam(paper?.exam ?? exercise.exam) ?? "unknown";
}

function cleanPrompt(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
    } else if (arg === "--corrections" && value !== undefined) {
      options.corrections = value;
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
  --bundle      Path to exam bundle JSON (required)
  --out         Output path for training items JSON (required)
  --corrections Path to corrections bundle JSON (optional)
                When provided, validation specs and method hints are derived
                from official corrections instead of AI heuristics.

Examples:
  npm run generate:training-items -- \\
    --bundle exam-import/bundles/dnb-amiens-2021-maths.json \\
    --out exam-import/bundles/training-items-dnb-2021-maths.json

  npm run generate:training-items -- \\
    --bundle exam-import/bundles/dnb-amiens-2021-maths.json \\
    --corrections exam-import/bundles/corrections-dnb-amiens-2021.json \\
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
