import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check if device is mobile based on user agent and screen dimensions
    const checkIsMobile = () => {
      // Check user agent for actual mobile devices
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Use visualViewport width if available (more accurate on mobile)
      const viewportWidth = window.visualViewport 
        ? window.visualViewport.width 
        : window.innerWidth;
      
      const isSmallViewport = viewportWidth < MOBILE_BREAKPOINT;
      
      return isMobileDevice || isSmallViewport;
    }
    
    // Initial check
    setIsMobile(checkIsMobile());
    
    // Only listen to orientation changes and matchMedia
    // Don't listen to resize events that fire on keyboard open/close
    const handleOrientationChange = () => {
      setIsMobile(checkIsMobile());
    };
    
    // Use matchMedia for responsive breakpoint changes
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handleMediaChange = () => {
      setIsMobile(checkIsMobile());
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    mql.addEventListener('change', handleMediaChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      mql.removeEventListener('change', handleMediaChange);
    };
  }, [])

  return !!isMobile
}
