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
