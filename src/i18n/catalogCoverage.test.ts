import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { resources } from './resources';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : path.endsWith('.tsx') && !path.includes('.test.') ? [path] : [];
  });
}

describe('translation coverage', () => {
  it('resolves every literal translation key in both supported languages', () => {
    const missing: string[] = [];
    for (const file of filesIn(sourceRoot)) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'ui'].includes(node.expression.text)
            && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text;
          const namespace = node.expression.text === 'ui' ? 'interface' : 'common';
          for (const language of ['en', 'fr'] as const) {
            const catalog = resources[language][namespace] as Record<string, string>;
            if (!catalog[key] && !catalog[`${key}_one`] && !catalog[`${key}_other`]) {
              missing.push(`${relative(sourceRoot, file)}: ${language}/${namespace}/${key}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(missing).toEqual([]);
  });

  it('keeps translated display text out of equality checks on application state', () => {
    const violations: string[] = [];
    for (const file of filesIn(sourceRoot)) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) {
          for (const operand of [node.left, node.right]) {
            if (ts.isCallExpression(operand) && operand.expression.getText(source) === 'ui') {
              violations.push(`${relative(sourceRoot, file)}: ${node.getText(source)}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(violations).toEqual([]);
  });
});
