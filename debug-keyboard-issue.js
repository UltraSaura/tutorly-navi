// Debug script to diagnose keyboard and input visibility issues
// Run this in browser console when the keyboard is showing/hiding

function debugKeyboardState() {
  console.log('=== KEYBOARD DEBUG STATE ===');
  
  // Check keyboard element
  const keyboards = [
    document.querySelector('.ML__keyboard'),
    document.querySelector('ml-virtual-keyboard'),
    document.querySelector('.ML__virtual-keyboard')
  ];
  
  let keyboardFound = false;
  keyboards.forEach((kb, index) => {
    if (kb) {
      keyboardFound = true;
      const rect = kb.getBoundingClientRect();
      const style = window.getComputedStyle(kb);
      console.log(`Keyboard ${index} found:`, {
        selector: ['ML__keyboard', 'ml-virtual-keyboard', 'ML__virtual-keyboard'][index],
        position: {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          width: rect.width
        },
        style: {
          display: style.display,
          visibility: style.visibility,
          position: style.position,
          zIndex: style.zIndex,
          bottom: style.bottom,
          transform: style.transform
        },
        visible: rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
      });
    }
  });
  
  if (!keyboardFound) {
    console.log('No keyboard element found!');
  }
  
  // Check message input container
  const messageInputs = document.querySelectorAll('.fixed');
  console.log(`Found ${messageInputs.length} fixed elements`);
  
  messageInputs.forEach((input, index) => {
    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    const hasMessageInput = input.querySelector('math-field') || input.querySelector('textarea');
    
    if (hasMessageInput) {
      console.log(`Message Input Container:`, {
        classes: input.className,
        position: {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          visible: rect.top < window.innerHeight && rect.bottom > 0
        },
        style: {
          bottom: style.bottom,
          zIndex: style.zIndex,
          transform: style.transform,
          display: style.display,
          visibility: style.visibility
        }
      });
    }
  });
  
  // Check math field
  const mathField = document.querySelector('math-field');
  if (mathField) {
    console.log('MathField:', {
      virtualKeyboardPolicy: mathField.virtualKeyboardPolicy,
      virtualKeyboardVisible: mathField.virtualKeyboardVisible,
      hasFocus: document.activeElement === mathField
    });
  }
  
  // Check viewport
  console.log('Viewport:', {
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth,
    screenHeight: window.screen.height,
    screenWidth: window.screen.width,
    visualViewport: window.visualViewport ? {
      height: window.visualViewport.height,
      offsetTop: window.visualViewport.offsetTop
    } : 'Not available'
  });
  
  console.log('=== END DEBUG ===');
}

// Run immediately
debugKeyboardState();

// Also provide function to monitor changes
window.monitorKeyboard = function() {
  console.log('Starting keyboard monitoring... (press Ctrl+C to stop)');
  const interval = setInterval(debugKeyboardState, 2000);
  window.stopMonitoring = () => clearInterval(interval);
  return 'Monitoring started. Call window.stopMonitoring() to stop.';
};

console.log('Debug functions available:');
console.log('- debugKeyboardState() - Run once to check current state');
console.log('- window.monitorKeyboard() - Monitor continuously');
console.log('- window.stopMonitoring() - Stop monitoring');