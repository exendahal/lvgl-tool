export type LvglVersion = 'v7' | 'v8' | 'v9';

/** RGBA8888, top-left origin, row-major, straight (non-premultiplied) alpha. */
export interface DecodedImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  sourceName: string;
}

export type ColorFormatCategory = 'trueColor' | 'indexed' | 'alpha' | 'grayscale' | 'raw';

export interface ColorFormatDef {
  /** Stable id used internally and in the UI <select>. */
  id: string;
  label: string;
  /** The C macro emitted into generated code, e.g. LV_IMG_CF_TRUE_COLOR_ALPHA or LV_COLOR_FORMAT_ARGB8888. */
  macro: string;
  category: ColorFormatCategory;
  /** Bits per pixel for the packed output (palette bytes excluded for indexed formats). */
  bpp: number;
  supportsAlpha: boolean;
  supportsChroma: boolean;
  /** Indexed formats carry a palette; consumers need to know how many entries. */
  paletteSize?: number;
  /** True for the v7/v8 CF_RAW* passthrough formats, which embed the original file bytes verbatim. */
  isRawPassthrough?: boolean;
  /** v9-only: this format can optionally be RLE-compressed. */
  supportsRle?: boolean;
}

export type TransparencyMode = 'none' | 'existingAlpha' | 'colorPick' | 'chromaKey' | 'colorRange';

export interface ColorRangeSettings {
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
  /** Invert the box test: make transparent what's OUTSIDE the range instead of inside. */
  invert: boolean;
  /** Only affect near-neutral (grey/white/black) pixels — lets a background range overlap a
   * saturated icon color without punching through the icon's actual artwork. */
  greyOnly: boolean;
  /** Max pairwise channel difference (R-G, G-B, B-R) still considered "grey". */
  greyTolerance: number;
  /** Never touch pure black (0,0,0) regardless of the range/grey rules — common for icon sets
   * where black is always outline ink, never background. */
  protectPureBlack: boolean;
}

export interface TransparencySettings {
  mode: TransparencyMode;
  /** For colorPick/chromaKey: the picked color, as [r,g,b]. */
  pickedColor: [number, number, number];
  /** For colorPick: 0-255 Euclidean-ish tolerance threshold. */
  tolerance: number;
  /** Feather/despill the transparent edge by this many pixels (0 = off). */
  feather: number;
  colorRange: ColorRangeSettings;
}

export interface EncodedPixels {
  /** Packed pixel bytes in the target format (palette bytes not included). */
  data: Uint8Array;
  /** Palette entries as RGBA8888 groups of 4 bytes, present only for indexed formats. */
  palette?: Uint8Array;
  /** Bytes per row for formats where stride matters (v9). */
  stride: number;
}

export type OutputMode = 'carray' | 'binaryRaw' | 'bin9';

export type BinaryRawVariant = 'RGB332' | 'RGB565' | 'RGB565_SWAPPED' | 'RGB888';

export interface ImageConversionOptions {
  version: LvglVersion;
  colorFormatId: string;
  /** Applies only to 'trueColor' category formats in v7/v8, where LV_COLOR_DEPTH governs packing. */
  colorDepth: 16 | 32;
  dithering: boolean;
  transparency: TransparencySettings;
  variableName: string;
  outputFileName: string;
  outputMode: OutputMode;
  binaryVariant?: BinaryRawVariant;
  /** v9 only: request RLE compression when the chosen format supports it. */
  rle: boolean;
}

export interface ConversionResult {
  fileName: string;
  /** 'text' results are downloaded as UTF-8; 'binary' results are downloaded as raw bytes. */
  kind: 'text' | 'binary';
  text?: string;
  bytes?: Uint8Array;
  /** Decoded-back preview, rendered from the just-packed data, so the UI can show it without re-parsing. */
  previewRgba: DecodedImage;
}
