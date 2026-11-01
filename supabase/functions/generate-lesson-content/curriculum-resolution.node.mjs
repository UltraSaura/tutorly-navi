import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEdition } from './curriculum-resolution.ts';

test('resolveEdition awaits maybeSingle and returns data/error explicitly', async () => {
  let called = false;
  const client = {
    rpc(name, params) {
      assert.equal(name, 'resolve_edition');
      assert.deepEqual(params, { p_level: 'CM2', p_subject: 'maths', p_track: null });
      return {
        async maybeSingle() {
          called = true;
          return { data: 'edition-id', error: null };
        },
      };
    },
  };
  assert.deepEqual(await resolveEdition(client, { p_level: 'CM2', p_subject: 'maths', p_track: null }), { data: 'edition-id', error: null });
  assert.equal(called, true);
});

test('resolveEdition preserves RPC errors for the caller fallback', async () => {
  const error = { message: 'RPC unavailable' };
  const client = { rpc: () => ({ maybeSingle: async () => ({ data: null, error }) }) };
  assert.deepEqual(await resolveEdition(client, {}), { data: null, error });
});

test('resolveEdition converts a rejected query into an explicit error result', async () => {
  const result = await resolveEdition({ rpc: () => ({ maybeSingle: async () => { throw new Error('network failed'); } }) }, {});
  assert.equal(result.data, null);
  assert.equal(result.error.message, 'network failed');
});
