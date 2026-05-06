import { supabase } from "@/integrations/supabase/client";
import type {
  CurriculumSkillMatch,
  ExtractLearningContextInput,
  LearningResourceRecommendation,
  RecommendedLearningResourcesInput,
} from "@/types/smart-learning";
import { detectOperationType, type OperationType } from "@/utils/operationTypeDetector";

type TopicRow = {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
  curriculum_country_code: string | null;
  curriculum_level_code: string | null;
  curriculum_subject_id: string | null;
  curriculum_domain_id: string | null;
  curriculum_subdomain_id: string | null;
};

type ObjectiveRow = {
  id: string;
  text: string;
  level: string;
  domain: string | null;
  subdomain: string;
  subject_id: string | null;
  domain_id: string | null;
  subdomain_id: string | null;
  skill_id: string | null;
  keywords: string[] | null;
};

const MIN_DETERMINISTIC_CONFIDENCE = 0.55;
const MIN_RESOURCE_MATCH_SCORE = 0.4;
const GENERIC_KEYWORDS = new Set([
  "math",
  "mathematics",
  "exercice",
  "exercise",
  "problem",
  "question",
  "numbers",
  "number",
  "nombres",
  "nombre",
  "calcul",
  "calculate",
  "solve",
  "answer",
  "reponse",
  "réponse",
]);

const MATH_TOPIC_GROUPS = [
  ["addition", "add", "plus", "sum", "somme", "additionner", "additionne"],
  ["subtraction", "subtract", "minus", "difference", "soustraction", "soustraire", "retirer", "moins"],
  ["fraction", "fractions", "denominator", "numerator", "denominateur", "numérateur"],
  ["multiplication", "multiply", "times", "product", "multiplication", "multiplier"],
  ["division", "divide", "quotient", "division", "diviser"],
  ["decimal", "decimals", "decimal", "decimaux", "décimaux"],
  ["angle", "angles"],
  ["geometry", "geometrie", "géométrie", "shape", "shapes"],
  ["perimeter", "perimetre", "périmètre"],
  ["area", "aire", "surface"],
];

const ARITHMETIC_OPERATION_COPY: Record<Exclude<OperationType, "unknown">, {
  domain: string;
  subdomain: string;
  topic: string;
  skillTag: string;
  keywords: string[];
  label: string;
}> = {
  addition: {
    domain: "Numbers and operations",
    subdomain: "Addition",
    topic: "Addition",
    skillTag: "math:addition",
    keywords: ["addition", "add", "plus", "sum", "somme", "additionner", "additionne"],
    label: "Addition",
  },
  subtraction: {
    domain: "Numbers and operations",
    subdomain: "Subtraction",
    topic: "Subtraction",
    skillTag: "math:subtraction",
    keywords: ["subtraction", "subtract", "minus", "difference", "soustraction", "soustraire", "moins"],
    label: "Subtraction",
  },
  multiplication: {
    domain: "Numbers and operations",
    subdomain: "Multiplication",
    topic: "Multiplication",
    skillTag: "math:multiplication",
    keywords: ["multiplication", "multiply", "times", "product", "multiplier"],
    label: "Multiplication",
  },
  division: {
    domain: "Numbers and operations",
    subdomain: "Division",
    topic: "Division",
    skillTag: "math:division",
    keywords: ["division", "divide", "quotient", "diviser"],
    label: "Division",
  },
};

const normalize = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const wordsFrom = (value: string) =>
  unique(normalize(value).split(" ").filter((word) => word.length >= 3));

const meaningfulTermsFrom = (values: Array<string | null | undefined>) =>
  unique(values.flatMap((value) => wordsFrom(value || "")))
    .filter((word) => !GENERIC_KEYWORDS.has(word));

const compactSkillTag = (...parts: Array<string | null | undefined>) =>
  unique(parts.map((part) => normalize(part).replace(/\s+/g, "-"))).join(":") || "learning-skill";

const promptLinesFromLearningText = (text?: string) =>
  (text || "")
    .split("\n")
    .map((line) => line.match(/^\s*Prompt:\s*(.+)$/i)?.[1]?.trim())
    .filter((line): line is string => !!line);

