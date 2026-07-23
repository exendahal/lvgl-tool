import type { DecodedImage } from './types';
import { nearestPaletteIndex, type PaletteEntry } from './quantize';

const FS_WEIGHTS: [dx: number, dy: number, w: number][] = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16],
];

function diffuse(errR: Float32Array, errG: Float32Array, errB: Float32Array, errA: Float32Array, width: number, height: number, x: number, y: number, dr: number, dg: number, db: number, da: number): void {
  for (const [dx, dy, w] of FS_WEIGHTS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny >= height) continue;
    const idx = ny * width + nx;
    errR[idx] += dr * w;
    errG[idx] += dg * w;
    errB[idx] += db * w;
    errA[idx] += da * w;
  }
}

/**
 * Floyd-Steinberg dithering against an explicit palette (indexed color formats).
 * Returns one palette index per pixel.
 */
export function ditherToPalette(image: DecodedImage, palette: PaletteEntry[]): Uint8Array {
  const { width, height, data } = image;
  const n = width * height;
  const errR = new Float32Array(n);
  const errG = new Float32Array(n);
  const errB = new Float32Array(n);
  const errA = new Float32Array(n);
  const indices = new Uint8Array(n);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const o = idx * 4;
      const r = clamp255(data[o] + errR[idx]);
      const g = clamp255(data[o + 1] + errG[idx]);
      const b = clamp255(data[o + 2] + errB[idx]);
      const a = clamp255(data[o + 3] + errA[idx]);
      const pIdx = nearestPaletteIndex(palette, r, g, b, a);
      indices[idx] = pIdx;
      const [pr, pg, pb, pa] = palette[pIdx];
      diffuse(errR, errG, errB, errA, width, height, x, y, r - pr, g - pg, b - pb, a - pa);
    }
  }
  return indices;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Floyd-Steinberg dithering for uniform bit-depth reduction (e.g. 8bpc -> RGB565's 5/6/5,
 * or an alpha channel reduced to N bits). `levels` is the number of representable values
 * per channel post-quantization (e.g. 32 for a 5-bit channel).
 */
export function ditherUniform(
  image: DecodedImage,
  levelsPerChannel: [r: number, g: number, b: number, a: number],
): Uint8ClampedArray {
  const { width, height, data } = image;
  const n = width * height;
  const errR = new Float32Array(n);
  const errG = new Float32Array(n);
  const errB = new Float32Array(n);
  const errA = new Float32Array(n);
  const out = new Uint8ClampedArray(data.length);
  const step = levelsPerChannel.map((levels) => 255 / (levels - 1));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const o = idx * 4;
      const src = [
        clamp255(data[o] + errR[idx]),
        clamp255(data[o + 1] + errG[idx]),
        clamp255(data[o + 2] + errB[idx]),
        clamp255(data[o + 3] + errA[idx]),
      ];
      const quant = src.map((v, ch) => Math.round(Math.round(v / step[ch]) * step[ch]));
      out[o] = quant[0];
      out[o + 1] = quant[1];
      out[o + 2] = quant[2];
      out[o + 3] = quant[3];
      diffuse(errR, errG, errB, errA, width, height, x, y, src[0] - quant[0], src[1] - quant[1], src[2] - quant[2], src[3] - quant[3]);
    }
  }
  return out;
}
