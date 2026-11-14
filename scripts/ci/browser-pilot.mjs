import { copyFile, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const evidence = path.join(root, 'artifacts/browser/pilot');
await mkdir(evidence, { recursive: true });
const temporary = await mkdtemp(path.join(root, 'artifacts/browser/pilot-work-'));
const hash = (text) => createHash('sha256').update(text).digest('hex');
const original = await readFile(path.join(root, 'src/pages/Index.tsx'), 'utf8');

async function run(args, logName) {
  const chunks = [];
  const child = spawn('npm', args, {
    cwd: temporary,
    env: { ...process.env, PW_PORT: '4280' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => chunks.push(chunk));
  child.stderr.on('data', (chunk) => chunks.push(chunk));
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const log = Buffer.concat(chunks).toString('utf8');
  await writeFile(path.join(evidence, logName), log);
  return { code, log };
}

try {
  // Copy the reviewable working tree, never git metadata, credentials or installed dependencies.
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    if (file.startsWith('.env')) continue;
    const target = path.join(temporary, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, file), target);
  }
  await symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const link = '<Link to="/auth">';
  if (original.split(link).length !== 2) throw new Error('Pilot requires exactly one existing home authentication link');
  const broken = original.replace(link, '<Link to="/qa-intentional-broken-auth">');
  await writeFile(path.join(temporary, 'src/pages/Index.tsx'), broken);
  const build = await run(['run', 'build'], 'defect-build.log');
  if (build.code !== 0) throw new Error('Defect build failed; this does not prove detection');
  const command = ['run', 'browser:test', '--', '--project=desktop', '--grep', 'startup and navigation'];
  const detected = await run(command, 'detected.log');
  if (detected.code === 0 || !detected.log.includes('qa-intentional-broken-auth')) throw new Error('Expected navigation defect was not specifically detected');
  await cp(path.join(temporary, 'artifacts/browser'), path.join(evidence, 'detection'), { recursive: true });

  // One targeted repair. No assertion, fixture or expected screenshot is changed.
  await writeFile(path.join(temporary, 'src/pages/Index.tsx'), original);
  const rebuilt = await run(['run', 'build'], 'repair-build.log');
  if (rebuilt.code !== 0) throw new Error('Repair build failed');
  const repaired = await run(command, 'repaired.log');
  if (repaired.code !== 0) throw new Error('Repair did not pass; stop after one attempted repair');
  if (await readFile(path.join(root, 'src/pages/Index.tsx'), 'utf8') !== original) throw new Error('Source working tree changed during pilot');
  const summary = {
    mode: 'temporary copied source; production build; synthetic backend reads',
    defect: 'Home authentication link points to /qa-intentional-broken-auth',
    defectExit: detected.code,
    repairExit: repaired.code,
    repairAttempts: 1,
    testsAndBaselinesUnchanged: true,
    sourceBeforeSha256: hash(original),
    restoredSourceSha256: hash(await readFile(path.join(temporary, 'src/pages/Index.tsx'), 'utf8')),
    workingSourceUnchanged: true,
  };
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
