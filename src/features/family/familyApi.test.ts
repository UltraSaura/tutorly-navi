import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { familyRpc, readSelection } from './familyApi';

beforeEach(() => rpc.mockReset());
describe('family RPC failures', () => {
  it('reports missing backend activation explicitly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Function not found' } });
    await expect(familyRpc('family_bootstrap')).rejects.toThrow('family.backendUnavailable');
  });
  it('preserves permission failures rather than reporting missing activation', async () => {
    const error = { code: '42501', message: 'Child unavailable' };
    rpc.mockResolvedValue({ data: null, error });
    await expect(familyRpc('family_select_child', { child: 'other-family' })).rejects.toBe(error);
  });
  it('rejects committed PIN rate-limit results without treating them as grants', async () => {
    rpc.mockResolvedValue({ data: { error: 'rate_limited' }, error: null });
    await expect(familyRpc('family_unlock_parent', { pin: '000000' })).rejects.toThrow('rate_limited');
  });
});

describe('family selection persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });
  it('restores only within the same Auth session', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify({ token: 'grant', sessionId: 'session-a' }));
    expect(readSelection('account', 'session-a')).toEqual({ token: 'grant' });
    expect(readSelection('account', 'session-b')).toBeNull();
  });
});
