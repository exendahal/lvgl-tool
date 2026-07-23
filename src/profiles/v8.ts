import type { ColorFormatDef } from '../lib/types';
import { V7_FORMATS } from './v7';

export const V8_FORMATS: ColorFormatDef[] = [
  ...V7_FORMATS,
  {
    id: 'rgb565a8',
    label: 'RGB565 + separate A8 alpha plane',
    macro: 'LV_IMG_CF_RGB565A8',
    category: 'trueColor',
    bpp: 24, // 16bpp color plane + 8bpp alpha plane, packed as two concatenated blocks
    supportsAlpha: true,
    supportsChroma: false,
  },
];
