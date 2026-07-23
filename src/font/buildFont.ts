import type { LvglVersion } from '../lib/types';
import { loadOpentypeFont, hasGlyph, getKerningPx, getFontMetricsPx } from './parseFont';
import { registerCanvasFont, unregisterCanvasFont, rasterizeGlyph, quantizeCoverageToBpp } from './rasterize';
import type { FontBuildResult, GlyphEntry, KernPair } from './types';

export interface FontSource {
  bytes: ArrayBuffer;
}

export interface BuildFontOptions {
  version: LvglVersion;
  variableName: string;
  sizePx: number;
  bpp: 1 | 2 | 4 | 8;
  letterSpacingPx: number;
  kerningEnabled: boolean;
  fallbackVarName?: string;
  codepoints: number[];
  primary: FontSource;
  /** Optional second source used to fill glyphs missing from the primary font (PRD: "merge
   * multiple source fonts into one output" / base font + icon font pattern). */
  mergeSource?: FontSource;
}

export interface BuildFontReport {
  result: FontBuildResult;
  missingCodepoints: number[];
  kerningSkippedReason?: string;
}

/** Above this glyph count, kerning-pair enumeration (an O(n^2) query over the font's own
 * kern/GPOS tables) is skipped to keep client-side conversion from hanging the tab. */
const KERNING_GLYPH_LIMIT = 500;

export async function buildFont(opts: BuildFontOptions): Promise<BuildFontReport> {
  const primaryFont = await loadOpentypeFont(opts.primary.bytes);
  const primaryCanvas = await registerCanvasFont(opts.primary.bytes);

  let mergeFont: Awaited<ReturnType<typeof loadOpentypeFont>> | undefined;
  let mergeCanvas: Awaited<ReturnType<typeof registerCanvasFont>> | undefined;
  if (opts.mergeSource) {
    mergeFont = await loadOpentypeFont(opts.mergeSource.bytes);
    mergeCanvas = await registerCanvasFont(opts.mergeSource.bytes);
  }

  try {
    const glyphs: GlyphEntry[] = [];
    const missingCodepoints: number[] = [];
    const sortedCodepoints = [...new Set(opts.codepoints)].sort((a, b) => a - b);

    for (const cp of sortedCodepoints) {
      let font = primaryFont;
      let family = primaryCanvas.family;
      if (!hasGlyph(primaryFont, cp)) {
        if (mergeFont && hasGlyph(mergeFont, cp)) {
          font = mergeFont;
          family = mergeCanvas!.family;
        } else {
          missingCodepoints.push(cp);
          continue;
        }
      }
      const raster = rasterizeGlyph(family, font, cp, opts.sizePx);
      glyphs.push({
        codepoint: cp,
        boxW: raster.boxW,
        boxH: raster.boxH,
        ofsX: raster.ofsX,
        ofsY: raster.ofsY,
        advWPx: raster.advanceWidthPx + opts.letterSpacingPx,
        bppLevels: quantizeCoverageToBpp(raster.coverage, opts.bpp),
      });
    }

    let kernPairs: KernPair[] = [];
    let kerningSkippedReason: string | undefined;
    if (opts.kerningEnabled) {
      if (glyphs.length > KERNING_GLYPH_LIMIT) {
        kerningSkippedReason = `Kerning skipped: ${glyphs.length} glyphs exceeds the ${KERNING_GLYPH_LIMIT}-glyph limit for client-side pairwise kerning lookup.`;
      } else {
        kernPairs = buildKernPairs(primaryFont, glyphs, opts.sizePx);
      }
    }

    const metrics = getFontMetricsPx(primaryFont, opts.sizePx);

    const result: FontBuildResult = {
      version: opts.version,
      variableName: opts.variableName,
      sizePx: opts.sizePx,
      bpp: opts.bpp,
      lineHeight: metrics.lineHeight,
      baseLine: metrics.baseLine,
      glyphs,
      kernPairs,
      fallbackVarName: opts.fallbackVarName,
    };

    return { result, missingCodepoints, kerningSkippedReason };
  } finally {
    unregisterCanvasFont(primaryCanvas.face);
    if (mergeCanvas) unregisterCanvasFont(mergeCanvas.face);
  }
}

function buildKernPairs(font: Awaited<ReturnType<typeof loadOpentypeFont>>, glyphs: GlyphEntry[], sizePx: number): KernPair[] {
  const pairs: KernPair[] = [];
  for (let li = 0; li < glyphs.length; li++) {
    for (let ri = 0; ri < glyphs.length; ri++) {
      if (li === ri) continue;
      const valuePx = getKerningPx(font, glyphs[li].codepoint, glyphs[ri].codepoint, sizePx);
      if (valuePx !== 0) {
        pairs.push({ leftGlyphId: li + 1, rightGlyphId: ri + 1, valuePx });
      }
    }
  }
  return pairs;
}
