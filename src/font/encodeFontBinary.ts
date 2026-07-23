import { ByteWriter } from '../lib/bytes';
import { packRowAlignedBits } from '../lib/bitpack';
import type { FontBuildResult } from './types';

const MAGIC = 0x544e464c; // "LFNT" as little-endian u32, this tool's own marker

/**
 * A custom binary serialization of this tool's internal font representation — NOT LVGL's
 * native binary font loader format (lv_binfont_create()'s actual on-disk layout hasn't been
 * verified in this environment). Useful for round-tripping within this tool; not something
 * to feed directly to LVGL's file-system font loader without writing a matching parser.
 */
export function encodeFontBinary(result: FontBuildResult): Uint8Array {
  const w = new ByteWriter();
  w.u32le(MAGIC);
  w.u8(1); // format version of this custom binary, independent of LVGL version
  w.u16le(result.sizePx);
  w.u8(result.bpp);
  w.u16le(result.lineHeight);
  w.u16le(result.baseLine);
  w.u16le(result.glyphs.length);

  for (const g of result.glyphs) {
    w.u32le(g.codepoint);
    w.u8(g.boxW);
    w.u8(g.boxH);
    w.u8(g.ofsX & 0xff);
    w.u8(g.ofsY & 0xff);
    w.u16le(Math.round(g.advWPx * 16));
    const packed = g.boxW > 0 && g.boxH > 0 ? packRowAlignedBits(g.bppLevels, g.boxW, g.boxH, result.bpp).data : new Uint8Array(0);
    w.u16le(packed.length);
    w.bytes(packed);
  }

  w.u16le(result.kernPairs.length);
  for (const kp of result.kernPairs) {
    w.u16le(kp.leftGlyphId);
    w.u16le(kp.rightGlyphId);
    w.u16le(Math.round(kp.valuePx * 16) & 0xffff);
  }

  return w.toUint8Array();
}
