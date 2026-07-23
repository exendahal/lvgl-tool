/**
 * PackBits-style run-length encoding, applied byte-wise over already-packed pixel data.
 *
 * IMPORTANT: this is an original, simple RLE scheme used to demonstrate/approximate the
 * "optional compression" checkbox from the PRD — it is NOT verified to be byte-compatible
 * with any specific LVGL v9 point release's internal decompressor. Firmware consuming this
 * output must decompress it itself (e.g. in a custom image decoder) before the packed pixels
 * reach LVGL's built-in RGB565/ARGB8888 renderers. Treat this output as experimental.
 */
export function encodeRlePackBits(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    let runLen = 1;
    while (i + runLen < n && bytes[i + runLen] === bytes[i] && runLen < 128) runLen++;
    if (runLen >= 2) {
      out.push(257 - runLen);
      out.push(bytes[i]);
      i += runLen;
      continue;
    }
    const litStart = i;
    let litLen = 1;
    i++;
    while (i < n && litLen < 128) {
      const isRunStart = i + 1 < n && bytes[i + 1] === bytes[i];
      if (isRunStart) break;
      litLen++;
      i++;
    }
    out.push(litLen - 1);
    for (let k = 0; k < litLen; k++) out.push(bytes[litStart + k]);
  }
  return Uint8Array.from(out);
}
