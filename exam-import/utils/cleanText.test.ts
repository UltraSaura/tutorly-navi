import { describe, expect, it } from 'vitest';
import { cleanText } from './cleanText.ts';

describe('cleanText', () => {
  it('removes Amiens DOM fragments and page prefixes', () => {
    expect(cleanText(`page 65'});"> Sujet de Juin 2021`)).toBe('Sujet de Juin 2021');
  });

  it('decodes HTML entities', () => {
    expect(cleanText('Sujet&nbsp;de&nbsp;Juin&nbsp;2021 &amp; corrig&eacute;')).toBe(
      'Sujet de Juin 2021 & corrigé',
    );
  });

  it('collapses repeated spaces and useless line breaks', () => {
    expect(cleanText(' Sujet   de\n\n   Juin\t2021 ')).toBe('Sujet de Juin 2021');
  });

  it('keeps already clean text unchanged', () => {
    expect(cleanText('Sujet de Juin 2021')).toBe('Sujet de Juin 2021');
  });
});
