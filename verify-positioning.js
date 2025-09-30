// Script to verify message input positioning relative to keyboard
console.log('=== POSITIONING VERIFICATION ===');

// Find keyboard
const keyboard = document.querySelector('.ML__keyboard, ml-virtual-keyboard, .ML__virtual-keyboard');
if (keyboard) {
  const kbRect = keyboard.getBoundingClientRect();
  const kbStyle = window.getComputedStyle(keyboard);
  console.log('Keyboard:', {
    top: kbRect.top,
    bottom: kbRect.bottom,
    height: kbRect.height,
    fromBottom: window.innerHeight - kbRect.top,
    visible: kbRect.height > 0 && kbStyle.display !== 'none'
  });
}

// Find message input container
const inputs = Array.from(document.querySelectorAll('.fixed')).filter(el => 
  el.querySelector('math-field') || el.querySelector('textarea')
);

if (inputs.length > 0) {
  const input = inputs[0];
  const inputRect = input.getBoundingClientRect();
  const inputStyle = window.getComputedStyle(input);
  
  console.log('Message Input:', {
    top: inputRect.top,
    bottom: inputRect.bottom,
    height: inputRect.height,
    styleBottom: inputStyle.bottom,
    transform: inputStyle.transform,
    zIndex: inputStyle.zIndex,
    distanceFromBottom: window.innerHeight - inputRect.bottom
  });
  
  if (keyboard) {
    const kbRect = keyboard.getBoundingClientRect();
    console.log('Relative Position:', {
      gapBetween: inputRect.bottom - kbRect.top,
      inputAboveKeyboard: inputRect.bottom <= kbRect.top,
      overlap: inputRect.bottom > kbRect.top && inputRect.top < kbRect.bottom
    });
  }
}

// Check mobile nav
const mobileNav = document.querySelector('.md\\:hidden.fixed.bottom-0');
if (mobileNav) {
  const navRect = mobileNav.getBoundingClientRect();
  console.log('Mobile Nav:', {
    height: navRect.height,
    top: navRect.top
  });
}

console.log('Viewport:', {
  height: window.innerHeight,
  width: window.innerWidth,
  isMobile: window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
});

console.log('=== END VERIFICATION ===');