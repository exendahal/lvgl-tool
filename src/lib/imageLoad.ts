import type { DecodedImage } from './types';

const SVG_MIME = 'image/svg+xml';

function isSvg(file: File): boolean {
  return file.type === SVG_MIME || file.name.toLowerCase().endsWith('.svg');
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image data.'));
    img.src = url;
  });
}

function rasterize(img: HTMLImageElement, width: number, height: number): DecodedImage {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data, sourceName: '' };
}

/**
 * Decodes a raster file (PNG/JPG/BMP) at its native resolution, or rasterizes an SVG
 * at an explicit target resolution (LVGL's formats are raster-only, so SVGs must be
 * flattened to pixels before any color-format packing can happen).
 */
export async function decodeImageFile(
  file: File,
  svgTargetSize?: { width: number; height: number },
): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(url);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (isSvg(file)) {
      const width = svgTargetSize?.width ?? naturalW ?? 256;
      const height = svgTargetSize?.height ?? naturalH ?? 256;
      const decoded = rasterize(img, Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
      decoded.sourceName = file.name;
      return decoded;
    }
    const decoded = rasterize(img, naturalW, naturalH);
    decoded.sourceName = file.name;
    return decoded;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reads an SVG's intrinsic size (viewBox or width/height attrs) so the UI can pre-fill a sensible target resolution. */
export async function readSvgIntrinsicSize(file: File): Promise<{ width: number; height: number } | null> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, SVG_MIME);
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null;
  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');
  const w = widthAttr ? parseFloat(widthAttr) : NaN;
  const h = heightAttr ? parseFloat(heightAttr) : NaN;
  if (!Number.isNaN(w) && !Number.isNaN(h)) return { width: w, height: h };
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((p) => !Number.isNaN(p))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return null;
}

/** Renders a DecodedImage back to a <canvas> for previews. */
export function paintToCanvas(img: DecodedImage, canvas: HTMLCanvasElement): void {
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imageData = new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height);
  ctx.putImageData(imageData, 0, 0);
}
