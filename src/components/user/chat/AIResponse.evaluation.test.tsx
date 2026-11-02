import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildFractionFeedbackChallenge, FractionBoundsFeedbackCard, fractionChallengeCheckButtonClass, getFractionChallengeChoiceClass, resolveExerciseEvaluation } from './AIResponse';
import { Button } from '@/components/ui/button';
import { localGrade } from '@/services/localMathGrader';

describe('AIResponse local exercise evaluation', () => {
  it.each([
    ['Encadrer 7/3 entre deux entiers consécutifs', '2 et 3', true],
    ['Encadrer 7/3 entre deux fractions', '2 et 5', false],
    ['Encadrer 7/3 entre deux fractions', '2/1 et 5/1', true],
    ['Encadrer 7/3 entre deux fractions', '6/3 et 8/3', true],
    ['Encadrer 7/3 entre deux fractions', '7/2 et 7/3', false],
  ])('resolves %s / %s without provider status', (question, answer, isCorrect) => {
    const result = resolveExerciseEvaluation(question, answer, false, false);
    expect(result.localResult).not.toBeNull();
    expect(result.isCorrect).toBe(isCorrect);
    expect(result.isIncorrect).toBe(!isCorrect);
  });

  it('keeps unanswered exercises unevaluated', () => {
    const result = resolveExerciseEvaluation('Encadrer 7/3 entre deux fractions', '', false, false);
    expect(result.localResult).toBeNull();
    expect(result.isCorrect).toBe(false);
    expect(result.isIncorrect).toBe(false);
  });

  it('builds the optional fraction challenge from the actual target', () => {
    expect(buildFractionFeedbackChallenge('Encadrer 7/3 entre deux fractions', '6/3 et 9/3')).toMatchObject({
      referenceUpper: { numerator: 9, denominator: 3 },
      choices: [
        { id: 'A', label: '8/3' },
        { id: 'B', label: '10/3' },
        { id: 'C', label: '7/3' },
      ],
      correctChoice: 'A',
    });
  });

  it('does not offer the challenge for another task type', () => {
    expect(buildFractionFeedbackChallenge('Pose la division 748 ÷ 4', '')).toBeNull();
  });

  it('renders the correct fraction feedback card and its optional challenge', () => {
    const result = localGrade('Encadrer 7/3 entre deux fractions', '6/3 et 9/3');
    expect(result).not.toBeNull();
    const html = renderToStaticMarkup(
      <FractionBoundsFeedbackCard
        question="Encadrer 7/3 entre deux fractions"
        answer="6/3 et 9/3"
        result={result!}
        language="fr"
      />,
    );
    expect(html).toContain('data-feedback-card="fraction-bounds"');
    expect(html).toContain('Pas mal, tu es sur la bonne voie !');
    expect(html).not.toContain("Bravo, c'est correct !");
    expect(html).toContain('data-feedback-challenge="fraction-bounds"');
    expect(html).toContain('Tu peux aller plus loin !');
    expect(html).toContain('que 9/3');
    expect(html).toContain('8/3');
  });

  it('renders the pedagogical format advice for a numerically correct answer', () => {
    const result = localGrade('Encadrer 7/3 entre deux fractions', '2 et 3');
    const html = renderToStaticMarkup(
      <FractionBoundsFeedbackCard
        question="Encadrer 7/3 entre deux fractions"
        answer="2 et 3"
        result={result!}
        language="fr"
      />,
    );
    expect(html).toContain('Pas encore, continue !');
    expect(html).toContain('la consigne demande des fractions');
  });

  it('keeps the challenge check button lavender when disabled and violet when active', () => {
    const disabledHtml = renderToStaticMarkup(
      <Button className={fractionChallengeCheckButtonClass} disabled>Vérifier ma réponse</Button>,
    );
    const activeHtml = renderToStaticMarkup(
      <Button className={fractionChallengeCheckButtonClass}>Vérifier ma réponse</Button>,
    );
    expect(disabledHtml).toContain('disabled:bg-[#EDE5FA]');
    expect(disabledHtml).toContain('disabled:text-[#6B4BA5]');
    expect(disabledHtml).toContain('disabled:opacity-100');
    expect(activeHtml).toContain('bg-[#7452C4]');
    expect(activeHtml).toContain('text-white');
  });

  it('changes the selected choice to green only after a correct validation', () => {
    expect(getFractionChallengeChoiceClass('A', 'A', 'idle')).toContain('border-amber-500');
    expect(getFractionChallengeChoiceClass('A', 'A', 'correct')).toContain('border-[#22C55E]');
    expect(getFractionChallengeChoiceClass('A', 'A', 'correct')).toContain('bg-[#E8F8EC]');
    expect(getFractionChallengeChoiceClass('A', 'A', 'incorrect')).toContain('bg-rose-100');
  });
});
