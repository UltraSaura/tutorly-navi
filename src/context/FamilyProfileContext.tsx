import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { familyRpc, learnerFromRow, normalizeCurrentProfile, normalizeFamilyChildren, readSelection, type ActiveFamilyProfile, type FamilyChild, type FamilySelection } from '@/features/family/familyApi';
import { profileIsBusy, setProfileRuntime, subscribeProfileBusy } from '@/features/family/profileRuntime';

interface FamilyProfileContextValue {
  activeProfile: ActiveFamilyProfile;
  isFamily: boolean;
  isLegacyGuardian: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  children: FamilyChild[];
  selection: FamilySelection | null;
  pinConfigured: boolean;
  selectChild: (childId: string) => Promise<void>;
  unlockParent: (pin: string) => Promise<void>;
  switchProfile: () => Promise<void>;
  refreshFamily: () => Promise<void>;
  setupPin: (password: string, pin: string) => Promise<void>;
  epoch: number;
}
const sharedQueryKeys = new Set(['user-roles', 'models', 'ai-models', 'model-providers', 'prompt-templates', 'subjects', 'practice-subject-buttons', 'school-levels-by-country']);
const personalQuery = (query: { queryKey: readonly unknown[] }) => !sharedQueryKeys.has(String(query.queryKey[0]));
const FamilyContext = createContext<FamilyProfileContextValue | null>(null);
export function FamilyProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isFamily, setIsFamily] = useState(false);
  const [isLegacyGuardian, setIsLegacyGuardian] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<FamilyChild[]>([]);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [selection, setSelection] = useState<FamilySelection | null>(null);
  const [epoch, setEpoch] = useState(0);
  const activeAccount = useRef<string | null>(null);
  const authUserRef = useRef(user);
  authUserRef.current = user;
  const accountId = user?.id;
  const transition = useRef(false);
  const busy = useSyncExternalStore(subscribeProfileBusy, profileIsBusy, () => false);

  const resetClient = useCallback(async () => {
    setSelection(null);
    setEpoch(value => value + 1);
    setProfileRuntime({ family: true, user: null, token: null });
    await queryClient.cancelQueries({ predicate: personalQuery });
    await supabase.removeAllChannels();
    queryClient.removeQueries({ predicate: personalQuery });
  }, [queryClient]);
  const refreshFamily = useCallback(async () => {
    setError(null);
    const state = await familyRpc<{ isFamily: boolean; isGuardian: boolean; pinConfigured: boolean }>('family_bootstrap');
    setIsFamily(Boolean(state?.isFamily)); setIsLegacyGuardian(Boolean(state?.isGuardian && !state?.isFamily));
    setPinConfigured(Boolean(state?.pinConfigured));
    setProfiles(state?.isFamily ? normalizeFamilyChildren(await familyRpc<unknown>('family_profiles')) : []);
  }, []);

  // Initialization runs for a new Auth session, not for token refresh events.
  const sessionId = session?.access_token ? (() => {
    try { return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id as string; }
    catch { return session.user.id; }
  })() : null;
  useEffect(() => {
    if (authLoading) return;
    const user = authUserRef.current;
    let cancelled = false;
    const previousAccount = activeAccount.current;
    if (previousAccount && previousAccount !== user?.id) {
      sessionStorage.removeItem(`stuwy:family:${previousAccount}`);
    }
    activeAccount.current = user?.id ?? null;
    setLoading(true); setError(null); setSelection(null); setProfiles([]); setIsLegacyGuardian(false);
    setProfileRuntime(null);
    const initialize = async () => {
      await queryClient.cancelQueries({ predicate: personalQuery });
      await supabase.removeAllChannels();
      queryClient.removeQueries({ predicate: personalQuery });
      if (!user) { if (!cancelled) { setIsFamily(false); setLoading(false); } return; }
      const account = user.id;
      try {
        const state = await familyRpc<{ isFamily: boolean; isGuardian: boolean; pinConfigured: boolean }>('family_bootstrap');
        if (cancelled) return;
        setIsFamily(Boolean(state?.isFamily)); setIsLegacyGuardian(Boolean(state?.isGuardian && !state?.isFamily)); setPinConfigured(Boolean(state?.pinConfigured));
        if (!state?.isFamily) { setProfileRuntime({ family: false, user, token: null, legacyGuardian: Boolean(state.isGuardian) }); return; }
        const cards = normalizeFamilyChildren(await familyRpc<unknown>('family_profiles'));
        if (cancelled) return;
        setProfiles(cards);
        const saved = sessionId ? readSelection(account, sessionId) : null;
        setProfileRuntime({ family: true, user: null, token: saved?.token ?? null });
        const current = saved ? normalizeCurrentProfile(await familyRpc<unknown>('family_current_profile')) : null;
        if (cancelled) return;
        if (current && saved) {
          const restored: FamilySelection = { profile: current.kind === 'parent' ? { kind: 'parent', familyAccountId: account } : { kind: 'child', familyAccountId: account, childId: current.childId }, user: current.learner ? learnerFromRow(current.learner) : null, token: saved.token, expiresAt: current.expiresAt };
          setProfileRuntime({ family: true, user: restored.user, token: restored.token });
          setSelection(restored);
        } else {
          sessionStorage.removeItem(`stuwy:family:${account}`);
          await familyRpc('family_lock');
          if (!cancelled) setProfileRuntime({ family: true, user: null, token: null });
        }
      } catch (cause) {
        if (!cancelled) { setError(String((cause as Error).message)); setIsFamily(true); setProfileRuntime({ family: true, user: null, token: null }); }
      } finally { if (!cancelled) { setEpoch(value => value + 1); setLoading(false); } }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [user?.id, sessionId, authLoading, queryClient]);

  const switchProfile = useCallback(async () => {
    if (!user || !isFamily) return;
    if (transition.current || profileIsBusy() || queryClient.isMutating()) throw new Error('family.busy');
    transition.current = true; setLoading(true); setError(null);
    // Fail closed locally even if network revocation fails. Retrying remains on the chooser.
    sessionStorage.removeItem(`stuwy:family:${user.id}`);
    try {
      await resetClient();
      await familyRpc('family_lock');
      await refreshFamily();
    } catch (cause) { setError(String((cause as Error).message)); throw cause; }
    finally { transition.current = false; setLoading(false); }
  }, [user, isFamily, queryClient, resetClient, refreshFamily]);

  const select = useCallback(async (kind: 'child' | 'parent', value: string) => {
    if (!user || !isFamily || transition.current || profileIsBusy()) throw new Error('family.busy');
    const account = user.id;
    transition.current = true; setLoading(true); setError(null);
    try {
      sessionStorage.removeItem(`stuwy:family:${account}`);
      await resetClient();
      await familyRpc('family_lock');
      const grant = await familyRpc<{ token: string; expiresAt: string }>(kind === 'child' ? 'family_select_child' : 'family_unlock_parent', kind === 'child' ? { child: value } : { pin: value });
      if (activeAccount.current !== account) return;
      setProfileRuntime({ family: true, user: null, token: grant.token });
      const current = normalizeCurrentProfile(await familyRpc<unknown>('family_current_profile'));
      if (!current || activeAccount.current !== account || (kind === 'child' && !current.childId)) throw new Error('family.unavailable');
      const next: FamilySelection = { profile: kind === 'parent' ? { kind, familyAccountId: account } : { kind, familyAccountId: account, childId: current.childId as string }, user: current.learner ? learnerFromRow(current.learner) : null, ...grant };
      setProfileRuntime({ family: true, user: next.user, token: next.token });
      sessionStorage.setItem(`stuwy:family:${account}`, JSON.stringify({ token: next.token, sessionId }));
      setSelection(next);
    } catch (cause) {
      if (activeAccount.current === account) { setProfileRuntime({ family: true, user: null, token: null }); setError(String((cause as Error).message)); }
      throw cause;
    } finally { transition.current = false; setLoading(false); }
  }, [user, isFamily, resetClient, sessionId]);

  // Expiry/removal is checked on focus and before rendering a restored profile.
  useEffect(() => {
    if (!selection || !accountId) return;
    let cancelled = false;
    const lock = async () => {
      sessionStorage.removeItem(`stuwy:family:${accountId}`);
      await resetClient();
      if (!cancelled) setError('family.expired');
      try { await familyRpc('family_lock'); } catch { /* server expiry still denies access */ }
    };
    const validate = async () => {
      try { if (!await familyRpc('family_current_profile') && !cancelled) await lock(); }
      catch { if (!cancelled) await lock(); }
    };
    const expired = () => { void lock(); };
    const timer = window.setTimeout(expired, Math.max(0, Date.parse(selection.expiresAt) - Date.now()));
    const interval = window.setInterval(() => { void validate(); }, 30_000);
    window.addEventListener('online', validate);
    window.addEventListener('focus', validate);
    window.addEventListener('stuwy:family-expired', expired);
    return () => { cancelled = true; window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener('online', validate); window.removeEventListener('focus', validate); window.removeEventListener('stuwy:family-expired', expired); };
  }, [selection, accountId, resetClient]);

  const setupPin = async (password: string, pin: string) => {
    const { data, error: requestError } = await supabase.functions.invoke('family-manage-pin', { body: { password, pin } });
    if (requestError || !data?.ok) throw new Error(data?.error ?? requestError?.message ?? 'family.error');
    await refreshFamily();
  };
  return <FamilyContext.Provider value={{ activeProfile: selection?.profile ?? null, selection, isFamily, isLegacyGuardian, loading, busy, error, children: profiles, pinConfigured, selectChild: id => select('child', id), unlockParent: pin => select('parent', pin), switchProfile, refreshFamily, setupPin, epoch }}>{children}</FamilyContext.Provider>;
}
export const useFamilyProfile = () => {
  const value = useContext(FamilyContext);
  if (!value) throw new Error('FamilyProfileProvider is required');
  return value;
};

// Auth account stays intact; only student-facing callers use this learner projection.
export function useLearner() {
  const auth = useAuth();
  const family = useContext(FamilyContext);
  const learner = family?.isFamily ? family.selection?.user ?? null : auth.user;
  return { ...auth, user: learner, learnerId: learner?.id ?? null, loading: auth.loading || Boolean(family?.loading) };
}
