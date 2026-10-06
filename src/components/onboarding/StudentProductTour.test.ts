import { describe, expect, it } from 'vitest';
import {
  PRODUCT_TOUR_STEPS,
  clampTourCardPosition,
  getNextTourStepIndex,
  getTourCardPosition,
  getTourTargetSelector,
  shouldBlockAttachmentActions,
} from './studentProductTourUtils';
import { isEligibleStudentTourProfile } from '@/hooks/useStudentProductTour';

describe('StudentProductTour', () => {
  it('only auto-qualifies a completed-profile student without completion state', () => {
    expect(isEligibleStudentTourProfile({ userType: 'student', curriculumCountryCode: 'fr', curriculumLevelCode: 'cm2', completedAt: null })).toBe(true);
    expect(isEligibleStudentTourProfile({ userType: 'admin', curriculumCountryCode: 'fr', curriculumLevelCode: 'cm2', completedAt: null })).toBe(false);
    expect(isEligibleStudentTourProfile({ userType: 'student', curriculumCountryCode: null, curriculumLevelCode: 'cm2', completedAt: null })).toBe(false);
    expect(isEligibleStudentTourProfile({ userType: 'student', curriculumCountryCode: 'fr', curriculumLevelCode: 'cm2', completedAt: '2026-10-06T12:00:00Z' })).toBe(false);
  });

  it('keeps target selectors stable for mobile and desktop navigation', () => {
    expect(PRODUCT_TOUR_STEPS.map((step) => step.id)).toEqual(['welcome', 'home', 'plus', 'photo', 'practice', 'learning', 'complete']);
    expect(PRODUCT_TOUR_STEPS.some((step) => step.id === 'history')).toBe(false);
    expect(PRODUCT_TOUR_STEPS.find((step) => step.id === 'home')?.target).toBe('home-input');
    expect(PRODUCT_TOUR_STEPS.find((step) => step.id === 'plus')?.target).toBe('chat-add');
    expect(PRODUCT_TOUR_STEPS.find((step) => step.id === 'photo')?.target).toBe('attachment-camera');
    expect(shouldBlockAttachmentActions('photo')).toBe(true);
    expect(shouldBlockAttachmentActions('plus')).toBe(false);
    expect(shouldBlockAttachmentActions('practice')).toBe(false);
    expect(getTourTargetSelector('nav-practice')).toBe('[data-tour="nav-practice"]');
    expect(getTourTargetSelector('nav-learning')).toBe('[data-tour="nav-learning"]');
    expect(getTourTargetSelector('nav-history')).toBe('[data-tour="nav-history"]');
  });

  it('advances and clamps tour navigation without pixel-based assumptions', () => {
    expect(getNextTourStepIndex(0)).toBe(1);
    expect(getNextTourStepIndex(PRODUCT_TOUR_STEPS.length - 1)).toBe(PRODUCT_TOUR_STEPS.length - 1);
    expect(clampTourCardPosition(-20, 300, 390)).toBe(12);
    expect(clampTourCardPosition(500, 300, 390)).toBe(78);
    expect(getTourCardPosition(null, 'welcome', { width: 390, height: 844 }).left).toBe(15);
  });

  it('places bottom targets above and desktop navigation below without overlap', () => {
    const mobile = getTourCardPosition({ top: 760, left: 24, right: 90, bottom: 824, width: 66, height: 64 }, 'practice', { width: 390, height: 844 }, 240);
    expect(mobile.placement).toBe('above');
    expect(mobile.top + mobile.height).toBeLessThan(760);

    const desktop = getTourCardPosition({ top: 16, left: 420, right: 510, bottom: 56, width: 90, height: 40 }, 'practice', { width: 1440, height: 900 }, 240);
    expect(desktop.placement).toBe('below');
    expect(desktop.top).toBeGreaterThan(56);
  });
});
