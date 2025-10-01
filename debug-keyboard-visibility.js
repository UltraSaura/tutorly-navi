// Simple debug script to check keyboard visibility issue
function checkKeyboard() {
  console.log('=== KEYBOARD VISIBILITY CHECK ===');
  
  const keyboards = [
    document.querySelector('.ML__keyboard'),
    document.querySelector('ml-virtual-keyboard'),
    document.querySelector('.ML__virtual-keyboard')
  ];
  
  let found = false;
  keyboards.forEach((kb, index) => {
    if (kb) {
      found = true;
      const rect = kb.getBoundingClientRect();
      const style = window.getComputedStyle(kb);
      
      console.log(`Keyboard ${index}:`, {
        element: kb.tagName || kb.className,
        visible: rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
        nearBottom: Math.abs(rect.bottom - window.innerHeight) < 5,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex,
        position: style.position,
        maxHeight: style.maxHeight
      });
      
      // Check if there are inline styles overriding
      if (kb.style.display || kb.style.visibility) {
        console.warn('Inline styles detected:', {
          display: kb.style.display,
          visibility: kb.style.visibility
        });
      }
    }
  });
  
  if (!found) {
    console.log('No keyboard elements found in DOM');
    
    // Check if MathLive is loaded
    const mathField = document.querySelector('math-field');
    if (mathField) {
      console.log('MathField found:', {
        virtualKeyboardPolicy: mathField.virtualKeyboardPolicy,
        virtualKeyboardVisible: mathField.virtualKeyboardVisible,
        hasFocus: document.activeElement === mathField
      });
      
      // Try to show keyboard
      console.log('Attempting to show keyboard...');
      mathField.virtualKeyboardVisible = true;
      
      setTimeout(() => {
        const kb = document.querySelector('.ML__keyboard, ml-virtual-keyboard');
        if (kb) {
          console.log('Keyboard appeared after setting virtualKeyboardVisible = true');
        } else {
          console.log('Keyboard still not visible after attempt');
        }
      }, 100);
    }
  }
  
  console.log('Window height:', window.innerHeight);
  console.log('40% of viewport:', window.innerHeight * 0.4);
  console.log('==========================');
}

// Run immediately
checkKeyboard();

// Export for manual use
window.checkKeyboard = checkKeyboard;