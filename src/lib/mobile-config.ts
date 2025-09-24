// Mobile-specific configuration for Capacitor

import { Capacitor } from '@capacitor/core';

// Check if running on mobile device
export const isMobile = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';

// Mobile-specific MathLive configuration
export const getMobileMathliveConfig = () => {
  if (isMobile) {
    return {
      // Disable virtual keyboard on mobile (use system keyboard)
      virtualKeyboardPolicy: 'manual',
      // Optimize for touch
      smartFence: true,
      smartSuperscript: true,
      // Mobile-friendly options
      removeExtraneousParentheses: true,
    };
  }
  return {};
};

// Handle mobile-specific navigation
export const handleMobileBack = () => {
  if (isAndroid) {
    // Handle Android back button
    window.history.back();
  }
};

// Mobile-specific viewport meta tag
export const setMobileViewport = () => {
  if (isMobile) {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }
};