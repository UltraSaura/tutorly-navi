import { supabase } from "@/integrations/supabase/client";

export const ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG = "adaptive_teaching_recommendations_enabled" as const;

export interface AppFeatureFlag {
  key: string;
  enabled: boolean;
  description?: string | null;
  metadata?: Record<string, unknown>;
  updated_at?: string;
}

type SupabaseFeatureFlagError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const DEFAULT_ADAPTIVE_TEACHING_FLAG: AppFeatureFlag = {
  key: ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG,
  enabled: false,
  description: "When enabled, analytics-derived teaching support recommendations may gently bias support formats. Off by default while data is collected.",
  metadata: {
    minimumRelevantEvents: 20,
    minimumAnsweredAfterSupport: 5,
    recommendedStyleShare: 0.7,
    mixedStyleShare: 0.3,
  },
};

function logFeatureFlagError(action: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.debug(`[FeatureFlags] ${action} failed`, error);
  }
}

function featureFlagUserMessage(error: unknown): string {
  const supabaseError = error as SupabaseFeatureFlagError;
  const message = supabaseError?.message || "";
  const combined = `${message} ${supabaseError?.details || ""} ${supabaseError?.hint || ""}`.toLowerCase();

  if (
    supabaseError?.code === "42P01" ||
    (combined.includes("app_feature_flags") && combined.includes("does not exist"))
  ) {
    return "Feature flag table is missing. Apply the latest Supabase migrations, then try again.";
  }

  if (
    supabaseError?.code === "42501" ||
    combined.includes("row-level security") ||
    combined.includes("permission denied") ||
    combined.includes("violates row-level security")
  ) {
    return "You do not have permission to update feature flags. Sign in as an admin and try again.";
  }

  if (supabaseError?.code === "PGRST204" || combined.includes("schema cache")) {
    return "Feature flag schema is out of date. Apply the latest Supabase migrations, then try again.";
  }

  return "Failed to update feature flag";
}

export async function getFeatureFlagEnabled(key: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any)
      .from("app_feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      logFeatureFlagError(`Load flag ${key}`, error);
      return false;
    }

    return Boolean(data?.enabled);
  } catch (error) {
    logFeatureFlagError(`Load flag ${key}`, error);
    return false;
  }
}

export async function listFeatureFlags(): Promise<AppFeatureFlag[]> {
  const { data, error } = await (supabase as any)
    .from("app_feature_flags")
    .select("key, enabled, description, metadata, updated_at")
    .order("key", { ascending: true });

  if (error) {
    logFeatureFlagError("List flags", error);
    const supabaseError = error as SupabaseFeatureFlagError;
    if (supabaseError?.code === "42P01") {
      return [DEFAULT_ADAPTIVE_TEACHING_FLAG];
    }
    throw error;
  }

  const flags = (data || []) as AppFeatureFlag[];
  if (!flags.some(flag => flag.key === ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG)) {
    return [...flags, DEFAULT_ADAPTIVE_TEACHING_FLAG];
  }
  return flags;
}

export async function updateFeatureFlagEnabled(key: string, enabled: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from("app_feature_flags")
    .upsert({
      key,
      enabled,
      description: key === ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG
        ? DEFAULT_ADAPTIVE_TEACHING_FLAG.description
        : null,
      metadata: key === ADAPTIVE_TEACHING_RECOMMENDATIONS_FLAG
        ? DEFAULT_ADAPTIVE_TEACHING_FLAG.metadata
        : {},
    }, { onConflict: "key" })
    .select("key, enabled")
    .single();

  if (error) {
    logFeatureFlagError(`Update flag ${key}`, error);
    throw new Error(featureFlagUserMessage(error));
  }
}
