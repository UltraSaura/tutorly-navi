export const STAGING_PROMPT_VERSION = 'staging-v21-prerequisite-contract-v4-visual-first';
export const STAGING_PROMPT_V22_CANDIDATE = 'staging-v22-curriculum-quality-rc2-level-language';

export const STAGING_PROMPT_VERSIONS = [STAGING_PROMPT_VERSION, STAGING_PROMPT_V22_CANDIDATE] as const;
export type StagingPromptVersion = typeof STAGING_PROMPT_VERSIONS[number];

export function isStagingPromptVersion(value: unknown): value is StagingPromptVersion {
  return STAGING_PROMPT_VERSIONS.some((version) => version === value);
}

export const STAGING_PROMPT_PROJECT_URL = 'https://sibprjxhbxahouejygeu.supabase.co';

export function isStagingPromptProject(url: unknown): boolean {
  return url === STAGING_PROMPT_PROJECT_URL || url === `${STAGING_PROMPT_PROJECT_URL}/`;
}
