import { supabase } from "@/integrations/supabase/client";
import type {
  CurriculumSkillMatch,
  ExtractLearningContextInput,
  LearningResourceRecommendation,
  RecommendedLearningResourcesInput,
} from "@/types/smart-learning";

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

const compactSkillTag = (...parts: Array<string | null | undefined>) =>
  unique(parts.map((part) => normalize(part).replace(/\s+/g, "-"))).join(":") || "learning-skill";

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
  const tokens = wordsFrom(haystack);
  const keywords = unique(candidateKeywords.flatMap((keyword) => [keyword, ...wordsFrom(keyword)]));
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

async function fetchTopicById(topicId: string) {
  const { data, error } = await supabase
    .from("topics")
    .select("id,name,description,keywords,curriculum_country_code,curriculum_level_code,curriculum_subject_id,curriculum_domain_id,curriculum_subdomain_id")
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw error;
  return data as TopicRow | null;
}

async function fetchObjectivesForTopic(topicId: string) {
  const { data, error } = await supabase
    .from("topic_objective_links")
    .select("objective_id, objectives(id,text,level,domain,subdomain,subject_id,domain_id,subdomain_id,skill_id,keywords)")
    .eq("topic_id", topicId)
    .order("order_index");
  if (error) throw error;
  return ((data || []) as any[]).map((row) => row.objectives).filter(Boolean) as ObjectiveRow[];
}

async function deterministicMatch(input: ExtractLearningContextInput): Promise<CurriculumSkillMatch[]> {
  const text = [input.title, input.description, input.text].filter(Boolean).join("\n");
  if (input.source === "course" && input.sourceId) {
    const topic = await fetchTopicById(input.sourceId);
    if (!topic) return [];
    const objectives = await fetchObjectivesForTopic(topic.id);
    return [matchFromTopic(topic, input, 0.98, objectives[0])];
  }

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

  const topicScores = ((topics || []) as TopicRow[])
    .map((topic) => {
      const keywordResult = scoreKeywordMatch(text, [topic.name, topic.description || "", ...(topic.keywords || [])]);
      return { topic, keywordResult, score: Math.min(0.92, keywordResult.score + (normalize(text).includes(normalize(topic.name)) ? 0.35 : 0)) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const objectiveScores = ((objectives || []) as ObjectiveRow[])
    .map((objective) => {
      const keywordResult = scoreKeywordMatch(text, [objective.text, objective.subdomain, objective.domain || "", ...(objective.keywords || [])]);
      return { objective, keywordResult, score: Math.min(0.9, keywordResult.score + (normalize(text).includes(normalize(objective.subdomain)) ? 0.25 : 0)) };
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
    const confidence = Math.max(bestTopic?.score || 0, bestObjective?.score || 0);
    return [matchFromTopic(topic, input, confidence, bestObjective?.objective)];
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
    const deterministic = await deterministicMatch(input);
    if (deterministic[0]?.confidence >= MIN_DETERMINISTIC_CONFIDENCE || input.source === "course") {
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

  if (params.match.topicId && params.topicId === params.match.topicId) {
    score += 0.55;
    reasons.push(params.match.studentFriendlyLabel);
  }

  const skillMatched = params.skillTags.some((tag) => normalize(tag) === normalize(params.match.skillTag));
  if (skillMatched) {
    score += 0.45;
    reasons.push(params.match.studentFriendlyLabel);
  }

  const keywordResult = scoreKeywordMatch(params.keywords.join(" "), params.match.keywords);
  if (keywordResult.matches.length > 0) {
    score += Math.min(0.3, keywordResult.score);
    reasons.push(...keywordResult.matches.slice(0, 2));
  }

  const domainHit = [params.match.domain, params.match.subdomain].some((part) =>
    part && params.keywords.some((keyword) => normalize(keyword).includes(normalize(part)))
  );
  if (domainHit) score += 0.12;

  if (params.preferredGradeLevel && params.gradeLevel && normalize(params.preferredGradeLevel) === normalize(params.gradeLevel)) {
    score += 0.08;
  }

  if (params.preferredLanguage && params.language) {
    score += normalize(params.preferredLanguage) === normalize(params.language) ? 0.1 : -0.35;
  }

  if (params.completed) score -= 0.25;

  return {
    score: Math.max(0, Math.min(1, score)),
    reasons: unique(reasons).slice(0, 2),
  };
}

export function rankLearningRecommendations(
  recommendations: LearningResourceRecommendation[],
  maxVideos = 2,
  maxQuizzes = 2,
  maxPractice = 1,
) {
  const sorted = [...recommendations]
    .filter((recommendation) => recommendation.matchScore > 0)
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
      const best = skillMatches.reduce(
        (current, match) => {
          const scored = scoreResource({
            match,
            topicId: video.topic_id,
            skillTags: video.tags || [],
            keywords: [video.title, video.description || "", ...(video.tags || [])],
            gradeLevel: Array.isArray(video.school_levels) ? video.school_levels[0] : undefined,
            language: video.language,
            preferredGradeLevel: gradeLevel,
            preferredLanguage: language,
            completed: completedVideoIds.has(video.id),
          });
          return scored.score > current.score ? scored : current;
        },
        { score: 0, reasons: [] as string[] },
      );

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
    });

    const { data: assignments } = await supabase
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

      const best = skillMatches.reduce(
        (current, match) => {
          const scored = scoreResource({
            match,
            topicId: assignment.topic_id || sourceVideos[0]?.topic_id,
            skillTags: tags,
            keywords: tags,
            preferredGradeLevel: gradeLevel,
            preferredLanguage: language,
            language,
          });
          return scored.score > current.score ? scored : current;
        },
        { score: 0, reasons: [] as string[] },
      );

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
    });

    const practiceRecommendation: LearningResourceRecommendation = {
      id: `practice-${skillMatches[0].skillTag}`,
      type: "practice",
      title: skillMatches[0].studentFriendlyLabel,
      skillTags: [skillMatches[0].skillTag],
      keywords: skillMatches[0].keywords,
      gradeLevel,
      language,
      difficulty: "easy",
      matchScore: videoRecommendations.length || quizRecommendations.length ? 0.1 : 0.5,
      matchReasons: [skillMatches[0].studentFriendlyLabel],
      sourceId: skillMatches[0].topicId,
    };

    return rankLearningRecommendations(
      [...videoRecommendations, ...quizRecommendations, practiceRecommendation],
      2,
      2,
      videoRecommendations.length || quizRecommendations.length ? 0 : 1,
    ).slice(0, limit);
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[smart-learning] recommendation failed", error);
    return [];
  }
}
