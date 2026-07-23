import type { DecodedImage } from './types';

export type PaletteEntry = [r: number, g: number, b: number, a: number];

interface Bucket {
  colors: { r: number; g: number; b: number; a: number; count: number }[];
  count: number;
}

function bucketRange(bucket: Bucket): { channel: 0 | 1 | 2 | 3; range: number } {
  let min = [255, 255, 255, 255];
  let max = [0, 0, 0, 0];
  for (const c of bucket.colors) {
    const v = [c.r, c.g, c.b, c.a];
    for (let i = 0; i < 4; i++) {
      if (v[i] < min[i]) min[i] = v[i];
      if (v[i] > max[i]) max[i] = v[i];
    }
  }
  const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2], max[3] - min[3]];
  let channel: 0 | 1 | 2 | 3 = 0;
  let range = ranges[0];
  for (let i = 1; i < 4; i++) {
    if (ranges[i] > range) {
      range = ranges[i];
      channel = i as 0 | 1 | 2 | 3;
    }
  }
  return { channel, range };
}

function splitBucket(bucket: Bucket): [Bucket, Bucket] {
  const { channel } = bucketRange(bucket);
  const key = (['r', 'g', 'b', 'a'] as const)[channel];
  const sorted = [...bucket.colors].sort((x, y) => x[key] - y[key]);
  const totalCount = bucket.count;
  let acc = 0;
  let splitIdx = sorted.length - 1;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].count;
    if (acc >= totalCount / 2) {
      splitIdx = i;
      break;
    }
  }
  const a = sorted.slice(0, splitIdx + 1);
  const b = sorted.slice(splitIdx + 1);
  const bSafe = b.length ? b : [sorted[sorted.length - 1]];
  const aSafe = b.length ? a : sorted.slice(0, -1).length ? sorted.slice(0, -1) : a;
  const sum = (arr: typeof sorted) => arr.reduce((s, c) => s + c.count, 0);
  return [
    { colors: aSafe, count: sum(aSafe) },
    { colors: bSafe, count: sum(bSafe) },
  ];
}

function bucketAverage(bucket: Bucket): PaletteEntry {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let total = 0;
  for (const c of bucket.colors) {
    r += c.r * c.count;
    g += c.g * c.count;
    b += c.b * c.count;
    a += c.a * c.count;
    total += c.count;
  }
  if (total === 0) return [0, 0, 0, 255];
  return [Math.round(r / total), Math.round(g / total), Math.round(b / total), Math.round(a / total)];
}

/**
 * Median-cut color quantization. Alpha is treated as a 4th clustering dimension so that
 * distinct alpha levels of an otherwise-identical color can end up as separate palette
 * entries when there's room, since LVGL indexed palettes store per-entry alpha.
 */
export function buildPalette(image: DecodedImage, maxColors: number): PaletteEntry[] {
  const counts = new Map<number, number>();
  const { data, width, height } = image;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const key = (data[o] << 24) | (data[o + 1] << 16) | (data[o + 2] << 8) | data[o + 3];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const unique = [...counts.entries()].map(([key, count]) => ({
    r: (key >>> 24) & 0xff,
    g: (key >>> 16) & 0xff,
    b: (key >>> 8) & 0xff,
    a: key & 0xff,
    count,
  }));

  if (unique.length <= maxColors) {
    return unique.map((c): PaletteEntry => [c.r, c.g, c.b, c.a]);
  }

  let buckets: Bucket[] = [{ colors: unique, count: unique.reduce((s, c) => s + c.count, 0) }];
  while (buckets.length < maxColors) {
    let splitIdx = -1;
    let bestRange = -1;
    buckets.forEach((bucket, idx) => {
      if (bucket.colors.length <= 1) return;
      const { range } = bucketRange(bucket);
      if (range > bestRange) {
        bestRange = range;
        splitIdx = idx;
      }
    });
    if (splitIdx === -1) break;
    const [a, b] = splitBucket(buckets[splitIdx]);
    buckets.splice(splitIdx, 1, a, b);
  }

  return buckets.map(bucketAverage);
}

export function nearestPaletteIndex(palette: PaletteEntry[], r: number, g: number, b: number, a: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb, pa] = palette[i];
    const dr = pr - r;
    const dg = pg - g;
    const db = pb - b;
    const da = pa - a;
    const dist = dr * dr + dg * dg + db * db + da * da * 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
