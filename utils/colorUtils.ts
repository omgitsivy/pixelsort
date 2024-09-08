export function luminance(pixel: [number, number, number]): number {
    const [r, g, b] = pixel;
    return (Math.max(r, g, b) / 255 + Math.min(r, g, b) / 255) / 2;
  }
  
  export function saturation(pixel: [number, number, number]): number {
    const [r, g, b] = pixel;
    const min = Math.min(r, g, b) / 255;
    const max = Math.max(r, g, b) / 255;
  
    if (min === max) {
      return 0;
    }
  
    const l = (min + max) / 2;
  
    if (l > 0.5) {
      return (max - min) / (2 - max - min);
    } else {
      return (max - min) / (max + min);
    }
  }
  
  export function hue(pixel: [number, number, number]): number {
    const [r, g, b] = pixel;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
  
    if (max === min) {
      return 0;
    }
  
    let h: number;
    const d = max - min;
  
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
  
    return (h * 60) / 360;
  }