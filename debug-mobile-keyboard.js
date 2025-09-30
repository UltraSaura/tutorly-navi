// Debug script to check mobile keyboard and input positioning
// Run this in the browser console to verify the fixes

console.log('=== Mobile Keyboard Debug ===');

// Check mobile detection
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.screen.width < 768;
console.log('Is Mobile Device:', isMobile);
console.log('User Agent:', navigator.userAgent);
console.log('Screen Width:', window.screen.width);
console.log('Window Width:', window.innerWidth);

// Check viewport
if (window.visualViewport) {
  console.log('Visual Viewport Height:', window.visualViewport.height);
  console.log('Window Height:', window.innerHeight);
  console.log('Keyboard Height (estimated):', window.innerHeight - window.visualViewport.height);
}

// Check MathLive keyboard
const keyboardElement = document.querySelector('ml-virtual-keyboard, .ML__keyboard, .ML__virtual-keyboard');
if (keyboardElement) {
  const rect = keyboardElement.getBoundingClientRect();
  const style = window.getComputedStyle(keyboardElement);
  console.log('Keyboard Found:', true);
  console.log('Keyboard Position:', {
    top: rect.top,
    bottom: rect.bottom,
    height: rect.height,
    display: style.display,
    visibility: style.visibility,
    position: style.position,
    zIndex: style.zIndex
  });
} else {
  console.log('Keyboard Found:', false);
}

// Check message input
const messageInput = document.querySelector('.fixed.z-50'); // Updated selector based on new z-index
if (messageInput) {
  const rect = messageInput.getBoundingClientRect();
  const style = window.getComputedStyle(messageInput);
  console.log('Message Input Found:', true);
  console.log('Message Input Position:', {
    top: rect.top,
    bottom: rect.bottom,
    height: rect.height,
    transform: style.transform,
    zIndex: style.zIndex
  });
} else {
  console.log('Message Input Found:', false);
}

// Check MathField element
const mathField = document.querySelector('math-field');
if (mathField) {
  console.log('MathField Found:', true);
  console.log('MathField Config:', {
    virtualKeyboardPolicy: mathField.virtualKeyboardPolicy,
    virtualKeyboardVisible: mathField.virtualKeyboardVisible,
    virtualKeyboards: mathField.virtualKeyboards
  });
} else {
  console.log('MathField Found:', false);
}

console.log('=== End Debug ===');