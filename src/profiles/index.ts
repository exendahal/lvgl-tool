import type { ColorFormatDef, LvglVersion } from '../lib/types';
import { V7_FORMATS } from './v7';
import { V8_FORMATS } from './v8';
import { V9_FORMATS } from './v9';

export interface VersionProfile {
  version: LvglVersion;
  label: string;
  formats: ColorFormatDef[];
  /** C struct type name used for the image descriptor. */
  structName: string;
  /** True for v9's new lv_image_dsc_t / lv_color_format_t model. */
  isV9Model: boolean;
}

export const PROFILES: Record<LvglVersion, VersionProfile> = {
  v7: { version: 'v7', label: 'LVGL v7', formats: V7_FORMATS, structName: 'lv_img_dsc_t', isV9Model: false },
  v8: { version: 'v8', label: 'LVGL v8', formats: V8_FORMATS, structName: 'lv_img_dsc_t', isV9Model: false },
  v9: { version: 'v9', label: 'LVGL v9', formats: V9_FORMATS, structName: 'lv_image_dsc_t', isV9Model: true },
};

export function getFormats(version: LvglVersion): ColorFormatDef[] {
  return PROFILES[version].formats;
}

export function findFormat(version: LvglVersion, id: string): ColorFormatDef | undefined {
  return PROFILES[version].formats.find((f) => f.id === id);
}

export { V7_FORMATS, V8_FORMATS, V9_FORMATS };
