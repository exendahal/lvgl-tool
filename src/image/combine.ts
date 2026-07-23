import { encodeRlePackBits } from '../lib/rle';

/** Palette bytes (if any) followed immediately by packed pixel bytes, matching LVGL's convention
 * of storing an indexed image's palette right before its pixel data in the same buffer. */
export function combinePixelBytes(paletteData: Uint8Array | undefined, pixelData: Uint8Array): Uint8Array {
  const combined = new Uint8Array((paletteData?.length ?? 0) + pixelData.length);
  if (paletteData) combined.set(paletteData, 0);
  combined.set(pixelData, paletteData?.length ?? 0);
  return combined;
}

export function maybeRle(bytes: Uint8Array, apply: boolean): Uint8Array {
  return apply ? encodeRlePackBits(bytes) : bytes;
}
