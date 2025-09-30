import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Determine mobile based on screen width and user agent
    const checkIsMobile = () => {
      // Check user agent first (most reliable for actual mobile devices)
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Use screen.width instead of window.innerWidth to avoid keyboard issues
      const isSmallScreen = window.screen.width < MOBILE_BREAKPOINT;
      
      return isMobileDevice || isSmallScreen;
    };
    
    // Set initial value
    setIsMobile(checkIsMobile());
    
    // Only listen to orientation changes, not resize
    const handleOrientationChange = () => {
      setIsMobile(checkIsMobile());
    };
    
    window.addEventListener("orientationchange", handleOrientationChange);
    
    // Also listen to media query changes but not window resize
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handleMediaChange = (e: MediaQueryListEvent) => {
      // Only update if not triggered by soft keyboard
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        if (keyboardHeight < 50) { // Only update if keyboard is not showing
          setIsMobile(checkIsMobile());
        }
      } else {
        setIsMobile(checkIsMobile());
      }
    };
    
    mql.addEventListener("change", handleMediaChange);
    
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      mql.removeEventListener("change", handleMediaChange);
    };
  }, [])

  return !!isMobile
}
