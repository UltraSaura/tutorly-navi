import { describe, expect, it } from 'vitest';
import { describeModelMetadataError, resolveModelMetadata, isAbortedModelRead } from './useAiModelManagementSecure';

describe('optional AI model metadata', () => {
  it('distinguishes cancelled reads from permission, timeout and network failures', () => {
    expect(isAbortedModelRead({ name: 'AbortError', message: 'The operation was aborted.' })).toBe(true);
    expect(isAbortedModelRead({ message: 'AbortError: signal is aborted without reason', code: 20 })).toBe(true);
    for (const error of [null, {}, { code: 20, message: 'permission denied' }, { name: 'TimeoutError', message: 'request timed out' }, { message: 'Failed to fetch' }, { code: '42501', message: 'permission denied' }]) {
      expect(isAbortedModelRead(error)).toBe(false);
    }
  });
  it('accepts a successful model fetch', () => {
    const result = resolveModelMetadata([{ id: 'deepseek', name: 'DeepSeek' }], null);
    expect(result.models).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('treats an empty model result as a valid empty state', () => {
    expect(resolveModelMetadata([], null)).toEqual({ models: [] });
  });

  it('keeps query failures structured without stringifying objects', () => {
    const result = resolveModelMetadata(null, { code: '42501', message: 'permission denied', status: 403 });
    expect(result.models).toEqual([]);
    expect(result.error).toEqual({ code: '42501', message: 'permission denied', status: 403 });
    expect(JSON.stringify(result)).not.toContain('[object Object]');
  });

  it('handles RLS and malformed errors as non-blocking metadata failures', () => {
    expect(describeModelMetadataError({ code: '42501', message: 'new row violates row-level security policy' }).code).toBe('42501');
    expect(describeModelMetadataError({}).message).toBe('AI model metadata is unavailable.');
  });
});
