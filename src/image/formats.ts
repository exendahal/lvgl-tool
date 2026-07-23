import type { ColorFormatDef, DecodedImage, EncodedPixels } from '../lib/types';
import { ByteWriter } from '../lib/bytes';
import { ditherToPalette, ditherUniform } from '../lib/dither';
import { buildPalette, nearestPaletteIndex, type PaletteEntry } from '../lib/quantize';

export interface PackOptions {
  colorDepth: 16 | 32;
  dithering: boolean;
}

/**
 * Byte order for all multi-byte true-color / palette entries in this tool is [B, G, R, (A)],
 * i.e. the little-endian byte layout of a 0xAARRGGBB (or 0xRRGGBB) value. This matches
 * lv_color32_t's field order in the LVGL C sources and is applied consistently across the
 * v7/v8 32-bit true-color path, v7/v8/v9 indexed palettes, and v9's ARGB8888/XRGB8888 formats.
 */
function packRgb565(r: number, g: number, b: number): [lo: number, hi: number] {
  const v = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
  return [v & 0xff, (v >>> 8) & 0xff];
}

function packRowAlignedBits(values: ArrayLike<number>, width: number, height: number, bpp: number): { data: Uint8Array; stride: number } {
  const stride = Math.ceil((width * bpp) / 8);
  const out = new Uint8Array(stride * height);
  const maxVal = (1 << bpp) - 1;
  for (let y = 0; y < height; y++) {
    let bitPos = 0;
    const rowOffset = y * stride;
    for (let x = 0; x < width; x++) {
      const v = values[y * width + x] & maxVal;
      const byteIdx = rowOffset + (bitPos >> 3);
      const shift = 8 - bpp - (bitPos % 8);
      out[byteIdx] |= v << shift;
      bitPos += bpp;
    }
  }
  return { data: out, stride };
}

function quantizeAlphaLevels(image: DecodedImage, bpp: number, dithering: boolean): Uint8Array {
  const levels = 1 << bpp;
  const n = image.width * image.height;
  const out = new Uint8Array(n);
  if (dithering && bpp < 8) {
    const dithered = ditherUniform(image, [255, 255, 255, levels]);
    for (let i = 0; i < n; i++) out[i] = Math.round((dithered[i * 4 + 3] / 255) * ((1 << bpp) - 1));
    return out;
  }
  const step = 255 / (levels - 1);
  for (let i = 0; i < n; i++) {
    const a = image.data[i * 4 + 3];
    out[i] = Math.round(a / step);
  }
  return out;
}

function encodeIndexed(image: DecodedImage, format: ColorFormatDef, dithering: boolean): EncodedPixels {
  const paletteSize = format.paletteSize ?? 1 << format.bpp;
  const palette = buildPalette(image, paletteSize);
  const n = image.width * image.height;
  const indices = new Uint8Array(n);
  if (dithering) {
    const d = ditherToPalette(image, palette);
    indices.set(d);
  } else {
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      indices[i] = nearestPaletteIndex(palette, image.data[o], image.data[o + 1], image.data[o + 2], image.data[o + 3]);
    }
  }
  const { data, stride } = packRowAlignedBits(indices, image.width, image.height, format.bpp);
  const paletteBytes = new Uint8Array(palette.length * 4);
  palette.forEach(([r, g, b, a]: PaletteEntry, idx: number) => {
    paletteBytes[idx * 4] = b;
    paletteBytes[idx * 4 + 1] = g;
    paletteBytes[idx * 4 + 2] = r;
    paletteBytes[idx * 4 + 3] = a;
  });
  return { data, palette: paletteBytes, stride };
}

function encodeAlphaOnly(image: DecodedImage, format: ColorFormatDef, dithering: boolean): EncodedPixels {
  const levels = quantizeAlphaLevels(image, format.bpp, dithering);
  if (format.bpp === 8) {
    return { data: levels, stride: image.width };
  }
  const { data, stride } = packRowAlignedBits(levels, image.width, image.height, format.bpp);
  return { data, stride };
}

function encodeGrayscale8(image: DecodedImage): EncodedPixels {
  const n = image.width * image.height;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[i] = Math.round(0.299 * image.data[o] + 0.587 * image.data[o + 1] + 0.114 * image.data[o + 2]);
  }
  return { data: out, stride: image.width };
}

function encodeTrueColorV7V8(image: DecodedImage, format: ColorFormatDef, opts: PackOptions): EncodedPixels {
  const { width, height, data } = image;
  const withAlpha = format.id === 'true_color_alpha';
  const w = new ByteWriter();

  const src = opts.dithering && opts.colorDepth === 16 ? ditherUniform(image, [32, 64, 32, 256]) : data;

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = src[o];
    const g = src[o + 1];
    const b = src[o + 2];
    const a = src[o + 3];
    if (opts.colorDepth === 16) {
      const [lo, hi] = packRgb565(r, g, b);
      w.u8(lo);
      w.u8(hi);
      if (withAlpha) w.u8(a);
    } else {
      w.u8(b);
      w.u8(g);
      w.u8(r);
      w.u8(withAlpha ? a : 0xff);
    }
  }
  const bytesPerPixel = opts.colorDepth === 16 ? (withAlpha ? 3 : 2) : 4;
  return { data: w.toUint8Array(), stride: width * bytesPerPixel };
}

function encodeRgb565A8(image: DecodedImage, opts: PackOptions): EncodedPixels {
  const { width, height, data } = image;
  const n = width * height;
  const colorPlane = new ByteWriter();
  const alphaPlane = new Uint8Array(n);
  const src = opts.dithering ? ditherUniform(image, [32, 64, 32, 256]) : data;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const [lo, hi] = packRgb565(src[o], src[o + 1], src[o + 2]);
    colorPlane.u8(lo);
    colorPlane.u8(hi);
    alphaPlane[i] = src[o + 3];
  }
  const combined = new Uint8Array(colorPlane.length + alphaPlane.length);
  combined.set(colorPlane.toUint8Array(), 0);
  combined.set(alphaPlane, colorPlane.length);
  return { data: combined, stride: width * 3 };
}

