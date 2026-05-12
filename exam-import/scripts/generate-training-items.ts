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
  return questions.map((question) => {
    const qcmChoices = question.choices ?? detectQcmChoices(question.text);
    const itemType = qcmChoices ? "multiple_choice" : inferItemType(question.text, question.answer_type);
    return {
      id: deterministicUuid(`training_item:${exercise.id}:${question.id}`),
      source_exercise_id: sourceExerciseUuid,
      paper_id: paperUuid,
      exam: exercise.exam,
      subject_slug: subjectSlugForDiscipline(exercise.discipline),
      level,
      skill_tags: inferSkillTags(question.text),
      curriculum_objective_ids: null,
      item_type: itemType,
      prompt: cleanPrompt(question.text),
      context: cleanNullable(exercise.parsed_content?.context),
      documents: sanitizeDocumentsForTraining(exercise.parsed_content?.documents ?? []),
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

function genericGuidanceForText(text: string): TrainingQuestion["guidance"] {
  const normalized = text.toLowerCase();
  if (/étendue|maximum|minimum/.test(normalized)) {
    return {
      hints: [
        { level: 1, text: "Repère d'abord les valeurs utiles." },
        { level: 2, text: "Compare les valeurs extrêmes." },
        { level: 3, text: "Écris le calcul avant de conclure." },
      ],
      correct_feedback: "Bonne méthode.",
      almost_feedback: "Tu es proche : vérifie les valeurs utilisées.",
      incorrect_feedback: "Reviens aux données de l'énoncé et repère les valeurs utiles.",
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

function sanitizeDocumentsForTraining(documents: unknown[]): unknown[] {
  return documents.map((document) => {
    if (!isRecord(document)) return document;
    return document;
  });
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
