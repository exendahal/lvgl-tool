import type { LvglVersion } from '../lib/types';

export interface ParsedCSource {
  /** Best guess only — v7 and v8 share an identical struct/macro surface, so this tool can't
   * tell them apart from the source text alone. Defaults to 'v8'; let the user override. */
  versionGuess: LvglVersion;
  versionAmbiguous: boolean;
  macro: string;
  width: number;
  height: number;
  /** Present only when the source used the v9 lv_image_dsc_t / lv_image_header_t shape. */
  stride?: number;
  bytes: Uint8Array;
  arrayVariableName: string;
}

export type ParseResult = { ok: true; parsed: ParsedCSource } | { ok: false; error: string };

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function extractByteArray(src: string): { name: string; bytes: Uint8Array } | null {
  const match = src.match(/uint8_t\s+(\w+)\s*\[\]\s*=\s*\{([\s\S]*?)\}\s*;/);
  if (!match) return null;
  const [, name, body] = match;
  const cleanBody = stripComments(body);
  const tokens = cleanBody.match(/0[xX][0-9a-fA-F]+|\d+/g);
  if (!tokens || tokens.length === 0) return null;
  const bytes = Uint8Array.from(tokens.map((t) => Number(t) & 0xff));
  return { name, bytes };
}

function extractField(src: string, path: string): number | undefined {
  const re = new RegExp(`\\.${path.replace('.', '\\.')}\\s*=\\s*(\\d+)`);
  const m = src.match(re);
  return m ? Number(m[1]) : undefined;
}

function extractMacro(src: string): string | undefined {
  const m = src.match(/\.header\.cf\s*=\s*([A-Za-z0-9_]+)/);
  return m ? m[1] : undefined;
}

/** Parses a pasted/uploaded LVGL image .c source (this tool's own output, the official
 * lvgl.io converter's output, or lv_img_conv/LVGLImage.py output — all follow the same
 * `.header.*` initializer convention) into structural fields, without needing a full C parser. */
export function parseImageCSource(src: string): ParseResult {
  const cleaned = stripComments(src);

  const isV9 = /lv_image_dsc_t\s+\w+\s*=/.test(cleaned) || /\.header\.magic\s*=/.test(cleaned);
  const isV7V8 = /lv_img_dsc_t\s+\w+\s*=/.test(cleaned);
  if (!isV9 && !isV7V8) {
    return { ok: false, error: "Doesn't match a recognized lv_img_dsc_t (v7/v8) or lv_image_dsc_t (v9) initializer — is this really an LVGL image source file?" };
  }

  const arr = extractByteArray(cleaned);
  if (!arr) {
    return { ok: false, error: 'Could not find a `uint8_t ...[] = { ... };` pixel data array in the source.' };
  }

  const macro = extractMacro(cleaned);
  if (!macro) {
    return { ok: false, error: 'Could not find a `.header.cf = LV_..._CF_*` (or LV_COLOR_FORMAT_*) field — header initializer looks malformed or uses an unrecognized layout.' };
  }

  const width = extractField(cleaned, 'header.w');
  const height = extractField(cleaned, 'header.h');
  if (width === undefined || height === undefined) {
    return { ok: false, error: 'Could not find `.header.w` / `.header.h` dimension fields.' };
  }

  const stride = isV9 ? extractField(cleaned, 'header.stride') : undefined;

  return {
    ok: true,
    parsed: {
      versionGuess: isV9 ? 'v9' : 'v8',
      versionAmbiguous: !isV9,
      macro,
      width,
      height,
      stride,
      bytes: arr.bytes,
      arrayVariableName: arr.name,
    },
  };
}