function encodeV9TrueColor(image: DecodedImage, format: ColorFormatDef, opts: PackOptions): EncodedPixels {
  const { width, height, data } = image;
  const w = new ByteWriter();
  const dither16 = format.id === 'rgb565' && opts.dithering;
  const src = dither16 ? ditherUniform(image, [32, 64, 32, 256]) : data;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = src[o];
    const g = src[o + 1];
    const b = src[o + 2];
    const a = src[o + 3];
    switch (format.id) {
      case 'rgb565': {
        const [lo, hi] = packRgb565(r, g, b);
        w.u8(lo);
        w.u8(hi);
        break;
      }
      case 'rgb888':
        w.u8(b);
        w.u8(g);
        w.u8(r);
        break;
      case 'argb8888':
        w.u8(b);
        w.u8(g);
        w.u8(r);
        w.u8(a);
        break;
      case 'xrgb8888':
        w.u8(b);
        w.u8(g);
        w.u8(r);
        w.u8(0x00);
        break;
    }
  }
  const bytesPerPixel = format.bpp / 8;
  return { data: w.toUint8Array(), stride: width * bytesPerPixel };
}

/** Packs a decoded RGBA image into the byte layout for the given color format. */
export function packPixels(image: DecodedImage, format: ColorFormatDef, opts: PackOptions): EncodedPixels {
  if (format.isRawPassthrough) {
    throw new Error('Raw passthrough formats must be encoded via encodeRawPassthrough(), not packPixels().');
  }
  switch (format.category) {
    case 'indexed':
      return encodeIndexed(image, format, opts.dithering);
    case 'alpha':
      return encodeAlphaOnly(image, format, opts.dithering);
    case 'grayscale':
      return encodeGrayscale8(image);
    case 'trueColor':
      if (format.id === 'rgb565a8') return encodeRgb565A8(image, opts);
      if (['rgb565', 'rgb888', 'argb8888', 'xrgb8888'].includes(format.id)) return encodeV9TrueColor(image, format, opts);
      return encodeTrueColorV7V8(image, format, opts);
    default:
      throw new Error(`Unhandled color format category: ${format.category}`);
  }
}

/** For CF_RAW / CF_RAW_ALPHA / CF_RAW_CHROMA: embed the original file bytes verbatim. */
export async function encodeRawPassthrough(file: File): Promise<EncodedPixels> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return { data: buf, stride: 0 };
}

function expandBits(value: number, bits: number): number {
  if (bits >= 8) return value;
  return (value << (8 - bits)) | (value >> (2 * bits - 8));
}

/**
 * Renders what the packed output will actually look like once quantized, by re-expanding
 * the reduced-precision values back to RGBA — so the UI can show a "this is what you'll
 * really get" preview without needing a full byte-level decoder (that's the separate,
 * later .c-import-and-inspect feature).
 */
export function buildPreviewRgba(image: DecodedImage, format: ColorFormatDef, opts: PackOptions): DecodedImage {
  const { width, height, data } = image;
  const out = new Uint8ClampedArray(data.length);

  if (format.isRawPassthrough) {
    out.set(data);
    return { width, height, data: out, sourceName: image.sourceName };
  }

  switch (format.category) {
    case 'indexed': {
      const paletteSize = format.paletteSize ?? 1 << format.bpp;
      const palette = buildPalette(image, paletteSize);
      const indices = opts.dithering ? ditherToPalette(image, palette) : new Uint8Array(width * height);
      if (!opts.dithering) {
        for (let i = 0; i < width * height; i++) {
          const o = i * 4;
          indices[i] = nearestPaletteIndex(palette, data[o], data[o + 1], data[o + 2], data[o + 3]);
        }
      }
      for (let i = 0; i < width * height; i++) {
        const [r, g, b, a] = palette[indices[i]];
        const o = i * 4;
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = a;
      }
      break;
    }
    case 'alpha': {
      const levels = 1 << format.bpp;
      const step = 255 / (levels - 1);
      for (let i = 0; i < width * height; i++) {
        const o = i * 4;
        const level = Math.round(data[o + 3] / step);
        out[o] = 255;
        out[o + 1] = 255;
        out[o + 2] = 255;
        out[o + 3] = Math.round(level * step);
      }
      break;
    }
    case 'grayscale': {
      for (let i = 0; i < width * height; i++) {
        const o = i * 4;
        const lum = Math.round(0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]);
        out[o] = lum;
        out[o + 1] = lum;
        out[o + 2] = lum;
        out[o + 3] = 255;
      }
      break;
    }
    case 'trueColor': {
      const is16 = format.id === 'rgb565' || format.id === 'rgb565a8' || (['true_color', 'true_color_alpha', 'true_color_chroma'].includes(format.id) && opts.colorDepth === 16);
      const alphaCapable = format.id === 'true_color_alpha' || format.id === 'rgb565a8' || format.id === 'argb8888';
      for (let i = 0; i < width * height; i++) {
        const o = i * 4;
        let r = data[o];
        let g = data[o + 1];
        let b = data[o + 2];
        if (is16) {
          r = expandBits((r & 0xf8) >> 3, 5);
          g = expandBits((g & 0xfc) >> 2, 6);
          b = expandBits((b & 0xf8) >> 3, 5);
        }
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = alphaCapable ? data[o + 3] : 255;
      }
      break;
    }
  }

  return { width, height, data: out, sourceName: image.sourceName };
}
