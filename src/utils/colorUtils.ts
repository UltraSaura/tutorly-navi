/**
 * Color utility functions for converting between different color formats
 */

/**
 * Convert RGB string to HEX
 * @param rgb - RGB string like "rgb(255, 192, 203)"
 * @returns HEX string like "#FFC0CB"
 */
export function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * Convert HEX to RGB string
 * @param hex - HEX string like "#FFC0CB" or "FFC0CB"
 * @returns RGB string like "rgb(255, 192, 203)"
 */
export function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle short hex (#F0F)
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  if (hex.length !== 6) return 'rgb(0, 0, 0)';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Parse any color format to HEX for the color picker
 * @param color - Color in any format (rgb, hex, or named)
 * @returns HEX string
 */
export function parseColorToHex(color: string): string {
  if (!color) return '#000000';
  
  // Already hex
  if (color.startsWith('#')) {
    return color.length === 7 ? color : '#000000';
  }
  
  // RGB format
  if (color.startsWith('rgb')) {
    return rgbToHex(color);
  }
  
  // Try to convert named color by creating a temporary element
  if (typeof document !== 'undefined') {
    const tempEl = document.createElement('div');
    tempEl.style.color = color;
    document.body.appendChild(tempEl);
    const computedColor = window.getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    
    if (computedColor.startsWith('rgb')) {
      return rgbToHex(computedColor);
    }
  }
  
  return '#000000';
}

/**
 * Validate if a color string is in a valid format
 * @param color - Color string to validate
 * @returns true if valid
 */
export function isValidColorFormat(color: string): boolean {
  if (!color) return false;
  
  // Check hex format
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return true;
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) return true;
  
  // Check RGB format
  if (/^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/.test(color)) {
    const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const [, r, g, b] = match;
      return parseInt(r) <= 255 && parseInt(g) <= 255 && parseInt(b) <= 255;
    }
  }
  
  return false;
}
