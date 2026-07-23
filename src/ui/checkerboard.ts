import type { DecodedImage } from '../lib/types';

/** Paints a DecodedImage over a standard gray/white transparency checkerboard. */
export function paintOnCheckerboard(image: DecodedImage, canvas: HTMLCanvasElement, cell = 8): void {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  for (let y = 0; y < image.height; y += cell) {
    for (let x = 0; x < image.width; x += cell) {
      const isLight = ((x / cell) + (y / cell)) % 2 === 0;
      ctx.fillStyle = isLight ? '#e5e7eb' : '#9ca3af';
      ctx.fillRect(x, y, cell, cell);
    }
  }

  const layer = document.createElement('canvas');
  layer.width = image.width;
  layer.height = image.height;
  const layerCtx = layer.getContext('2d')!;
  layerCtx.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), 0, 0);
  ctx.drawImage(layer, 0, 0);
}
