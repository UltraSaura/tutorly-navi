import { describe, expect, it } from 'vitest';
import { describeModelMetadataError, resolveModelMetadata } from './useAiModelManagementSecure';

describe('optional AI model metadata', () => {
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
