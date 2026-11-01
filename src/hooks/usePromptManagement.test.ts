import { describe, expect, it } from 'vitest';
import { isPromptTemplateAbortError } from './usePromptManagement';

describe('isPromptTemplateAbortError', () => {
  it('recognizes browser abort errors', () => {
    expect(isPromptTemplateAbortError(new DOMException('Fetch is aborted', 'AbortError'))).toBe(true);
  });

  it('recognizes Supabase abort messages without a DOMException', () => {
    expect(isPromptTemplateAbortError(new Error('AbortError: Fetch is aborted'))).toBe(true);
  });

  it('keeps real prompt-template failures visible', () => {
    expect(isPromptTemplateAbortError(new Error('permission denied for table prompt_templates'))).toBe(false);
  });
});
