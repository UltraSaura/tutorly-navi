import { build, loadEnv } from 'vite';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const BETA_PROJECT = 'sibprjxhbxahouejygeu';
export const BETA_CALLBACK = 'stuwy-staging://auth/callback';

export function validateBetaClientKey(key) {
  // The existing client has a staging anon fallback when no override is set.
  if (!key) return;
  if (key.startsWith('sb_publishable_')) {
    throw new Error('For this beta use the staging anon JWT, whose project can be verified locally.');
  }
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); }
  catch { throw new Error('Invalid beta client key.'); }
  if (claims.role !== 'anon' || claims.ref !== BETA_PROJECT) {
    throw new Error('Beta requires an anon client key for the staging project.');
  }
}

async function main() {
  const env = { ...loadEnv('beta', process.cwd(), 'VITE_'), ...process.env };
  validateBetaClientKey(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  process.env.VITE_SUPABASE_URL = `https://${BETA_PROJECT}.supabase.co`;
  process.env.VITE_AUTH_REDIRECT_URL = BETA_CALLBACK;
  process.env.VITE_AUTH_RESET_REDIRECT_URL = BETA_CALLBACK;
  // Production-optimized assets, NOT Vite development mode.
  await build({ mode: 'beta' });
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim());
  await writeFile('dist/beta-build.json', JSON.stringify({ sha, dirty, project: BETA_PROJECT, callback: BETA_CALLBACK }, null, 2));
  console.log(`Private beta web assets ready at commit ${sha}; native signing/device verification remain separate.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Private beta build failed. Check staging key configuration and build errors.'); process.exitCode = 1; });
}
