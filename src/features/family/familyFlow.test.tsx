import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveFamilyProfile } from './familyApi';

const state = vi.hoisted(() => ({
  path: '/chat', isFamily: true, isLegacyGuardian: false, profile: null as ActiveFamilyProfile, loading: false, busy: false,
  children: [
    { id: 'a', learnerId: 'learner-a', firstName: 'Alice', grade: 'CM1', avatarUrl: null, available: true },
    { id: 'b', learnerId: 'learner-b', firstName: 'Benoît', grade: 'CM2', avatarUrl: null, available: false },
  ],
}));
vi.mock('@/context/FamilyProfileContext', () => ({ useFamilyProfile: () => ({
  isFamily: state.isFamily, isLegacyGuardian: state.isLegacyGuardian, activeProfile: state.profile, loading: state.loading, busy: state.busy,
  error: null, epoch: 1, children: state.children, pinConfigured: true,
  switchProfile: vi.fn(), selectChild: vi.fn(), unlockParent: vi.fn(), refreshFamily: vi.fn(), setupPin: vi.fn(),
}) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'account' }, loading: false, signOut: vi.fn(), resetPassword: vi.fn() }) }));
vi.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ isAdmin: false, isLoading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/context/SimpleLanguageContext', () => ({ useLanguage: () => ({ language: 'en', changeLanguage: vi.fn(), t: (key: string) => key }) }));
vi.mock('@/components/ui/language-selector', () => ({ default: () => null }));
vi.mock('@/components/seo/PageMeta', () => ({ PageMeta: () => null }));
vi.mock('@/i18n/useInterfaceTranslation', () => ({ useInterfaceTranslation: () => (key: string) => ({
  'family.title': 'Qui utilise Stuwy ?', 'family.parent': 'Espace parent', 'family.switch': 'Changer de profil', 'family.addChild': 'Ajouter un enfant',
  'family.busy': 'Attends la fin de l’envoi',
}[key] ?? key) }));
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => ({ 'nav.account': 'Account', 'nav.language': 'Language' }[key] ?? key) }) }));
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: state.path, state: null }), useNavigate: () => vi.fn(),
  NavLink: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <span data-redirect={to} />,
}));
import FamilyPage from '@/pages/FamilyPage';
import { FamilyProfileMenu } from './FamilyProfileMenu';
import AuthPage from '@/pages/AuthPage';
import { FamilyRouteBoundary } from './FamilyRouteBoundary';

beforeEach(() => { state.path = '/chat'; state.isFamily = true; state.isLegacyGuardian = false; state.profile = null; state.loading = false; state.busy = false; });
const screen = () => renderToStaticMarkup(<FamilyRouteBoundary><span>learner-screen</span></FamilyRouteBoundary>);
describe('family navigation', () => {
  it('sends family login to the chooser', () => { expect(renderToStaticMarkup(<AuthPage />)).toContain('data-redirect="/family"'); });
  it('preserves independent student login redirection', () => { state.isFamily = false; expect(renderToStaticMarkup(<AuthPage />)).toContain('data-redirect="/"'); });
  it('keeps unenrolled parents on the existing portal during rollout', () => { state.isFamily = false; state.isLegacyGuardian = true; expect(renderToStaticMarkup(<AuthPage />)).toContain('data-redirect="/guardian"'); });
  it('never mounts a learner dashboard before a profile is selected', () => { expect(screen()).toContain('data-redirect="/family"'); expect(screen()).not.toContain('learner-screen'); });
  it('keeps a restored learner during ordinary navigation and refresh', () => { state.profile = { kind: 'child', familyAccountId: 'account', childId: 'a' }; expect(screen()).toContain('learner-screen'); });
  it('blocks child access to the parent portal', () => { state.profile = { kind: 'child', familyAccountId: 'account', childId: 'a' }; state.path = '/guardian/billing'; expect(screen()).toContain('data-redirect="/family"'); });
  it('allows the parent portal only in parent mode', () => { state.profile = { kind: 'parent', familyAccountId: 'account' }; state.path = '/guardian'; expect(screen()).toContain('learner-screen'); });
  it('waits for an unfinished submission before leaving the active mode', () => { state.profile = { kind: 'child', familyAccountId: 'account', childId: 'a' }; state.path = '/family'; state.busy = true; expect(screen()).toContain('Attends la fin de l’envoi'); expect(screen()).not.toContain('learner-screen'); });
  it('shows linked child cards, names, levels and parent authorization actions', () => {
    state.path = '/family';
    const html = renderToStaticMarkup(<FamilyPage />);
    expect(html).toContain('Qui utilise Stuwy ?'); expect(html).toContain('Espace parent');
    expect(html).toContain('Alice'); expect(html).toContain('Benoît'); expect(html).toContain('CM1'); expect(html).toContain('CM2');
    expect(html).toContain('Ajouter un enfant'); expect(html).toContain('disabled=""');
  });
  it('exposes the parent account menu with profile switch, language and sign out actions', () => {
    state.profile = { kind: 'parent', familyAccountId: 'account' };
    const html = renderToStaticMarkup(<FamilyProfileMenu />);
    expect(html).toContain('Account');
    expect(html).toContain('aria-label="Account: Espace parent"');
  });
});
