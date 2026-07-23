import type { ColorFormatDef, DecodedImage } from '../lib/types';
import { unpackRowAlignedBits } from '../lib/bitpack';
import { expandBits } from '../image/formats';
import type { PaletteEntry } from '../lib/quantize';

export interface DecodeInput {
  format: ColorFormatDef;
  width: number;
  height: number;
  /** Explicit row stride in bytes — only ever known for v9 sources (the header carries it). */
  stride?: number;
  bytes: Uint8Array;
}

export interface DecodeResult {
  image: DecodedImage;
  palette?: PaletteEntry[];
  inferredColorDepth?: 16 | 32;
  notes: string[];
}

export type DecodeOutcome = { ok: true; result: DecodeResult } | { ok: false; error: string };

function makeRgba(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

function decodeIndexed(input: DecodeInput): DecodeOutcome {
  const { format, width, height, bytes } = input;
  const paletteSize = format.paletteSize ?? 1 << format.bpp;
  const paletteBytesLen = paletteSize * 4;
  if (bytes.length < paletteBytesLen) {
    return { ok: false, error: `Array is too short to hold a ${paletteSize}-entry palette (need at least ${paletteBytesLen} bytes, got ${bytes.length}).` };
  }
  const paletteBytes = bytes.slice(0, paletteBytesLen);
  const pixelBytes = bytes.slice(paletteBytesLen);
  const palette: PaletteEntry[] = [];
  for (let i = 0; i < paletteSize; i++) {
    const o = i * 4;
    palette.push([paletteBytes[o + 2], paletteBytes[o + 1], paletteBytes[o], paletteBytes[o + 3]]);
  }
  const indices = unpackRowAlignedBits(pixelBytes, width, height, format.bpp, input.stride);
  const out = makeRgba(width, height);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a] = palette[indices[i]] ?? [0, 0, 0, 0];
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }
  return { ok: true, result: { image: { width, height, data: out, sourceName: '' }, palette, notes: [] } };
}

function decodeAlpha(input: DecodeInput): DecodeOutcome {
  const { format, width, height, bytes } = input;
  const maxLevel = (1 << format.bpp) - 1;
  const values = format.bpp === 8 ? bytes : unpackRowAlignedBits(bytes, width, height, format.bpp, input.stride);
  const out = makeRgba(width, height);
  for (let i = 0; i < width * height; i++) {
    const a = Math.round((values[i] * 255) / maxLevel);
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = a;
  }
  return { ok: true, result: { image: { width, height, data: out, sourceName: '' }, notes: [] } };
}

function decodeGrayscale(input: DecodeInput): DecodeOutcome {
  const { width, height, bytes } = input;
  if (bytes.length < width * height) {
    return { ok: false, error: `L8 data too short: need ${width * height} bytes, got ${bytes.length}.` };
  }
  const out = makeRgba(width, height);
  for (let i = 0; i < width * height; i++) {
    const lum = bytes[i];
    out[i * 4] = lum;
    out[i * 4 + 1] = lum;
    out[i * 4 + 2] = lum;
    out[i * 4 + 3] = 255;
  }
  return { ok: true, result: { image: { width, height, data: out, sourceName: '' }, notes: [] } };
}

function unpackRgb565(lo: number, hi: number): [number, number, number] {
  const v = lo | (hi << 8);
  return [expandBits((v >> 11) & 0x1f, 5), expandBits((v >> 5) & 0x3f, 6), expandBits(v & 0x1f, 5)];
}

const CHROMA_MAGENTA: [number, number, number] = [0xff, 0x00, 0xff];

function applyChromaPreview(out: Uint8ClampedArray, width: number, height: number, notes: string[]): void {
  let matched = 0;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (out[o] === CHROMA_MAGENTA[0] && out[o + 1] === CHROMA_MAGENTA[1] && out[o + 2] === CHROMA_MAGENTA[2]) {
      out[o + 3] = 0;
      matched++;
    }
  }
  if (matched > 0) {
    notes.push(`Chroma-key preview: ${matched} pixel(s) matching the conventional magenta (#FF00FF) were rendered transparent for visualization. The actual on-device magic color may differ if this asset used a custom chroma key.`);
  }
}

function decodeV9TrueColor(input: DecodeInput): DecodeOutcome {
  const { format, width, height, bytes } = input;
  const bytesPerPixel = format.bpp / 8;
  const rowStride = input.stride ?? width * bytesPerPixel;
  const out = makeRgba(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * rowStride + x * bytesPerPixel;
      const oi = (y * width + x) * 4;
      switch (format.id) {
        case 'rgb565': {
          const [r, g, b] = unpackRgb565(bytes[o], bytes[o + 1]);
          out[oi] = r;
          out[oi + 1] = g;
          out[oi + 2] = b;
          out[oi + 3] = 255;
          break;
        }
        case 'rgb888':
          out[oi] = bytes[o + 2];
          out[oi + 1] = bytes[o + 1];
          out[oi + 2] = bytes[o];
          out[oi + 3] = 255;
          break;
        case 'argb8888':
          out[oi] = bytes[o + 2];
          out[oi + 1] = bytes[o + 1];
          out[oi + 2] = bytes[o];
          out[oi + 3] = bytes[o + 3];
          break;
        case 'xrgb8888':
          out[oi] = bytes[o + 2];
          out[oi + 1] = bytes[o + 1];
          out[oi + 2] = bytes[o];
          out[oi + 3] = 255;
          break;
      }
    }
  }
  const notes: string[] = [];
  if (format.id === 'rgb565' && format.supportsChroma) applyChromaPreview(out, width, height, notes);
  return { ok: true, result: { image: { width, height, data: out, sourceName: '' }, notes } };
}

