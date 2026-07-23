import { COLOR_FORMAT_NUMERIC, LV_IMAGE_HEADER_MAGIC } from '../image/encodeBinary';

export interface ParsedBin9 {
  formatId: string;
  width: number;
  height: number;
  stride: number;
  bytes: Uint8Array;
}

export type ParseBinResult = { ok: true; parsed: ParsedBin9 } | { ok: false; error: string };

const NUMERIC_TO_FORMAT_ID: Record<number, string> = Object.fromEntries(Object.entries(COLOR_FORMAT_NUMERIC).map(([id, num]) => [num, id]));

/**
 * Parses a v9 LV_FS-loadable .bin: 12-byte lv_image_header_t (magic, cf, flags, w, h, stride,
 * reserved) followed by the pixel data. See encodeBinary.ts for the caveat on the exact magic
 * and numeric LV_COLOR_FORMAT_* values used here — cross-check against your LVGL point release.
 */
export function parseBin9(buf: Uint8Array): ParseBinResult {
  if (buf.length < 12) {
    return { ok: false, error: 'File is too short to contain a 12-byte v9 image header.' };
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = view.getUint8(0);
  if (magic !== LV_IMAGE_HEADER_MAGIC) {
    return { ok: false, error: `Header magic byte 0x${magic.toString(16)} doesn't match the expected v9 magic (0x${LV_IMAGE_HEADER_MAGIC.toString(16)}) — this may not be a v9 image .bin, or uses a different LVGL point release's header layout.` };
  }
  const cfNumeric = view.getUint8(1);
  const formatId = NUMERIC_TO_FORMAT_ID[cfNumeric];
  if (!formatId) {
    return { ok: false, error: `Unrecognized numeric color format 0x${cfNumeric.toString(16)} in header — doesn't match any LV_COLOR_FORMAT_* value this tool knows.` };
  }
  const width = view.getUint16(4, true);
  const height = view.getUint16(6, true);
  const stride = view.getUint16(8, true);
  const bytes = buf.slice(12);
  return { ok: true, parsed: { formatId, width, height, stride, bytes } };
}