const hasFractionSignal = (value: string) =>
  /\b(?:fraction|fractions|denominator|numerator|denominateur|numerateur|num[ée]rateur)\b/i.test(value) ||
  /\d+\s*\/\s*\d+/.test(value) ||
  /\\frac\s*\{/.test(value);

const detectExplicitArithmeticOperation = (value: string): OperationType => {
  if (/\+/.test(value)) return "addition";
  if (/[−-]/.test(value)) return "subtraction";
  if (/[×*]/.test(value)) return "multiplication";
  if (/[÷]/.test(value)) return "division";
  return detectOperationType(value).type;
};

function deterministicArithmeticMatch(input: ExtractLearningContextInput): CurriculumSkillMatch[] {
  if (normalize(input.subject || "math") !== "math") return [];

  const candidates = [
    ...promptLinesFromLearningText(input.text),
    input.title || "",
    input.description || "",
    input.text || "",
  ].map((value) => value.trim()).filter(Boolean);

  for (const candidate of candidates) {
    if (hasFractionSignal(candidate)) continue;
    const operationType = detectExplicitArithmeticOperation(candidate);
    if (operationType === "unknown") continue;

    const copy = ARITHMETIC_OPERATION_COPY[operationType];
    return [{
      subject: input.subject || "math",
      gradeLevel: input.gradeLevel,
      country: input.country,
      curriculum: input.curriculum,
      domain: copy.domain,
      subdomain: copy.subdomain,
      topic: copy.topic,
      skillTag: copy.skillTag,
      keywords: copy.keywords,
      confidence: 0.98,
      studentFriendlyLabel: copy.label,
      source: input.source,
      sourceId: input.sourceId,
    }];
  }

  return [];
}

export function parseAiSkillExtraction(content: string): {
  primary: {
    subject: string;
    domain: string;
    subdomain: string;
    topic: string;
    skillTag: string;
    keywords: string[];
    confidence: number;
    studentFriendlyLabel: string;
    reason?: string;
  };
  secondary: Array<{
    topic: string;
    skillTag: string;
    keywords: string[];
    confidence: number;
    studentFriendlyLabel: string;
  }>;
} | null {
  try {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fence?.[1] || content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    const parsed = JSON.parse(raw);
    if (!parsed?.primary || typeof parsed.primary !== "object") return null;
    if (!Array.isArray(parsed.primary.keywords)) return null;

    return {
      primary: {
        subject: String(parsed.primary.subject || "math"),
        domain: String(parsed.primary.domain || ""),
        subdomain: String(parsed.primary.subdomain || ""),
        topic: String(parsed.primary.topic || ""),
        skillTag: String(parsed.primary.skillTag || parsed.primary.topic || "learning-skill"),
        keywords: unique(parsed.primary.keywords.map(String)).slice(0, 8),
        confidence: Math.max(0, Math.min(1, Number(parsed.primary.confidence) || 0)),
        studentFriendlyLabel: String(parsed.primary.studentFriendlyLabel || parsed.primary.topic || "this topic"),
        reason: parsed.primary.reason ? String(parsed.primary.reason) : undefined,
      },
      secondary: Array.isArray(parsed.secondary)
        ? parsed.secondary.slice(0, 3).map((item: any) => ({
            topic: String(item.topic || ""),
            skillTag: String(item.skillTag || item.topic || "learning-skill"),
            keywords: Array.isArray(item.keywords) ? unique(item.keywords.map(String)).slice(0, 8) : [],
            confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
            studentFriendlyLabel: String(item.studentFriendlyLabel || item.topic || "this topic"),
          }))
        : [],
    };
  } catch {
    return null;
  }
}

function scoreKeywordMatch(haystackText: string, candidateKeywords: string[]) {
  const haystack = normalize(haystackText);
  const tokens = wordsFrom(haystack).filter((word) => !GENERIC_KEYWORDS.has(word));
  const keywords = unique(candidateKeywords.flatMap((keyword) => [keyword, ...wordsFrom(keyword)]))
    .map(normalize)
    .filter((keyword) => keyword.length >= 3 && !GENERIC_KEYWORDS.has(keyword));
  if (keywords.length === 0 || !haystack) return { score: 0, matches: [] as string[] };

  const matches = keywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);
    return normalizedKeyword.length >= 3 && (haystack.includes(normalizedKeyword) || tokens.includes(normalizedKeyword));
  });

  return {
    score: matches.length / Math.max(4, Math.min(keywords.length, 12)),
    matches: unique(matches).slice(0, 8),
  };
}

function mathTopicGroupsFor(values: Array<string | null | undefined>) {
  const terms = meaningfulTermsFrom(values);
  return MATH_TOPIC_GROUPS
    .filter((group) => group.some((keyword) => terms.includes(normalize(keyword))))
    .map((group) => normalize(group[0]));
}

