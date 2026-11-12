import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { ESLint } from 'eslint';
import { collectDiagnostics, compareBaseline } from './lint-baseline.mjs';

const root = process.cwd();
const baseline = JSON.parse(readFileSync('config/lint-baseline.json', 'utf8'));
if (baseline.version !== 1 || !baseline.entries) throw new Error('Unsupported lint baseline');

const eslint = new ESLint();
const results = await eslint.lintFiles(['.']);
const diagnostics = collectDiagnostics(results, root, (file) => readFileSync(file, 'utf8'));
const { introduced } = compareBaseline(diagnostics, baseline);
const errors = diagnostics.filter(({ message }) => message.severity === 2).length;
const warnings = diagnostics.length - errors;
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/eslint.json', JSON.stringify(results, null, 2));
await writeFile('artifacts/lint-summary.json', JSON.stringify({ errors, warnings, introduced }, null, 2));
console.log(`Full repository lint: ${errors} errors, ${warnings} warnings (see artifacts/eslint.json).`);
console.log(`New or changed violations: ${introduced.length}. Legacy debt remains explicitly baselined.`);
for (const { file, message } of introduced) {
  console.error(`${file}:${message.line}:${message.column} ${message.ruleId ?? 'fatal'} ${message.message}`);
}
if (introduced.length) process.exitCode = 1;
