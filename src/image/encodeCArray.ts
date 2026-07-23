import type { ColorFormatDef, LvglVersion } from '../lib/types';
import { bytesToCArrayBody, toCIdentifier } from '../lib/bytes';
import { combinePixelBytes, maybeRle } from './combine';

export interface CArrayInput {
  version: LvglVersion;
  format: ColorFormatDef;
  variableName: string;
  width: number;
  height: number;
  pixelData: Uint8Array;
  paletteData?: Uint8Array;
  stride: number;
  isRawPassthrough: boolean;
  rle: boolean;
}

function includeGuardHeader(varName: string): string {
  return `#if defined(LV_LVGL_H_INCLUDE_SIMPLE)
#include "lvgl.h"
#else
#include "lvgl/lvgl.h"
#endif

#ifndef LV_ATTRIBUTE_MEM_ALIGN
#define LV_ATTRIBUTE_MEM_ALIGN
#endif

#ifndef LV_ATTRIBUTE_IMG_${varName.toUpperCase()}
#define LV_ATTRIBUTE_IMG_${varName.toUpperCase()}
#endif
`;
}

export function generateCArrayFile(input: CArrayInput): string {
  const varName = toCIdentifier(input.variableName);
  const mapName = `${varName}_map`;
  const rleApplicable = !input.isRawPassthrough && input.rle && !!input.format.supportsRle && input.version === 'v9';

  const combined = combinePixelBytes(input.paletteData, input.pixelData);
  const finalBytes = maybeRle(combined, rleApplicable);

  const parts: string[] = [includeGuardHeader(varName)];

  if (rleApplicable) {
    parts.push(
      `/* NOTE: pixel data below is RLE-compressed with this tool's own experimental scheme\n` +
        ` * (see src/lib/rle.ts) — it is NOT LVGL's native v9 on-device compression format.\n` +
        ` * Decompress with the matching decoder before handing bytes to LVGL, or disable\n` +
        ` * the RLE option when generating this asset for direct LVGL consumption. */\n`,
    );
  }

  parts.push(
    `const LV_ATTRIBUTE_MEM_ALIGN LV_ATTRIBUTE_IMG_${varName.toUpperCase()} uint8_t ${mapName}[] = {\n${bytesToCArrayBody(finalBytes)}\n};\n`,
  );

  if (input.version === 'v9') {
    parts.push(`const lv_image_dsc_t ${varName} = {
  .header.magic = LV_IMAGE_HEADER_MAGIC,
  .header.cf = ${input.format.macro},
  .header.flags = 0,
  .header.w = ${input.width},
  .header.h = ${input.height},
  .header.stride = ${input.stride},
  .data_size = sizeof(${mapName}),
  .data = ${mapName},
};
`);
  } else {
    parts.push(`const lv_img_dsc_t ${varName} = {
  .header.cf = ${input.format.macro},
  .header.always_zero = 0,
  .header.reserved = 0,
  .header.w = ${input.width},
  .header.h = ${input.height},
  .data_size = sizeof(${mapName}),
  .data = ${mapName},
};
`);
  }

  return parts.join('\n');
}
