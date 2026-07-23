import type { BinaryRawVariant, ColorFormatDef, DecodedImage } from '../lib/types';
import { ByteWriter } from '../lib/bytes';

/**
 * Raw binary dumps have no LVGL struct wrapper — they're plain pixel data for direct
 * flashing or for an app that parses its own header. Byte order here is the straightforward
 * per-channel order named by the variant (R,G,B / R,G,B565), NOT the lv_color32_t BGRA
 * order used internally by the C-array true-color path in formats.ts.
 */
export function encodeBinaryRaw(image: DecodedImage, variant: BinaryRawVariant): Uint8Array {
  const { width, height, data } = image;
  const w = new ByteWriter();
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    switch (variant) {
      case 'RGB332': {
        const v = (r & 0xe0) | ((g & 0xe0) >> 3) | (b >> 6);
        w.u8(v);
        break;
      }
      case 'RGB565': {
        const v = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
        w.u16le(v);
        break;
      }
      case 'RGB565_SWAPPED': {
        const v = ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
        w.u16be(v);
        break;
      }
      case 'RGB888':
        w.u8(r);
        w.u8(g);
        w.u8(b);
        break;
    }
  }
  return w.toUint8Array();
}

/**
 * v9 LV_FS-loadable .bin: a 12-byte lv_image_header_t (magic, cf, flags, w, h, stride)
 * followed directly by the packed pixel data (palette prefixed, if indexed).
 *
 * NOTE: LV_IMAGE_HEADER_MAGIC is taken as 0x19 per the LVGL v9 sources at time of writing.
 * This constant is load-bearing for LVGL's file-system image loader to accept the file —
 * verify it against the exact LVGL point release you're targeting before relying on this
 * output in production, since magic/header details can shift between minor versions.
 */
export const LV_IMAGE_HEADER_MAGIC = 0x19;

export function encodeV9Bin(format: ColorFormatDef, width: number, height: number, stride: number, combinedData: Uint8Array): Uint8Array {
  const w = new ByteWriter();
  const cfValue = COLOR_FORMAT_NUMERIC[format.id];
  if (cfValue === undefined) {
    throw new Error(`No numeric LV_COLOR_FORMAT_* value known for '${format.id}' — cannot emit a .bin header.`);
  }
  w.u8(LV_IMAGE_HEADER_MAGIC);
  w.u8(cfValue);
  w.u16le(0); // flags
  w.u16le(width);
  w.u16le(height);
  w.u16le(stride);
  w.u16le(0); // reserved
  w.bytes(combinedData);
  return w.toUint8Array();
}

/**
 * Numeric LV_COLOR_FORMAT_* values for v9, needed only for the binary .bin header (the
 * C-array output instead emits the macro name and lets the compiler resolve it, which is
 * the safer path — see encodeCArray.ts). Cross-check against lv_color.h for the exact
 * LVGL point release before trusting a generated .bin in production.
 */
export const COLOR_FORMAT_NUMERIC: Record<string, number> = {
  rgb565: 0x12,
  rgb888: 0x0f,
  argb8888: 0x10,
  xrgb8888: 0x11,
  indexed_1bit: 0x20,
  indexed_2bit: 0x21,
  indexed_4bit: 0x22,
  indexed_8bit: 0x23,
  l8: 0x06,
  a8: 0x0e,
};