function decodeRgb565A8(input: DecodeInput): DecodeOutcome {
  const { width, height, bytes } = input;
  const n = width * height;
  if (bytes.length < n * 3) {
    return { ok: false, error: `RGB565A8 data too short: need ${n * 3} bytes (color plane + alpha plane), got ${bytes.length}.` };
  }
  const out = makeRgba(width, height);
  for (let i = 0; i < n; i++) {
    const [r, g, b] = unpackRgb565(bytes[i * 2], bytes[i * 2 + 1]);
    const a = bytes[n * 2 + i];
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }
  return { ok: true, result: { image: { width, height, data: out, sourceName: '' }, notes: [] } };
}

function decodeTrueColorV7V8(input: DecodeInput): DecodeOutcome {
  const { format, width, height, bytes } = input;
  const n = width * height;
  if (bytes.length % n !== 0) {
    return { ok: false, error: `True-color data length (${bytes.length} bytes) isn't an even multiple of the pixel count (${n}) — can't infer bytes-per-pixel / color depth.` };
  }
  const bytesPerPixel = bytes.length / n;
  const out = makeRgba(width, height);
  let inferredColorDepth: 16 | 32;

  if (bytesPerPixel === 2) {
    inferredColorDepth = 16;
    for (let i = 0; i < n; i++) {
      const [r, g, b] = unpackRgb565(bytes[i * 2], bytes[i * 2 + 1]);
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
  } else if (bytesPerPixel === 3) {
    inferredColorDepth = 16;
    for (let i = 0; i < n; i++) {
      const [r, g, b] = unpackRgb565(bytes[i * 3], bytes[i * 3 + 1]);
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = bytes[i * 3 + 2];
    }
  } else if (bytesPerPixel === 4) {
    inferredColorDepth = 32;
    const withAlpha = format.id === 'true_color_alpha';
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      out[o] = bytes[o + 2];
      out[o + 1] = bytes[o + 1];
      out[o + 2] = bytes[o];
      out[o + 3] = withAlpha ? bytes[o + 3] : 255;
    }
  } else {
    return { ok: false, error: `Unexpected ${bytesPerPixel} bytes/pixel for true-color data — doesn't match a 16-bit (2-3 bytes/px) or 32-bit (4 bytes/px) LV_COLOR_DEPTH packing.` };
  }

  const notes: string[] = [`Color depth (${inferredColorDepth}-bit) was inferred from data size ÷ pixel count — v7/v8 true-color formats don't record LV_COLOR_DEPTH anywhere in the file itself.`];
  if (format.id === 'true_color_chroma') applyChromaPreview(out, width, height, notes);

  return { ok: true, result: { image: { width, height, data: out, sourceName: '' }, inferredColorDepth, notes } };
}

/** Decodes packed pixel bytes (as extracted from a .c array or .bin file) back to RGBA,
 * given an already-resolved color format. Raw CF_RAW / CF_RAW_ALPHA / CF_RAW_CHROMA passthrough
 * formats aren't handled here — see decodeRawPassthrough, since those bytes are an original
 * compressed image file, not packed pixel data. */
export function decodeImageBytes(input: DecodeInput): DecodeOutcome {
  const { format, width, height } = input;
  if (width <= 0 || height <= 0) {
    return { ok: false, error: `Invalid dimensions ${width}x${height}.` };
  }
  switch (format.category) {
    case 'indexed':
      return decodeIndexed(input);
    case 'alpha':
      return decodeAlpha(input);
    case 'grayscale':
      return decodeGrayscale(input);
    case 'trueColor':
      if (format.id === 'rgb565a8') return decodeRgb565A8(input);
      if (['rgb565', 'rgb888', 'argb8888', 'xrgb8888'].includes(format.id)) return decodeV9TrueColor(input);
      return decodeTrueColorV7V8(input);
    default:
      return { ok: false, error: `Unhandled color format category '${format.category}'.` };
  }
}

/** CF_RAW / CF_RAW_ALPHA / CF_RAW_CHROMA formats embed an original compressed image file
 * (e.g. PNG/JPEG bytes) verbatim — decoding means handing those bytes to the browser's
 * native image decoder, not unpacking a pixel format. */
export async function decodeRawPassthrough(bytes: Uint8Array): Promise<DecodeOutcome> {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>]);
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Browser could not decode the embedded bytes as an image (unsupported or corrupted passthrough payload).'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return {
      ok: true,
      result: {
        image: { width: canvas.width, height: canvas.height, data, sourceName: '' },
        notes: ['Raw passthrough: decoded by handing the embedded bytes to the browser’s own image decoder, since CF_RAW* formats store the original compressed file verbatim.'],
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    URL.revokeObjectURL(url);
  }
}
