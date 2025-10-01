// Debug script to verify the keyboard and input positioning after fixes
// Run this in the browser console when the keyboard is showing

function debugPositioningFix() {
  console.log('=== POSITIONING FIX DEBUG ===');
  console.log('Timestamp:', new Date().toISOString());
  
  // Find keyboard element
  const keyboards = [
    document.querySelector('.ML__keyboard'),
    document.querySelector('ml-virtual-keyboard'),
    document.querySelector('.ML__virtual-keyboard')
  ];
  
  let keyboardElement = null;
  keyboards.forEach(kb => {
    if (kb && !keyboardElement) {
      keyboardElement = kb;
    }
  });
  
  // Find message input container
  const messageInput = document.querySelector('.fixed.left-0.right-0.bg-background\\/95');
  
  // Calculate viewport info
  const viewportHeight = window.innerHeight;
  const maxKeyboardHeight = viewportHeight * 0.4;
  
  console.log('--- Viewport Info ---');
  console.log(`Window Height: ${viewportHeight}px`);
  console.log(`Max Keyboard Height (40vh): ${maxKeyboardHeight}px`);
  console.log(`Is Mobile: ${/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.screen.width < 768}`);
  
  if (keyboardElement) {
    const rect = keyboardElement.getBoundingClientRect();
    const style = window.getComputedStyle(keyboardElement);
    
    console.log('--- Keyboard Element ---');
    console.log(`Found: Yes`);
    console.log(`Position: ${style.position}`);
    console.log(`Display: ${style.display}`);
    console.log(`Visibility: ${style.visibility}`);
    console.log(`Z-Index: ${style.zIndex}`);
    console.log(`Max-Height CSS: ${style.maxHeight}`);
    console.log(`Actual Height: ${rect.height}px`);
    console.log(`Top: ${rect.top}px`);
    console.log(`Bottom: ${rect.bottom}px`);
    console.log(`Is Anchored to Bottom: ${rect.bottom === viewportHeight}`);
    console.log(`Is Visible: ${rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'}`);
    
    // Calculate effective height
    let effectiveHeight = 0;
    if (rect.bottom === viewportHeight) {
      effectiveHeight = Math.min(rect.height, maxKeyboardHeight);
    } else if (rect.top > viewportHeight * 0.5) {
      effectiveHeight = Math.min(viewportHeight - rect.top, maxKeyboardHeight);
    }
    console.log(`Effective Height (for positioning): ${effectiveHeight}px`);
    
    if (rect.height > maxKeyboardHeight) {
      console.warn(`⚠️ Keyboard height (${rect.height}px) exceeds 40vh (${maxKeyboardHeight}px)`);
    }
  } else {
    console.log('--- Keyboard Element ---');
    console.log('Found: No');
  }
  
  if (messageInput) {
    const rect = messageInput.getBoundingClientRect();
    const style = window.getComputedStyle(messageInput);
    const inlineStyle = messageInput.getAttribute('style');
    
    console.log('--- Message Input Container ---');
    console.log(`Found: Yes`);
    console.log(`Position: ${style.position}`);
    console.log(`Z-Index: ${style.zIndex}`);
    console.log(`Max-Height CSS: ${style.maxHeight}`);
    console.log(`Actual Height: ${rect.height}px`);
    console.log(`Top: ${rect.top}px`);
    console.log(`Bottom: ${rect.bottom}px`);
    console.log(`Bottom CSS: ${style.bottom}`);
    console.log(`Is Visible: ${rect.height > 0 && rect.top < viewportHeight && rect.bottom > 0}`);
    console.log(`Inline Style: ${inlineStyle?.substring(0, 200)}...`);
    
    if (rect.top < 0) {
      console.error(`❌ Message input is above viewport (top: ${rect.top}px)`);
    }
    if (rect.bottom > viewportHeight) {
      console.error(`❌ Message input extends below viewport (bottom: ${rect.bottom}px > ${viewportHeight}px)`);
    }
    if (rect.top > viewportHeight * 0.6) {
      console.warn(`⚠️ Message input might be too low (top: ${rect.top}px, 60% of viewport: ${viewportHeight * 0.6}px)`);
    }
  } else {
    console.log('--- Message Input Container ---');
    console.log('Found: No');
  }
  
  // Check positioning relationship
  if (keyboardElement && messageInput) {
    const kbRect = keyboardElement.getBoundingClientRect();
    const inputRect = messageInput.getBoundingClientRect();
    
    console.log('--- Positioning Relationship ---');
    const gap = kbRect.top - inputRect.bottom;
    console.log(`Gap between Input and Keyboard: ${gap}px`);
    
    if (gap < 0) {
      console.error(`❌ Input overlaps keyboard by ${Math.abs(gap)}px`);
    } else if (gap > 20) {
      console.warn(`⚠️ Large gap between input and keyboard: ${gap}px`);
    } else {
      console.log(`✅ Good positioning - small gap: ${gap}px`);
    }
    
    // Check if input is visible above keyboard
    const inputVisibleHeight = Math.min(inputRect.bottom, kbRect.top) - inputRect.top;
    console.log(`Input Visible Height: ${inputVisibleHeight}px`);
    if (inputVisibleHeight < 40) {
      console.error(`❌ Input is barely visible (${inputVisibleHeight}px height)`);
    }
  }
  
  console.log('============================');
  
  // Return summary
  return {
    keyboard: keyboardElement ? {
      height: keyboardElement.getBoundingClientRect().height,
      top: keyboardElement.getBoundingClientRect().top,
      isVisible: keyboardElement.getBoundingClientRect().height > 0
    } : null,
    input: messageInput ? {
      height: messageInput.getBoundingClientRect().height,
      top: messageInput.getBoundingClientRect().top,
      bottom: messageInput.getBoundingClientRect().bottom,
      isVisible: messageInput.getBoundingClientRect().top < viewportHeight
    } : null
  };
}

// Auto-run and provide instructions
console.log('%c📍 Positioning Debug Script Loaded', 'color: blue; font-weight: bold');
console.log('Run debugPositioningFix() to check current positioning');
console.log('Or run window.monitorPositioning() to monitor continuously');

// Monitor function
window.monitorPositioning = function() {
  if (window._positionMonitor) {
    clearInterval(window._positionMonitor);
    window._positionMonitor = null;
    console.log('Stopped monitoring positioning');
  } else {
    debugPositioningFix(); // Run once immediately
    window._positionMonitor = setInterval(debugPositioningFix, 2000);
    console.log('Started monitoring positioning (every 2 seconds). Run window.monitorPositioning() again to stop.');
  }
};

// Export for global use
window.debugPositioningFix = debugPositioningFix;