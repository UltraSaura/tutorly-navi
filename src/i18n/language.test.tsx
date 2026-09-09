import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import i18n from './index';
import { resources } from './resources';
import { SimpleLanguageProvider, useLanguage } from '@/context/SimpleLanguageContext';
import { useLanguage as useLegacyLanguage } from '@/context/LanguageContext';
import { useLanguageContext } from '@/context/LanguageProvider';
import { useInterfaceTranslation } from './useInterfaceTranslation';
import { useLocale } from './useLocale';
import { useSubjectLabel } from './useSubjectLabel';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useCountryDetection', () => ({
  useCountryDetection: () => ({ detection: {}, getLanguageFromDetection: () => 'fr', detectCountry: async () => ({ country: 'FR' }) }),
}));

let selected: ReturnType<typeof useLanguage>;
function Probe() {
  selected = useLanguage();
  const legacy = useLegacyLanguage();
  const compatibility = useLanguageContext();
  const { t } = useTranslation();
  const ui = useInterfaceTranslation();
  const subject = useSubjectLabel();
  const { dateLocale } = useLocale();
  return <div>
    <span>{selected.language}/{legacy.language}/{compatibility.currentLanguage}</span>
    <span>{selected.t('profile.title')}/{t('profile.title')}/{legacy.t('profile.title')}</span>
    <span>{ui('Welcome to Your Guardian Portal')}</span>
    <span>{ui('Leçon terminée !')}</span>
    <span>{subject('Mathématiques')}</span>
    <span>{format(new Date(2026, 8, 8), 'MMMM', { locale: dateLocale })}</span>
  </div>;
}
const render = () => renderToStaticMarkup(<SimpleLanguageProvider><Probe /></SimpleLanguageProvider>);

beforeEach(async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  await i18n.changeLanguage('en');
});

describe('application language selection', () => {
  it('switches all translation APIs, interface text, subjects, and date labels together', async () => {
    expect(render()).toContain('en/en/en');
    expect(render()).toContain('Lesson complete!');
    expect(render()).toContain('Mathematics');
    expect(render()).toContain('September');
    selected.changeLanguage('fr');
    const french = render();
    expect(french).toContain('fr/fr/fr');
    expect(french).toContain('Profil/Profil/Profil');
    expect(french).toContain('Bienvenue dans votre espace parent');
    expect(french).toContain('Leçon terminée !');
    expect(french).toContain('Mathématiques');
    expect(french).toContain('septembre');
    expect(localStorage.getItem('lang')).toBe('fr');
    expect(localStorage.getItem('languageManuallySet')).toBe('true');
    selected.changeLanguage('en');
    expect(render()).toContain('Profile/Profile/Profile');
    expect(render()).toContain('Welcome to Your Guardian Portal');
  });

  it('keeps an explicit English choice when country detection returns France', () => {
    render();
    selected.changeLanguage('en');
    selected.setLanguageFromCountry('FR');
    expect(render()).toContain('en/en/en');
    expect(localStorage.getItem('lang')).toBe('en');
  });

  it('rejects unsupported selections', () => {
    render();
    selected.changeLanguage('invalid');
    expect(render()).toContain('en/en/en');
    expect(localStorage.getItem('languageManuallySet')).toBeNull();
  });

  it('resolves legacy exercise aliases and both interpolation styles', () => {
    render();
    expect(selected.t('exercises.summary', { correct: 2, total: 3 })).toBe('2/3 correct');
    expect(selected.t('exercises.exercises.summary', { correct: 2, total: 3 })).toBe('2/3 correct');
    expect(selected.t('topic.objectivesMastered', { mastered: 2, total: 3 })).toBe('2 of 3 objectives mastered');
  });

  it('uses singular and plural counts in both languages without leftover braces', async () => {
    for (const [lang, singular, plural] of [['en', '1 lesson', '2 lessons'], ['fr', '1 leçon', '2 leçons']]) {
      await i18n.changeLanguage(lang);
      expect(i18n.t('lessonCount', { ns: 'interface', count: 1 })).toBe(singular);
      expect(i18n.t('lessonCount', { ns: 'interface', count: 2 })).toBe(plural);
    }
  });

  it('provides matching interface keys and interpolation parameters in both languages', () => {
    expect(Object.keys(resources.en.interface).sort()).toEqual(Object.keys(resources.fr.interface).sort());
    for (const key of Object.keys(resources.en.interface)) {
      const parameters = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
      expect(parameters(resources.en.interface[key]), key).toEqual(parameters(resources.fr.interface[key]));
    }
  });
});
