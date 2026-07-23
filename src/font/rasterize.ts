import type { Font } from 'opentype.js';
import { getAdvanceWidthPx } from './parseFont';

export interface RasterizedGlyph {
  codepoint: number;
  /** boxW*boxH bytes, row-major, raw 0-255 antialiased coverage — not yet quantized to a bpp. */
  coverage: Uint8Array;
  boxW: number;
  boxH: number;
  ofsX: number;
  ofsY: number;
  /** From the font's own metrics (opentype.js), NOT including any user letter-spacing addition. */
  advanceWidthPx: number;
}

let uniqueFontCounter = 0;

/** Registers a font's bytes as a temporary, uniquely-named FontFace so Canvas can render it —
 * used purely for antialiased bitmap rasterization; all metrics (advance width, kerning,
 * glyph existence) instead come from opentype.js, which reads the font's real tables. */
export async function registerCanvasFont(bytes: ArrayBuffer): Promise<{ family: string; face: FontFace }> {
  const family = `lvgl-tool-tmp-${uniqueFontCounter++}`;
  const face = new FontFace(family, bytes);
  await face.load();
  document.fonts.add(face);
  return { family, face };
}

export function unregisterCanvasFont(face: FontFace): void {
  document.fonts.delete(face);
}

/**
 * Rasterizes one glyph by drawing it with the browser's native (antialiased, hinted) text
 * renderer onto an offscreen canvas, then cropping to its visible bounding box. The alpha
 * channel of a black-on-transparent fill IS the coverage value LVGL needs per-pixel.
 *
 * ofs_x/ofs_y sign convention: this is the highest-uncertainty part of font conversion (the PRD
 * itself flags bitmap-font rasterization as the riskiest piece of this whole tool). ofsX is the
 * horizontal distance from the glyph's pen origin to the left edge of its visible bitmap; ofsY
 * is the vertical distance from the baseline up to the bitmap's bottom edge (negative for
 * descenders). Glyph shapes/coverage/bpp will be correct regardless; if rendered text looks
 * vertically nudged on real hardware, this offset convention is the first place to check.
 */
export function rasterizeGlyph(fontFamily: string, opentypeFont: Font, codepoint: number, sizePx: number): RasterizedGlyph {
  const advanceWidthPx = getAdvanceWidthPx(opentypeFont, codepoint, sizePx);
  const char = String.fromCodePoint(codepoint);

  // Generous canvas margins so ascenders/descenders/overshoot never clip.
  const canvasSize = Math.ceil(sizePx * 3);
  const penX = Math.ceil(sizePx * 0.5);
  const penY = Math.ceil(sizePx * 1.5);

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.font = `${sizePx}px "${fontFamily}"`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000000';
  ctx.fillText(char, penX, penY);

  const { data } = ctx.getImageData(0, 0, canvasSize, canvasSize);
  let minX = canvasSize;
  let minY = canvasSize;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const a = data[(y * canvasSize + x) * 4 + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX) {
    // No visible pixels (space, or a glyph the font renders as nothing) — advance-only glyph.
    return { codepoint, coverage: new Uint8Array(0), boxW: 0, boxH: 0, ofsX: 0, ofsY: 0, advanceWidthPx };
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const coverage = new Uint8Array(boxW * boxH);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      coverage[y * boxW + x] = data[((minY + y) * canvasSize + (minX + x)) * 4 + 3];
    }
  }

  const ofsX = minX - penX;
  const ofsY = penY - (minY + boxH);

  return { codepoint, coverage, boxW, boxH, ofsX, ofsY, advanceWidthPx };
}

export function quantizeCoverageToBpp(coverage: Uint8Array, bpp: number): Uint8Array {
  const maxLevel = (1 << bpp) - 1;
  const out = new Uint8Array(coverage.length);
  for (let i = 0; i < coverage.length; i++) out[i] = Math.round((coverage[i] * maxLevel) / 255);
  return out;
}
