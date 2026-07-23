import { unpackRowAlignedBits } from '../lib/bitpack';

export interface DecodedFontGlyph {
  codepoint: number;
  boxW: number;
  boxH: number;
  ofsX: number;
  ofsY: number;
  advWPx: number;
  /** 0..2^bpp-1 coverage levels, row-major, boxW*boxH. */
  levels: Uint8Array;
}

export interface DecodedFont {
  bpp: number;
  lineHeight?: number;
  baseLine?: number;
  kerningPresent: boolean;
  glyphBitmapByteSize: number;
  glyphs: DecodedFontGlyph[];
  /** Fonts didn't get a wholesale struct replacement across v7/v8/v9 the way images did (the
   * core glyph_dsc/cmap/bitmap layout is shared), so unlike the image importer this is mostly
   * informational rather than something decoding actually depends on. */
  versionNote: string;
}

export type ParseFontResult = { ok: true; font: DecodedFont } | { ok: false; error: string };

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function extractNamedArray(src: string, typeKeyword: string, name: string): string | null {
  const re = new RegExp(`${typeKeyword}\\s+${name}\\s*\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function numberTokens(body: string): number[] {
  const tokens = body.match(/-?0[xX][0-9a-fA-F]+|-?\d+/g);
  return tokens ? tokens.map(Number) : [];
}

function extractReferencedName(src: string, field: string): string | null {
  const m = src.match(new RegExp(`\\.${field}\\s*=\\s*&?(\\w+)`));
  if (!m) return null;
  return m[1] === 'NULL' ? null : m[1];
}

/**
 * Parses an LVGL font .c source (this tool's own output, or the official lv_font_conv tool's
 * output — both follow the same lv_font_fmt_txt_* field-name convention) into a version-
 * independent glyph list, without needing the original TTF/OTF.
 *
 * CONFIDENCE NOTE: contiguous-range cmaps (FORMAT0, the common case for a plain ASCII/Latin
 * font) are handled with high confidence. Sparse cmaps (combined ranges + explicit symbol
 * lists) rely on this tool's own unverified recollection of lv_font_fmt_txt_cmap_t's sparse
 * variant — see the Format Reference tab.
 */
export function parseFontCSource(src: string): ParseFontResult {
  const cleaned = stripComments(src);

  const dscMatch = cleaned.match(/lv_font_fmt_txt_dsc_t\s+(\w+)\s*=\s*\{([\s\S]*?)\};/);
  if (!dscMatch) {
    return { ok: false, error: "Could not find an `lv_font_fmt_txt_dsc_t ... = { ... };` block — doesn't look like a recognized LVGL font source." };
  }
  const dscBody = dscMatch[2];

  const bitmapName = extractReferencedName(dscBody, 'glyph_bitmap');
  const glyphDscName = extractReferencedName(dscBody, 'glyph_dsc');
  const cmapsName = extractReferencedName(dscBody, 'cmaps');
  const bppMatch = dscBody.match(/\.bpp\s*=\s*(\d+)/);
  if (!bitmapName || !glyphDscName || !cmapsName || !bppMatch) {
    return { ok: false, error: 'font_dsc block is missing one of .glyph_bitmap / .glyph_dsc / .cmaps / .bpp — unrecognized or malformed layout.' };
  }
  const bpp = Number(bppMatch[1]);
  const kernDscRef = dscBody.match(/\.kern_dsc\s*=\s*(\w+)/);
  const kerningPresent = !!kernDscRef && kernDscRef[1] !== 'NULL';

  const bitmapBody = extractNamedArray(cleaned, 'uint8_t', bitmapName);
  if (bitmapBody === null) {
    return { ok: false, error: `Could not find the referenced bitmap array \`${bitmapName}\`.` };
  }
  const bitmapBytes = Uint8Array.from(numberTokens(bitmapBody).map((n) => n & 0xff));

  const glyphDscBody = extractNamedArray(cleaned, 'lv_font_fmt_txt_glyph_dsc_t', glyphDscName);
  if (glyphDscBody === null) {
    return { ok: false, error: `Could not find the referenced glyph_dsc array \`${glyphDscName}\`.` };
  }
  const glyphDscEntries = glyphDscBody.match(/\{[^{}]*\}/g) ?? [];
  interface RawGlyphDsc {
    bitmapIndex: number;
    advW: number;
    boxW: number;
    boxH: number;
    ofsX: number;
    ofsY: number;
  }
  const rawGlyphs: RawGlyphDsc[] = [];
  for (const entry of glyphDscEntries) {
    const bi = entry.match(/\.bitmap_index\s*=\s*(\d+)/);
    const adv = entry.match(/\.adv_w\s*=\s*(-?\d+)/);
    const bw = entry.match(/\.box_w\s*=\s*(\d+)/);
    const bh = entry.match(/\.box_h\s*=\s*(\d+)/);
    const ox = entry.match(/\.ofs_x\s*=\s*(-?\d+)/);
    const oy = entry.match(/\.ofs_y\s*=\s*(-?\d+)/);
    if (!bi || !adv || !bw || !bh || !ox || !oy) continue;
    rawGlyphs.push({ bitmapIndex: Number(bi[1]), advW: Number(adv[1]), boxW: Number(bw[1]), boxH: Number(bh[1]), ofsX: Number(ox[1]), ofsY: Number(oy[1]) });
  }
  if (rawGlyphs.length === 0) {
    return { ok: false, error: 'glyph_dsc array parsed but yielded no valid entries — unrecognized field layout.' };
  }
  // Entry 0 is conventionally the reserved .notdef glyph; real glyphs start at id 1.
  const realGlyphs = rawGlyphs.slice(1);

  const cmapsBody = extractNamedArray(cleaned, 'lv_font_fmt_txt_cmap_t', cmapsName);
  if (cmapsBody === null) {
    return { ok: false, error: `Could not find the referenced cmap array \`${cmapsName}\`.` };
  }
  // A font's cmap is commonly SEVERAL disjoint entries, not one — e.g. lv_font_conv emits a
  // separate {.range_start=..., ...} entry per contiguous block (ASCII, Latin-1 Supplement,
  // one-off extra characters, LV_SYMBOL_* icons in the 0xE000+ private-use range, etc.), all
  // referencing the same top-level `cmaps` array (.cmap_num counts them). Only reading the
  // first entry — which an earlier version of this parser did — silently drops every
  // character outside that first block.
  const cmapEntries = cmapsBody.match(/\{[^{}]*\}/g) ?? [];
  if (cmapEntries.length === 0) {
    return { ok: false, error: 'cmaps array parsed but contained no {...} entries.' };
  }

  const codepointForGlyphIndex = new Map<number, number>(); // glyph array index (0-based within realGlyphs) -> codepoint
  for (const entry of cmapEntries) {
    const rangeStartMatch = entry.match(/\.range_start\s*=\s*(\d+)/);
    const rangeLengthMatch = entry.match(/\.range_length\s*=\s*(\d+)/);
    const glyphIdStartMatch = entry.match(/\.glyph_id_start\s*=\s*(\d+)/);
    if (!rangeStartMatch || !rangeLengthMatch || !glyphIdStartMatch) {
      return { ok: false, error: `A cmap entry is missing .range_start / .range_length / .glyph_id_start: ${entry.slice(0, 120)}` };
    }
    const rangeStart = Number(rangeStartMatch[1]);
    const glyphIdStart = Number(glyphIdStartMatch[1]);
    const isSparse = /SPARSE/.test(entry);

    if (isSparse) {
      const unicodeListName = extractReferencedName(entry, 'unicode_list');
      const glyphIdOfsListName = extractReferencedName(entry, 'glyph_id_ofs_list');
      if (!unicodeListName || !glyphIdOfsListName) {
        return { ok: false, error: 'Sparse cmap entry is missing .unicode_list / .glyph_id_ofs_list references.' };
      }
      const unicodeListBody = extractNamedArray(cleaned, 'uint16_t', unicodeListName);
      const ofsListBody = extractNamedArray(cleaned, 'uint16_t', glyphIdOfsListName);
      if (unicodeListBody === null || ofsListBody === null) {
        return { ok: false, error: 'Could not locate the sparse cmap unicode_list / glyph_id_ofs_list array bodies.' };
      }
      const deltas = numberTokens(unicodeListBody);
      const glyphOfs = numberTokens(ofsListBody);
      for (let i = 0; i < deltas.length; i++) {
        const codepoint = rangeStart + deltas[i];
        const glyphId = glyphIdStart + (glyphOfs[i] ?? i);
        codepointForGlyphIndex.set(glyphId - 1, codepoint);
      }
    } else {
      const rangeLength = Number(rangeLengthMatch[1]);
      for (let i = 0; i < rangeLength; i++) {
        const glyphId = glyphIdStart + i;
        codepointForGlyphIndex.set(glyphId - 1, rangeStart + i);
      }
    }
  }

  const glyphs: DecodedFontGlyph[] = [];
  realGlyphs.forEach((g, idx) => {
    const codepoint = codepointForGlyphIndex.get(idx);
    if (codepoint === undefined) return;
    let levels: Uint8Array = new Uint8Array(0);
    if (g.boxW > 0 && g.boxH > 0) {
      const byteLen = Math.ceil((g.boxW * bpp) / 8) * g.boxH;
      const slice = bitmapBytes.slice(g.bitmapIndex, g.bitmapIndex + byteLen);
      levels = unpackRowAlignedBits(slice, g.boxW, g.boxH, bpp);
    }
    glyphs.push({ codepoint, boxW: g.boxW, boxH: g.boxH, ofsX: g.ofsX, ofsY: g.ofsY, advWPx: g.advW / 16, levels });
  });

  if (glyphs.length === 0) {
    return { ok: false, error: 'Parsed the font structure but could not resolve any codepoint → glyph mapping — cmap format may be unrecognized.' };
  }

  const outerMatch = cleaned.match(/lv_font_t\s+\w+\s*=\s*\{([\s\S]*?)\};/);
  const lineHeightMatch = outerMatch?.[1].match(/\.line_height\s*=\s*(\d+)/);
  const baseLineMatch = outerMatch?.[1].match(/\.base_line\s*=\s*(\d+)/);

  return {
    ok: true,
    font: {
      bpp,
      lineHeight: lineHeightMatch ? Number(lineHeightMatch[1]) : undefined,
      baseLine: baseLineMatch ? Number(baseLineMatch[1]) : undefined,
      kerningPresent,
      glyphBitmapByteSize: bitmapBytes.length,
      glyphs,
      versionNote: 'Font glyph/bitmap/cmap layout is shared across v7/v8/v9 in this tool’s architecture, so decoding does not depend on picking the right version — only kerning-table/fallback presence hints at v8+.',
    },
  };
}
