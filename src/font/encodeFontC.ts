import { packRowAlignedBits } from '../lib/bitpack';
import { bytesToCArrayBody, toCIdentifier } from '../lib/bytes';
import type { FontBuildResult } from './types';

/**
 * Emits a single version-adaptive .c file, mirroring how the official lv_font_conv tool itself
 * targets v7/v8/v9 simultaneously: LVGL's own headers expose LV_VERSION_CHECK(...), so one
 * generated file can guard the fields that only exist from v8 onward (kern_classes/cache/
 * fallback/user_data) rather than needing three hand-diverged struct emitters like the image
 * path does (where v9 truly replaced the struct, unlike fonts).
 *
 * CONFIDENCE NOTE: the overall shape here (glyph_dsc fields, adv_w as 1/16px fixed point, the
 * sparse cmap struct, font_dsc/lv_font_t field names) is based on this tool's best recollection
 * of lv_font_fmt_txt.h and matches real lv_font_conv output closely, but the exact cmap struct
 * field names/types (LV_FONT_FMT_TXT_CMAP_SPARSE_FULL vs _TINY, its member types) have NOT been
 * verified against a specific LVGL source checkout in this environment. If glyphs render as
 * blank boxes or wrong characters, check the cmap section first against your LVGL point release.
 */
export function generateFontCFile(result: FontBuildResult): { c: string; h: string } {
  const varName = toCIdentifier(result.variableName, 'font');
  const guardMacro = `${varName.toUpperCase()}_INCLUDED`;

  const bitmapChunks: Uint8Array[] = [];
  let runningOffset = 0;
  const glyphDscEntries: string[] = ['    {.bitmap_index = 0, .adv_w = 0, .box_w = 0, .box_h = 0, .ofs_x = 0, .ofs_y = 0} /* id = 0 reserved (.notdef) */,'];

  result.glyphs.forEach((g) => {
    let packed: Uint8Array = new Uint8Array(0);
    if (g.boxW > 0 && g.boxH > 0) {
      packed = packRowAlignedBits(g.bppLevels, g.boxW, g.boxH, result.bpp).data;
    }
    const advW16 = Math.round(g.advWPx * 16);
    glyphDscEntries.push(`    {.bitmap_index = ${runningOffset}, .adv_w = ${advW16}, .box_w = ${g.boxW}, .box_h = ${g.boxH}, .ofs_x = ${g.ofsX}, .ofs_y = ${g.ofsY}},`);
    bitmapChunks.push(packed);
    runningOffset += packed.length;
  });

  const totalBitmapBytes = new Uint8Array(runningOffset);
  {
    let o = 0;
    for (const chunk of bitmapChunks) {
      totalBitmapBytes.set(chunk, o);
      o += chunk.length;
    }
  }

  // Sparse cmap: works for any combination of contiguous ranges + arbitrary explicit codepoints
  // (the PRD's "range + symbol list, combinable" requirement), at the cost of a bit more size
  // than the contiguous-range-optimized cmap format the official tool picks when it can.
  const codepoints = result.glyphs.map((g) => g.codepoint);
  const rangeStart = codepoints.length ? Math.min(...codepoints) : 0;
  const rangeEnd = codepoints.length ? Math.max(...codepoints) : 0;
  const unicodeDeltas = codepoints.map((cp) => cp - rangeStart);
  const glyphIdOffsets = result.glyphs.map((_, i) => i + 1 - 1); // glyph_id_start = 1, so offset = index

  const kernSection = buildKernSection(varName, result);

  const c = `${includeGuard(varName)}
#if ${guardMacro}

/*-----------------
 *    BITMAPS
 *----------------*/

static const uint8_t ${varName}_glyph_bitmap[] = {
${bytesToCArrayBody(totalBitmapBytes)}
};

/*---------------------
 *  GLYPH DESCRIPTION
 *--------------------*/

static const lv_font_fmt_txt_glyph_dsc_t ${varName}_glyph_dsc[] = {
${glyphDscEntries.join('\n')}
};

/*---------------------
 *  CHARACTER MAPPING
 *--------------------*/

static const uint16_t ${varName}_unicode_list[] = {
${wrapNumberList(unicodeDeltas)}
};

static const uint16_t ${varName}_glyph_id_ofs_list[] = {
${glyphIdOffsets.map((v) => '    ' + v).join(',\n')}
};

static const lv_font_fmt_txt_cmap_t ${varName}_cmaps[] = {
    {
        .range_start = ${rangeStart},
        .range_length = ${rangeEnd - rangeStart + 1},
        .glyph_id_start = 1,
        .unicode_list = ${varName}_unicode_list,
        .glyph_id_ofs_list = ${varName}_glyph_id_ofs_list,
        .list_length = ${codepoints.length},
        .type = LV_FONT_FMT_TXT_CMAP_SPARSE_FULL
    }
};

${kernSection.declaration}

/*--------------------
 *  ALL CUSTOM DATA
 *--------------------*/

#if LV_VERSION_CHECK(8, 0, 0)
static lv_font_fmt_txt_glyph_cache_t ${varName}_cache;
#endif

static const lv_font_fmt_txt_dsc_t ${varName}_dsc = {
    .glyph_bitmap = ${varName}_glyph_bitmap,
    .glyph_dsc = ${varName}_glyph_dsc,
    .cmaps = ${varName}_cmaps,
    .kern_dsc = ${kernSection.kernDscRef},
    .kern_scale = 16,
    .cmap_num = 1,
    .bpp = ${result.bpp},
    .kern_classes = 0,
    .bitmap_format = 0,
#if LV_VERSION_CHECK(8, 0, 0)
    .cache = &${varName}_cache
#endif
};

/*-----------------
 *  PUBLIC FONT
 *----------------*/

const lv_font_t ${varName} = {
    .get_glyph_dsc = lv_font_get_glyph_dsc_fmt_txt,
    .get_glyph_bitmap = lv_font_get_bitmap_fmt_txt,
    .line_height = ${result.lineHeight},
    .base_line = ${result.baseLine},
#if !(LVGL_VERSION_MAJOR == 6 && LVGL_VERSION_MINOR == 0)
    .subpx = LV_FONT_SUBPX_NONE,
#endif
#if LV_VERSION_CHECK(7, 4, 0) || LVGL_VERSION_MAJOR >= 8
    .underline_position = ${-Math.max(1, Math.round(result.sizePx * 0.08))},
    .underline_thickness = ${Math.max(1, Math.round(result.sizePx * 0.05))},
#endif
    .dsc = &${varName}_dsc,
#if LV_VERSION_CHECK(8, 0, 0)
    .fallback = ${result.fallbackVarName ? `&${toCIdentifier(result.fallbackVarName)}` : 'NULL'},
    .user_data = NULL,
#endif
};

#endif /*${guardMacro}*/
`;

  const h = `#ifndef ${varName.toUpperCase()}_H
#define ${varName.toUpperCase()}_H

#ifdef __cplusplus
extern "C" {
#endif

#include "lvgl.h"

extern const lv_font_t ${varName};

#ifdef __cplusplus
}
#endif

#endif /*${varName.toUpperCase()}_H*/
`;

  return { c, h };
}

