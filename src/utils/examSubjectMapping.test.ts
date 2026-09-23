import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import { getSubjectNameForSlug } from './examSubjectMapping';
import en from '../i18n/locales/en/common.json';
import fr from '../i18n/locales/fr/common.json';

describe('localized subject labels', () => {
  it.each([
    ['mathematiques', 'Mathematics', 'Mathématiques'],
    ['francais', 'French', 'Français'],
    ['sciences', 'Science', 'Sciences'],
    ['histoire', 'History', 'Histoire'],
    ['geographie', 'Geography', 'Géographie'],
    ['anglais', 'English', 'Anglais'],
    ['physique-chimie', 'Physics & Chemistry', 'Physique-Chimie'],
    ['histoire-geographie', 'History & Geography', 'Histoire-Géographie'],
  ])('localizes %s independently of the stored name', (slug, english, french) => {
    expect(getSubjectNameForSlug(slug, 'en-US', french)).toBe(english);
    expect(getSubjectNameForSlug(slug, 'fr-FR', english)).toBe(french);
  });

  it('recognizes accented names and English aliases', () => {
    expect(getSubjectNameForSlug('Mathématiques', 'en')).toBe('Mathematics');
    expect(getSubjectNameForSlug('geography', 'fr')).toBe('Géographie');
  });

  it('preserves custom subject names', () => {
    expect(getSubjectNameForSlug('robotics-club', 'en', 'Robotics Club')).toBe('Robotics Club');
  });
});

describe('practice and navigation translations', () => {
  it('switches page labels and exercise plurals in both directions', async () => {
    const i18n = createInstance();
    await i18n.init({ lng: 'en', resources: { en: { translation: en }, fr: { translation: fr } } });
    expect(i18n.t('practice.title')).toBe('Practice');
    expect(i18n.t('practice.chooseSubject')).toBe('Choose a subject to practice');
    expect(['home', 'practice', 'learning', 'history', 'account'].map(key => i18n.t(`nav.${key}`)))
      .toEqual(['Tutor', 'Practice', 'Learning', 'History', 'Account']);
    expect(i18n.t('practice.subjects.exerciseCount', { count: 0 })).toBe('0 exercises');
    expect(i18n.t('practice.subjects.exerciseCount', { count: 1 })).toBe('1 exercise');
    expect(i18n.t('practice.subjects.exerciseCount', { count: 2 })).toBe('2 exercises');
    await i18n.changeLanguage('fr');
    expect(i18n.t('nav.history')).toBe('Historique');
    expect(i18n.t('practice.subjects.exerciseCount', { count: 2 })).toBe('2 exercices');
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.history')).toBe('History');
  });
});
