import { describe, expect, it } from 'vitest';
import { safeProviderContentDiagnostics } from './provider-diagnostics';

describe('safe provider diagnostics', () => {
  it('keeps only length and parse state, never provider content', () => {
    const diagnostics = safeProviderContentDiagnostics('{"secretLesson":"private"}', 'malformed');
    expect(diagnostics).toEqual({ contentLength: 26, parseState: 'malformed' });
    expect(JSON.stringify(diagnostics)).not.toContain('secretLesson');
  });

  it('reports empty content without inventing a response', () => {
    expect(safeProviderContentDiagnostics('', 'empty')).toEqual({ contentLength: 0, parseState: 'empty' });
  });
});
