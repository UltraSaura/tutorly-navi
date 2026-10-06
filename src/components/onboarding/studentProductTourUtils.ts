export type ProductTourStep = {
  id: string;
  target?: string;
  titleKey: string;
  descriptionKey: string;
  principleKey?: string;
};

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  { id: 'welcome', titleKey: 'productTour.welcome.title', descriptionKey: 'productTour.welcome.description', principleKey: 'productTour.welcome.principle' },
  { id: 'home', target: 'home-input', titleKey: 'productTour.home.title', descriptionKey: 'productTour.home.description', principleKey: 'productTour.home.principle' },
  { id: 'practice', target: 'nav-practice', titleKey: 'productTour.practice.title', descriptionKey: 'productTour.practice.description' },
  { id: 'learning', target: 'nav-learning', titleKey: 'productTour.learning.title', descriptionKey: 'productTour.learning.description' },
  { id: 'history', target: 'nav-history', titleKey: 'productTour.history.title', descriptionKey: 'productTour.history.description' },
  { id: 'complete', titleKey: 'productTour.complete.title', descriptionKey: 'productTour.complete.description' },
];

export function clampTourCardPosition(value: number, size: number, viewport: number, margin = 16) {
  return Math.max(margin, Math.min(value, viewport - size - margin));
}

export function getTourTargetSelector(target: string) {
  return `[data-tour="${target}"]`;
}

export function getNextTourStepIndex(current: number, total = PRODUCT_TOUR_STEPS.length) {
  return Math.min(current + 1, total - 1);
}

type Rect = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;

export function getTourCardPosition(rect: Rect | null, stepId: string, viewport: { width: number; height: number }) {
  const cardWidth = Math.min(360, viewport.width - 32);
  const cardHeight = 240;
  if (!rect) {
    return { top: Math.max(16, (viewport.height - cardHeight) / 2), left: (viewport.width - cardWidth) / 2, width: cardWidth };
  }
  const isBottomNavigation = ['practice', 'learning', 'history'].includes(stepId);
  const preferredTop = isBottomNavigation ? rect.top - cardHeight - 20 : rect.bottom + 20;
  const top = preferredTop >= 16 && preferredTop + cardHeight <= viewport.height - 16
    ? preferredTop
    : Math.max(16, viewport.height - cardHeight - 16);
  const left = clampTourCardPosition(rect.left + (rect.width - cardWidth) / 2, cardWidth, viewport.width);
  return { top, left, width: cardWidth };
}
