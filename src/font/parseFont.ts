import * as opentype from 'opentype.js';

export async function loadOpentypeFont(bytes: ArrayBuffer): Promise<opentype.Font> {
  try {
    return opentype.parse(bytes);
  } catch (err) {
    throw new Error(`Could not parse font file: ${(err as Error).message}`);
  }
}

/** A codepoint with no glyph in the font resolves to glyph index 0 (.notdef). */
export function hasGlyph(font: opentype.Font, codepoint: number): boolean {
  return font.charToGlyphIndex(String.fromCodePoint(codepoint)) !== 0;
}

/** The glyph's name as the font itself records it (`post` table). Absent for format-3 `post`
 * tables, which store no names at all, and skipped when it is just the .notdef placeholder. */
export function getGlyphName(font: opentype.Font, codepoint: number): string | undefined {
  const name = font.charToGlyph(String.fromCodePoint(codepoint)).name;
  return name && name !== '.notdef' ? name : undefined;
}

export function getAdvanceWidthPx(font: opentype.Font, codepoint: number, sizePx: number): number {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  const scale = sizePx / font.unitsPerEm;
  return (glyph.advanceWidth ?? 0) * scale;
}

/**
 * Reads the font's own kerning data (legacy 'kern' table or GPOS pair adjustments — opentype.js's
 * getKerningValue checks both) for a left/right glyph pair, scaled to the target pixel size.
 */
export function getKerningPx(font: opentype.Font, leftCodepoint: number, rightCodepoint: number, sizePx: number): number {
  const left = font.charToGlyph(String.fromCodePoint(leftCodepoint));
  const right = font.charToGlyph(String.fromCodePoint(rightCodepoint));
  const scale = sizePx / font.unitsPerEm;
  return font.getKerningValue(left, right) * scale;
}

export interface FontMetricsPx {
  ascender: number;
  descender: number;
  lineHeight: number;
  baseLine: number;
}

export function getFontMetricsPx(font: opentype.Font, sizePx: number): FontMetricsPx {
  const scale = sizePx / font.unitsPerEm;
  const ascender = font.ascender * scale;
  const descender = font.descender * scale;
  return {
    ascender,
    descender,
    lineHeight: Math.round(ascender - descender),
    baseLine: Math.round(-descender),
  };
}

/**
 * Every code point the font's cmap actually maps. Icon fonts put their glyphs wherever they like
 * (F000+ for stock Font Awesome, arbitrary ASCII/Latin-1 slots for many subsets), so asking the
 * user to type the right Unicode range by hand is how most of a font's icons end up missing from
 * the output. Control code points are excluded: canvas fillText draws nothing for them, so they
 * would only add empty glyphs to the font.
 */
export function listFontCodepoints(font: opentype.Font): number[] {
  const map: Record<string, number> = font.tables.cmap?.glyphIndexMap ?? {};
  return Object.keys(map)
    .map(Number)
    .filter((cp) => cp >= 0x20 && cp !== 0x7f && map[cp] !== 0)
    .sort((a, b) => a - b);
}
