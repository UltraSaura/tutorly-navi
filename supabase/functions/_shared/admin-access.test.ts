import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('admin permission enforcement contract', () => {
  it('requires the database permission RPC instead of trusting a client role payload', async () => {
    const source = readFileSync(resolve(process.cwd(), 'supabase/functions/_shared/admin-access.ts'), 'utf8');
    expect(source).toContain("rpc('has_admin_permission'");
    expect(source).toContain('Forbidden:');
    expect(source).not.toContain('localStorage');
  });
});
