import { createHash } from 'node:crypto';
import path from 'node:path';

/** Source-based identities survive line shifts, but not new code or duplicate debt. */
export function collectDiagnostics(results, root, readSource) {
  const diagnostics = [];
  for (const result of results) {
    const file = path.relative(root, result.filePath).split(path.sep).join('/');
    const lines = readSource(result.filePath).split(/\r?\n/);
    for (const message of result.messages) {
      const signature = JSON.stringify([
        message.ruleId, message.severity, message.message,
        lines[(message.line ?? 1) - 1]?.trim() ?? '',
      ]);
      diagnostics.push({
        file,
        fingerprint: createHash('sha256').update(signature).digest('hex'),
        message,
      });
    }
  }
  return diagnostics;
}

export function compareBaseline(diagnostics, baseline) {
  const used = {};
  const introduced = [];
  for (const diagnostic of diagnostics) {
    const { file, fingerprint, message } = diagnostic;
    used[file] ??= {};
    used[file][fingerprint] = (used[file][fingerprint] ?? 0) + 1;
    if (message.fatal || !message.ruleId || used[file][fingerprint] > (baseline.entries[file]?.[fingerprint] ?? 0)) {
      introduced.push(diagnostic);
    }
  }
  return { introduced, remaining: used };
}
