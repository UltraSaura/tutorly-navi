import assert from 'node:assert/strict';
import test from 'node:test';
import { collectDiagnostics, compareBaseline } from './lint-baseline.mjs';

const root = '/project';
const message = { ruleId: 'example-rule', severity: 2, message: 'Legacy violation', line: 1, column: 1 };
const collect = (source, messages = [message], file = '/project/legacy.ts') => collectDiagnostics([{ filePath: file, messages }], root, () => source);
const legacy = collect('legacy();');
const baseline = { entries: { 'legacy.ts': { [legacy[0].fingerprint]: 1 } } };

test('permits unchanged debt after line shifts and whitespace changes', () => {
  assert.equal(compareBaseline(collect('\n  legacy();', [{ ...message, line: 2 }]), baseline).introduced.length, 0);
});

test('rejects a violation on changed source, even with the same rule and message', () => {
  assert.equal(compareBaseline(collect('newCode();'), baseline).introduced.length, 1);
});

test('rejects copied debt, new files and new warnings', () => {
  assert.equal(compareBaseline(collect('legacy();', [message, message]), baseline).introduced.length, 1);
  assert.equal(compareBaseline(collect('legacy();', [message], '/project/new.ts'), baseline).introduced.length, 1);
  assert.equal(compareBaseline(collect('legacy();', [{ ...message, severity: 1 }]), baseline).introduced.length, 1);
});

test('does not require removed violations to remain', () => {
  assert.deepEqual(compareBaseline([], baseline).introduced, []);
});

test('never permits fatal/parser errors, even if included in a baseline', () => {
  const fatal = collect('broken', [{ ...message, fatal: true, ruleId: null }]);
  const badBaseline = { entries: { 'legacy.ts': { [fatal[0].fingerprint]: 1 } } };
  assert.equal(compareBaseline(fatal, badBaseline).introduced.length, 1);
});
