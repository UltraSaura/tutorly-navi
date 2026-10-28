import { STAGING_PROJECT_REF, STAGING_URL, assertSafeProjectUrl, listStagingTopics, safeDiagnostics } from './generate-staging-draft.ts';

export async function main(env = process.env): Promise<void> {
  try {
    const url = env.STAGING_SUPABASE_URL || STAGING_URL;
    assertSafeProjectUrl(url);
    if (!env.STAGING_SUPABASE_ANON_KEY || !env.STAGING_ADMIN_EMAIL || !env.STAGING_ADMIN_PASSWORD) {
      throw new Error('staging_credentials_required');
    }
    const result = await listStagingTopics(url, env.STAGING_SUPABASE_ANON_KEY, env.STAGING_ADMIN_EMAIL, env.STAGING_ADMIN_PASSWORD);
    console.log(safeDiagnostics({ project: STAGING_PROJECT_REF, search: ['géométrie', 'geometrie', 'géométrie plane', 'geometry'], ...result }));
    if (result.ok !== true) process.exitCode = 1;
  } catch (error) {
    console.error(safeDiagnostics({ ok: false, code: error instanceof Error ? error.message : 'staging_topic_list_failed', matches: [], databaseWrite: false, providerCalls: 0 }));
    process.exitCode = 1;
  }
}

if ((process.argv[1] || '').endsWith('/list-staging-topics.ts')) void main();
