import { supabase } from "@/integrations/supabase/client";

type NestedRecord = Record<string, any> | null | undefined;

const first = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
};

const getSubjectSlug = (topic: NestedRecord) => {
  const category = first(topic?.category ?? topic?.learning_categories);
  const subject = first(category?.subject ?? category?.subjects);
  return typeof subject?.slug === "string" ? subject.slug : null;
};

export async function resolveVideoLearningRoute(videoId: string) {
  const fallbackRoute = `/learning/video/${encodeURIComponent(videoId)}`;

  try {
    const { data: video, error: videoError } = await (supabase as any)
      .from("videos")
      .select("topic_id")
      .eq("id", videoId)
      .maybeSingle();

    if (videoError || !video?.topic_id) return fallbackRoute;

    const { data: topic, error: topicError } = await (supabase as any)
      .from("topics")
      .select("slug, category:learning_categories!inner(subject:subjects!inner(slug))")
      .eq("id", video.topic_id)
      .maybeSingle();

    const subjectSlug = getSubjectSlug(topic);
    if (topicError || !topic?.slug || !subjectSlug) return fallbackRoute;

    const params = new URLSearchParams({ video: videoId, autoplay: "0" });
    return `/learning/${encodeURIComponent(subjectSlug)}/${encodeURIComponent(topic.slug)}?${params.toString()}`;
  } catch {
    return fallbackRoute;
  }
}