function wrapNumberList(values: number[], perLine = 16): string {
  const lines: string[] = [];
  for (let i = 0; i < values.length; i += perLine) {
    lines.push('    ' + values.slice(i, i + perLine).join(', ') + ',');
  }
  return lines.join('\n');
}

function includeGuard(varName: string): string {
  return `#ifdef __has_include
    #if __has_include("lvgl.h")
        #include "lvgl.h"
    #else
        #include "lvgl/lvgl.h"
    #endif
#else
    #include "lvgl/lvgl.h"
#endif

#ifndef ${varName.toUpperCase()}_INCLUDED
#define ${varName.toUpperCase()}_INCLUDED 1
#endif
`;
}

function buildKernSection(varName: string, result: FontBuildResult): { declaration: string; kernDscRef: string } {
  if (result.kernPairs.length === 0) {
    return { declaration: '/* No kerning data (disabled, or the source font has no kern/GPOS table for the selected glyphs). */', kernDscRef: 'NULL' };
  }
  const ids: number[] = [];
  const values: number[] = [];
  for (const kp of result.kernPairs) {
    ids.push(kp.leftGlyphId, kp.rightGlyphId);
    values.push(Math.round(kp.valuePx * 16));
  }
  // NOTE: glyph_ids uses uint16_t unconditionally (rather than the official tool's uint8_t/
  // uint16_t auto-selection via glyph_ids_size) to avoid silently truncating glyph ids past 255
  // for larger combined ranges. Whether `.glyph_ids_size` should be 0 or 1 to match a uint16_t
  // array is one of this section's unverified details — see the confidence note above.
  const declaration = `/*-----------------
 *    KERNING
 *----------------*/

static const uint16_t ${varName}_kern_pair_glyph_ids[] = {
${ids.map((v) => '    ' + v).join(',\n')}
};

static const int16_t ${varName}_kern_pair_values[] = {
${values.map((v) => '    ' + v).join(',\n')}
};

static const lv_font_fmt_txt_kern_pair_t ${varName}_kern_pairs = {
    .glyph_ids = ${varName}_kern_pair_glyph_ids,
    .values = ${varName}_kern_pair_values,
    .pair_cnt = ${result.kernPairs.length},
    .glyph_ids_size = 1
};`;
  return { declaration, kernDscRef: `&${varName}_kern_pairs` };
}