function hasMathTopicMismatch(match: CurriculumSkillMatch, resourceValues: string[]) {
  if (normalize(match.subject) !== "math") return false;

  const matchGroups = mathTopicGroupsFor([
    match.topic,
    match.skillTag,
    match.domain,
    match.subdomain,
    match.studentFriendlyLabel,
    ...match.keywords,
  ]);
  const resourceGroups = mathTopicGroupsFor(resourceValues);

  if (matchGroups.length === 0 || resourceGroups.length === 0) return false;
  return !matchGroups.some((group) => resourceGroups.includes(group));
}

function evaluateStrongRelevance(params: {
  match: CurriculumSkillMatch;
  topicId?: string | null;
  objectiveId?: string | null;
  skillTags: string[];
  keywords: string[];
}) {
  const normalizedSkillTag = normalize(params.match.skillTag);
  const normalizedResourceSkillTags = params.skillTags.map(normalize);
  const exactTopicMatch = Boolean(params.match.topicId && params.topicId === params.match.topicId);
  const exactObjectiveMatch = Boolean(params.match.objectiveId && params.objectiveId === params.match.objectiveId);
  const exactSkillTagMatch = normalizedResourceSkillTags.includes(normalizedSkillTag);
  const resourceValues = [...params.keywords, ...params.skillTags];
  const keywordResult = scoreKeywordMatch(resourceValues.join(" "), params.match.keywords);
  const meaningfulKeywordOverlap = keywordResult.matches.filter((match) => !GENERIC_KEYWORDS.has(normalize(match)));
  const domainSubdomainTerms = meaningfulTermsFrom([params.match.domain, params.match.subdomain]);
  const resourceTerms = meaningfulTermsFrom(resourceValues);
  const domainSubdomainHit = domainSubdomainTerms.some((term) => resourceTerms.includes(term));
  const mathTopicMismatch = hasMathTopicMismatch(params.match, resourceValues);
  const strongDomainSubdomainMatch = domainSubdomainHit && meaningfulKeywordOverlap.length > 0;
  const hasStrongRelevance = exactTopicMatch ||
    exactObjectiveMatch ||
    (!mathTopicMismatch && (
    exactSkillTagMatch ||
    meaningfulKeywordOverlap.length > 0 ||
    strongDomainSubdomainMatch
  ));

  return {
    exactTopicMatch,
    exactObjectiveMatch,
    exactSkillTagMatch,
    keywordResult: {
      ...keywordResult,
      matches: meaningfulKeywordOverlap,
    },
    domainSubdomainHit,
    mathTopicMismatch,
    hasStrongRelevance,
  };
}

function matchFromTopic(
  topic: TopicRow,
  input: ExtractLearningContextInput,
  confidence = 0.95,
  objective?: ObjectiveRow | null,
): CurriculumSkillMatch {
  const keywords = unique([
    ...(topic.keywords || []),
    ...(objective?.keywords || []),
    topic.name,
    objective?.text || "",
  ]).slice(0, 10);

  return {
    subject: input.subject || topic.curriculum_subject_id || objective?.subject_id || "math",
    gradeLevel: input.gradeLevel || topic.curriculum_level_code || objective?.level || undefined,
    country: input.country || topic.curriculum_country_code || undefined,
    curriculum: input.curriculum,
    domain: objective?.domain || topic.curriculum_domain_id || undefined,
    subdomain: objective?.subdomain || topic.curriculum_subdomain_id || undefined,
    topic: topic.name,
    topicId: topic.id,
    objectiveId: objective?.id,
    skillTag: objective?.skill_id || compactSkillTag(topic.curriculum_subject_id, topic.name, objective?.text),
    keywords,
    confidence,
    studentFriendlyLabel: topic.name,
    source: input.source,
    sourceId: input.sourceId,
  };
}

