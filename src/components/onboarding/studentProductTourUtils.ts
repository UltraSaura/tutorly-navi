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
  { id: 'plus', target: 'chat-add', titleKey: 'productTour.plus.title', descriptionKey: 'productTour.plus.description' },
  { id: 'photo', target: 'attachment-camera', titleKey: 'productTour.photo.title', descriptionKey: 'productTour.photo.description', principleKey: 'productTour.photo.principle' },
  { id: 'practice', target: 'nav-practice', titleKey: 'productTour.practice.title', descriptionKey: 'productTour.practice.description' },
  { id: 'learning', target: 'nav-learning', titleKey: 'productTour.learning.title', descriptionKey: 'productTour.learning.description' },
  { id: 'complete', titleKey: 'productTour.complete.title', descriptionKey: 'productTour.complete.description' },
];

export function clampTourCardPosition(value: number, size: number, viewport: number, margin = 12) {
  return Math.max(margin, Math.min(value, Math.max(margin, viewport - size - margin)));
}

export function getTourTargetSelector(target: string) {
  return `[data-tour="${target}"]`;
}

export function getNextTourStepIndex(current: number, total = PRODUCT_TOUR_STEPS.length) {
  return Math.min(current + 1, total - 1);
}

type Rect = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;

export type TourCardPlacement = 'above' | 'below' | 'center';

export function getTourCardPosition(
  rect: Rect | null,
  stepId: string,
  viewport: { width: number; height: number },
  cardHeight = 300,
  safeMargins = { top: 12, bottom: 12 },
) {
  const cardWidth = Math.min(360, Math.max(0, viewport.width - 24));
  const availableHeight = Math.max(0, viewport.height - safeMargins.top - safeMargins.bottom);
  const height = Math.min(cardHeight, availableHeight);

  if (!rect) {
    return {
      top: safeMargins.top + Math.max(0, (availableHeight - height) / 2),
      left: clampTourCardPosition((viewport.width - cardWidth) / 2, cardWidth, viewport.width),
      width: cardWidth,
      height,
      placement: 'center' as TourCardPlacement,
    };
  }

  const isBottomTarget = stepId === 'home' || stepId === 'plus' || stepId === 'photo' || rect.top > viewport.height / 2;
  const gap = 14;
  const aboveSpace = rect.top - safeMargins.top - gap;
  const belowSpace = viewport.height - safeMargins.bottom - rect.bottom - gap;
  const preferAbove = isBottomTarget || belowSpace < height;
  const placement: TourCardPlacement = preferAbove && aboveSpace >= height ? 'above' : belowSpace >= height ? 'below' : aboveSpace >= belowSpace ? 'above' : 'below';
  const top = placement === 'above'
    ? rect.top - height - gap
    : placement === 'below'
      ? rect.bottom + gap
      : safeMargins.top;

  return {
    top: clampTourCardPosition(top, height, viewport.height, safeMargins.top),
    left: clampTourCardPosition(rect.left + (rect.width - cardWidth) / 2, cardWidth, viewport.width),
    width: cardWidth,
    height,
    placement,
  };
}
