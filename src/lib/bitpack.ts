/** Packs per-pixel values (0..2^bpp-1) MSB-first into bytes, each image row starting at a
 * new byte boundary — matches LVGL's row-aligned indexed/alpha bitmap convention. */
export function packRowAlignedBits(values: ArrayLike<number>, width: number, height: number, bpp: number): { data: Uint8Array; stride: number } {
  const stride = Math.ceil((width * bpp) / 8);
  const out = new Uint8Array(stride * height);
  const maxVal = (1 << bpp) - 1;
  for (let y = 0; y < height; y++) {
    let bitPos = 0;
    const rowOffset = y * stride;
    for (let x = 0; x < width; x++) {
      const v = values[y * width + x] & maxVal;
      const byteIdx = rowOffset + (bitPos >> 3);
      const shift = 8 - bpp - (bitPos % 8);
      out[byteIdx] |= v << shift;
      bitPos += bpp;
    }
  }
  return { data: out, stride };
}

/** Reverse of packRowAlignedBits: unpacks row-aligned, MSB-first bpp-sized values back to one value per pixel. */
export function unpackRowAlignedBits(data: Uint8Array, width: number, height: number, bpp: number, stride?: number): Uint8Array {
  const rowStride = stride ?? Math.ceil((width * bpp) / 8);
  const out = new Uint8Array(width * height);
  const maxVal = (1 << bpp) - 1;
  for (let y = 0; y < height; y++) {
    let bitPos = 0;
    const rowOffset = y * rowStride;
    for (let x = 0; x < width; x++) {
      const byteIdx = rowOffset + (bitPos >> 3);
      const shift = 8 - bpp - (bitPos % 8);
      out[y * width + x] = (data[byteIdx] >> shift) & maxVal;
      bitPos += bpp;
    }
  }
  return out;
}
