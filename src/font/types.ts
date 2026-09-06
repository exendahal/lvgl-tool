import type { LvglVersion } from '../lib/types';

export interface GlyphEntry {
  codepoint: number;
  boxW: number;
  boxH: number;
  ofsX: number;
  ofsY: number;
  /** Final advance width in pixels, including any user letter-spacing addition. */
  advWPx: number;
  /** Quantized coverage values (0..2^bpp-1), boxW*boxH, row-major — not yet bit-packed. */
  bppLevels: Uint8Array;
  /** The source font's own glyph name from its `post` table, when it has one — preview only,
   * nothing in the LVGL output uses it. */
  name?: string;
}

export interface KernPair {
  leftGlyphId: number;
  rightGlyphId: number;
  valuePx: number;
}

export interface FontBuildResult {
  version: LvglVersion;
  variableName: string;
  sizePx: number;
  bpp: 1 | 2 | 4 | 8;
  lineHeight: number;
  baseLine: number;
  /** Sorted ascending by codepoint; glyph id = index in this array + 1 (id 0 is reserved). */
  glyphs: GlyphEntry[];
  kernPairs: KernPair[];
  /** C identifier of another already-compiled lv_font_t to chain to at runtime (v8/v9 only). */
  fallbackVarName?: string;
}
