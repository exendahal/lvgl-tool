import type { ColorFormatDef, DecodedImage, TransparencySettings } from '../lib/types';

function cloneImage(image: DecodedImage): DecodedImage {
  return { ...image, data: new Uint8ClampedArray(image.data) };
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
}

/** Samples the color at a canvas-space pixel, e.g. for a "click to pick background" UI action. */
export function samplePixelColor(image: DecodedImage, x: number, y: number): [number, number, number] {
  const idx = (Math.min(image.height - 1, Math.max(0, y)) * image.width + Math.min(image.width - 1, Math.max(0, x))) * 4;
  return [image.data[idx], image.data[idx + 1], image.data[idx + 2]];
}

/** Auto-samples the top-left corner pixel, a common heuristic for "guess the background color". */
export function autoSampleCornerColor(image: DecodedImage): [number, number, number] {
  return samplePixelColor(image, 0, 0);
}

/** Box-blurs the alpha channel only, to soften a hard cutout edge by `radius` pixels. */
function featherAlpha(image: DecodedImage, radius: number): void {
  if (radius <= 0) return;
  const { width, height, data } = image;
  const src = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) src[i] = data[i * 4 + 3];

  const pass = (input: Uint8ClampedArray, horizontal: boolean): Uint8ClampedArray => {
    const out = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let d = -radius; d <= radius; d++) {
          const sx = horizontal ? x + d : x;
          const sy = horizontal ? y : y + d;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          sum += input[sy * width + sx];
          count++;
        }
        out[y * width + x] = Math.round(sum / count);
      }
    }
    return out;
  };

  const blurred = pass(pass(src, true), false);
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = blurred[i];
}

/**
 * Decontaminates color fringing on partially-transparent edge pixels by unpremultiplying
 * against the known background color: recovers the true foreground color assuming the
 * observed pixel is a blend of foreground and the picked background.
 */
function despillEdges(image: DecodedImage, bg: [number, number, number]): void {
  const { width, height, data } = image;
  const [br, bg_, bb] = bg;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const a = data[o + 3];
    if (a === 0 || a === 255) continue;
    const af = a / 255;
    data[o] = Math.round((data[o] - (1 - af) * br) / af);
    data[o + 1] = Math.round((data[o + 1] - (1 - af) * bg_) / af);
    data[o + 2] = Math.round((data[o + 2] - (1 - af) * bb) / af);
  }
}

function applyColorPick(image: DecodedImage, settings: TransparencySettings): DecodedImage {
  const out = cloneImage(image);
  const [pr, pg, pb] = settings.pickedColor;
  const { width, height, data } = out;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const dist = colorDistance(data[o], data[o + 1], data[o + 2], pr, pg, pb);
    if (dist <= settings.tolerance) {
      data[o + 3] = 0;
    }
  }
  if (settings.feather > 0) {
    featherAlpha(out, settings.feather);
    despillEdges(out, settings.pickedColor);
  }
  return out;
}

function applyChromaKey(image: DecodedImage, settings: TransparencySettings): DecodedImage {
  const out = cloneImage(image);
  const [pr, pg, pb] = settings.pickedColor;
  const { width, height, data } = out;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const dist = colorDistance(data[o], data[o + 1], data[o + 2], pr, pg, pb);
    if (dist <= settings.tolerance) {
      data[o] = pr;
      data[o + 1] = pg;
      data[o + 2] = pb;
    }
    data[o + 3] = 255;
  }
  return out;
}

function flattenAlpha(image: DecodedImage): DecodedImage {
  const out = cloneImage(image);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255;
  return out;
}

/**
 * Applies the selected transparency workflow ahead of color-format packing.
 * Formats that can't represent transparency at all (gated in the UI) get alpha flattened
 * to fully opaque defensively, so packing never sees an unsupported partial-alpha value.
 */
export function applyTransparency(image: DecodedImage, settings: TransparencySettings, format: ColorFormatDef): DecodedImage {
  if (!format.supportsAlpha && !format.supportsChroma) {
    return flattenAlpha(image);
  }
  switch (settings.mode) {
    case 'none':
      return flattenAlpha(image);
    case 'existingAlpha': {
      const out = cloneImage(image);
      if (settings.feather > 0) featherAlpha(out, settings.feather);
      return out;
    }
    case 'colorPick':
      return applyColorPick(image, settings);
    case 'chromaKey':
      return applyChromaKey(image, settings);
  }
}

/** Default chroma-key color per LVGL convention. */
export const DEFAULT_CHROMA_COLOR: [number, number, number] = [0xff, 0x00, 0xff];