async function deterministicMatch(input: ExtractLearningContextInput): Promise<CurriculumSkillMatch[]> {
  const text = [input.title, input.description, input.text].filter(Boolean).join("\n");
  if (!text.trim()) return [];

  const { data: topics } = await supabase
    .from("topics")
    .select("id,name,description,keywords,curriculum_country_code,curriculum_level_code,curriculum_subject_id,curriculum_domain_id,curriculum_subdomain_id")
    .eq("is_active", true)
    .limit(250);

  const { data: objectives } = await supabase
    .from("objectives")
    .select("id,text,level,domain,subdomain,subject_id,domain_id,subdomain_id,skill_id,keywords")
    .limit(500);

  const normalizedText = normalize(text);
  const topicScores = ((topics || []) as TopicRow[])
    .map((topic) => {
      const keywordResult = scoreKeywordMatch(text, [topic.name, topic.description || "", ...(topic.keywords || [])]);
      return { topic, score: Math.min(0.92, keywordResult.score + (normalizedText.includes(normalize(topic.name)) ? 0.35 : 0)) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const objectiveScores = ((objectives || []) as ObjectiveRow[])
    .map((objective) => {
      const keywordResult = scoreKeywordMatch(text, [objective.text, objective.subdomain, objective.domain || "", ...(objective.keywords || [])]);
      return { objective, score: Math.min(0.9, keywordResult.score + (normalizedText.includes(normalize(objective.subdomain)) ? 0.25 : 0)) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestTopic = topicScores[0];
  const bestObjective = objectiveScores[0];
  if (!bestTopic && !bestObjective) return [];

  const topicForObjective = bestObjective
    ? ((topics || []) as TopicRow[]).find((topic) =>
        topic.curriculum_subdomain_id === bestObjective.objective.subdomain_id ||
        normalize(topic.name).includes(normalize(bestObjective.objective.subdomain))
      )
    : null;

  const topic = bestTopic?.topic || topicForObjective;
  if (topic) {
    return [matchFromTopic(topic, input, Math.max(bestTopic?.score || 0, bestObjective?.score || 0), bestObjective?.objective)];
  }

  const objective = bestObjective!.objective;
  return [{
    subject: input.subject || objective.subject_id || "math",
    gradeLevel: input.gradeLevel || objective.level,
    country: input.country,
    curriculum: input.curriculum,
    domain: objective.domain || undefined,
    subdomain: objective.subdomain,
    objectiveId: objective.id,
    skillTag: objective.skill_id || compactSkillTag(objective.subject_id, objective.subdomain, objective.text),
    keywords: unique([...(objective.keywords || []), objective.subdomain, objective.text]).slice(0, 10),
    confidence: bestObjective!.score,
    studentFriendlyLabel: objective.subdomain || objective.text,
    source: input.source,
    sourceId: input.sourceId,
  }];
}

async function aiMatch(input: ExtractLearningContextInput): Promise<CurriculumSkillMatch[]> {
  const prompt = `Extract one curriculum skill from the student context. Return JSON only.
Input:
source: ${input.source}
subject: ${input.subject || "unknown"}
gradeLevel: ${input.gradeLevel || "unknown"}
country: ${input.country || "unknown"}
curriculum: ${input.curriculum || "unknown"}
title: ${input.title || ""}
description: ${input.description || ""}
text: ${input.text || ""}

Output schema:
{"primary":{"subject":"string","domain":"string","subdomain":"string","topic":"string","skillTag":"string","keywords":["string"],"confidence":0.0,"studentFriendlyLabel":"string","reason":"string"},"secondary":[{"topic":"string","skillTag":"string","keywords":["string"],"confidence":0.0,"studentFriendlyLabel":"string"}]}
Rules: prefer one primary skill, at most 3 secondary skills, curriculum-aligned language, match grade level/country when possible, do not over-tag.`;

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      message: prompt,
      modelId: "gpt-5",
      language: input.responseLanguage === "fr" ? "fr" : "en",
    },
  });
  if (error || !data?.content) return [];

  const parsed = parseAiSkillExtraction(data.content);
  if (!parsed) return [];

  const primary: CurriculumSkillMatch = {
    subject: parsed.primary.subject || input.subject || "math",
    gradeLevel: input.gradeLevel,
    country: input.country,
    curriculum: input.curriculum,
    domain: parsed.primary.domain || undefined,
    subdomain: parsed.primary.subdomain || undefined,
    topic: parsed.primary.topic || undefined,
    skillTag: parsed.primary.skillTag,
    keywords: parsed.primary.keywords,
    confidence: parsed.primary.confidence,
    studentFriendlyLabel: parsed.primary.studentFriendlyLabel,
    source: input.source,
    sourceId: input.sourceId,
  };

  return [
    primary,
    ...parsed.secondary.map((secondary) => ({
      ...primary,
      topic: secondary.topic || primary.topic,
      topicId: undefined,
      objectiveId: undefined,
      skillTag: secondary.skillTag,
      keywords: secondary.keywords,
      confidence: secondary.confidence,
      studentFriendlyLabel: secondary.studentFriendlyLabel,
    })),
  ].filter((match) => match.confidence > 0).slice(0, 4);
}

export async function extractLearningContext(input: ExtractLearningContextInput): Promise<CurriculumSkillMatch[]> {
  try {
    const arithmetic = deterministicArithmeticMatch(input);
    if (arithmetic.length > 0) return arithmetic;

    const deterministic = await deterministicMatch(input);
    if (deterministic[0]?.confidence >= MIN_DETERMINISTIC_CONFIDENCE) {
      return deterministic.slice(0, 4);
    }
    const ai = await aiMatch(input);
    return (ai.length > 0 ? ai : deterministic).slice(0, 4);
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[smart-learning] extraction failed", error);
    return [];
  }
}

function scoreResource(params: {
  match: CurriculumSkillMatch;
  topicId?: string | null;
  objectiveId?: string | null;
  skillTags: string[];
  keywords: string[];
  gradeLevel?: string | null;
  language?: string | null;
  preferredGradeLevel?: string;
  preferredLanguage?: string;
  completed?: boolean;
}) {
  const reasons: string[] = [];
  let score = 0;
  const relevance = evaluateStrongRelevance(params);

  if (!relevance.hasStrongRelevance) {
    return {
      score: 0,
      reasons: [] as string[],
      hasStrongRelevance: false,
    };
  }

  if (relevance.exactTopicMatch) {
    score += 0.55;
    reasons.push(params.match.studentFriendlyLabel);
  }

  if (relevance.exactObjectiveMatch) {
    score += 0.55;
    reasons.push(params.match.studentFriendlyLabel);
  }

  if (relevance.exactSkillTagMatch) {
    score += 0.45;
    reasons.push(params.match.studentFriendlyLabel);
  }

  const keywordResult = relevance.keywordResult;
  if (keywordResult.matches.length > 0) {
    score += Math.min(0.3, keywordResult.score);
    reasons.push(...keywordResult.matches.slice(0, 2));
  }

  if (relevance.domainSubdomainHit && keywordResult.matches.length > 0) score += 0.12;
  if (params.preferredGradeLevel && params.gradeLevel && normalize(params.preferredGradeLevel) === normalize(params.gradeLevel)) score += 0.08;
  if (params.preferredLanguage && params.language) score += normalize(params.preferredLanguage) === normalize(params.language) ? 0.1 : -0.35;
  if (params.completed) score -= 0.25;

  return {
    score: Math.max(MIN_RESOURCE_MATCH_SCORE, Math.min(1, score)),
    reasons: unique(reasons).slice(0, 2),
    hasStrongRelevance: true,
  };
}

function bestRelevantResourceScore(params: {
  skillMatches: CurriculumSkillMatch[];
  topicId?: string | null;
  objectiveId?: string | null;
  skillTags: string[];
  keywords: string[];
  gradeLevel?: string | null;
  language?: string | null;
  preferredGradeLevel?: string;
  preferredLanguage?: string;
  completed?: boolean;
}) {
  return params.skillMatches.reduce(
    (current, match) => {
      const scored = scoreResource({
        match,
        topicId: params.topicId,
        objectiveId: params.objectiveId,
        skillTags: params.skillTags,
        keywords: params.keywords,
        gradeLevel: params.gradeLevel,
        language: params.language,
        preferredGradeLevel: params.preferredGradeLevel,
        preferredLanguage: params.preferredLanguage,
        completed: params.completed,
      });
      return scored.score > current.score ? scored : current;
    },
    { score: 0, reasons: [] as string[], hasStrongRelevance: false },
  );
}

export function rankLearningRecommendations(
  recommendations: LearningResourceRecommendation[],
  maxVideos = 2,
  maxQuizzes = 2,
  maxPractice = 1,
) {
  const sorted = [...recommendations]
    .filter((recommendation) => recommendation.type === "practice" || recommendation.matchScore >= MIN_RESOURCE_MATCH_SCORE)
    .sort((a, b) => b.matchScore - a.matchScore);

  const videos = sorted.filter((item) => item.type === "video").slice(0, maxVideos);
  const quizzes = sorted.filter((item) => item.type === "quiz").slice(0, maxQuizzes);
  const practice = sorted.filter((item) => item.type === "practice").slice(0, maxPractice);
  return [...videos, ...quizzes, ...practice].slice(0, 4);
}

export async function getRecommendedLearningResources({
  studentId,
  skillMatches,
  gradeLevel,
  language = "en",
  limit = 4,
}: RecommendedLearningResourcesInput): Promise<LearningResourceRecommendation[]> {
  if (skillMatches.length === 0) return [];

  try {
    const topicIds = unique(skillMatches.map((match) => match.topicId || ""));
    const keywordPool = unique(skillMatches.flatMap((match) => [match.skillTag, match.topic || "", ...match.keywords]));

    const { data: videos } = await supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration_minutes,tags,language,school_levels,topic_id,is_active")
      .eq("is_active", true)
      .limit(200);

    const { data: progress } = studentId
      ? await supabase
          .from("user_learning_progress")
          .select("video_id,progress_type")
          .eq("user_id", studentId)
          .eq("progress_type", "video_completed")
      : { data: [] as any[] };

    const completedVideoIds = new Set((progress || []).map((row: any) => row.video_id).filter(Boolean));
    const videoRecommendations = ((videos || []) as any[]).map((video) => {
      const best = bestRelevantResourceScore({
        skillMatches,
        topicId: video.topic_id,
        skillTags: video.tags || [],
        keywords: [video.title, video.description || "", ...(video.tags || [])],
        gradeLevel: Array.isArray(video.school_levels) ? video.school_levels[0] : undefined,
        language: video.language,
        preferredGradeLevel: gradeLevel,
        preferredLanguage: language,
        completed: completedVideoIds.has(video.id),
      });

      if (best.score < MIN_RESOURCE_MATCH_SCORE) return null;

      return {
        id: video.id,
        type: "video" as const,
        title: video.title,
        description: video.description || undefined,
        thumbnailUrl: video.thumbnail_url || undefined,
        durationSeconds: typeof video.duration_minutes === "number" ? video.duration_minutes * 60 : undefined,
        skillTags: video.tags || [],
        keywords: video.tags || [],
        gradeLevel: Array.isArray(video.school_levels) ? video.school_levels[0] : undefined,
        language: video.language || undefined,
        matchScore: best.score,
        matchReasons: best.reasons.length > 0 ? best.reasons : [skillMatches[0].studentFriendlyLabel],
        sourceId: video.topic_id,
      };
    }).filter(Boolean);

    const { data: assignments } = await (supabase as any)
      .from("quiz_bank_assignments")
      .select("bank_id,topic_id,video_ids,is_active,quiz_banks(id,title,description)")
      .eq("is_active", true)
      .limit(200);

    const quizRecommendations = ((assignments || []) as any[]).map((assignment) => {
      const sourceVideos = ((videos || []) as any[]).filter((video) =>
        Array.isArray(assignment.video_ids) && assignment.video_ids.includes(video.id)
      );
      const tags = unique([
        ...(topicIds.includes(assignment.topic_id || "") ? keywordPool : []),
        ...sourceVideos.flatMap((video) => video.tags || []),
        assignment.quiz_banks?.title || "",
        assignment.quiz_banks?.description || "",
      ]);

      const best = bestRelevantResourceScore({
        skillMatches,
        topicId: assignment.topic_id || sourceVideos[0]?.topic_id,
        objectiveId: assignment.objective_id,
        skillTags: tags,
        keywords: tags,
        preferredGradeLevel: gradeLevel,
        preferredLanguage: language,
        language,
      });

      if (best.score < MIN_RESOURCE_MATCH_SCORE) return null;

      return {
        id: assignment.bank_id,
        type: "quiz" as const,
        title: assignment.quiz_banks?.title || "Quiz",
        description: assignment.quiz_banks?.description || undefined,
        skillTags: tags,
        keywords: tags,
        language,
        difficulty: "medium" as const,
        matchScore: best.score,
        matchReasons: best.reasons.length > 0 ? best.reasons : [skillMatches[0].studentFriendlyLabel],
        sourceId: assignment.topic_id || sourceVideos[0]?.topic_id,
      };
    }).filter(Boolean);

    return rankLearningRecommendations(
      [...videoRecommendations, ...quizRecommendations],
      2,
      2,
      0,
    ).slice(0, limit);
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[smart-learning] recommendation failed", error);
    return [];
  }
}

export const __smartLearningResourcesTest = {
  bestRelevantResourceScore,
  deterministicArithmeticMatch,
  evaluateStrongRelevance,
  MIN_RESOURCE_MATCH_SCORE,
};
