export interface RangePreset {
  id: string;
  label: string;
  range: string;
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: 'ascii', label: 'ASCII (0x20-0x7E)', range: '0x20-0x7E' },
  { id: 'latin1', label: 'Latin-1 Supplement (0xA0-0xFF)', range: '0xA0-0xFF' },
  { id: 'latin-ext-a', label: 'Latin Extended-A (0x100-0x17F)', range: '0x100-0x17F' },
];

/** A generous but real cap — client-side canvas rasterization of tens of thousands of
 * glyphs would hang the tab, so very large requested ranges are rejected with a clear reason
 * rather than silently truncated or left to freeze the browser. */
export const MAX_CODEPOINTS = 4000;

function parseNumberToken(token: string): number | null {
  const t = token.trim();
  if (/^0x[0-9a-fA-F]+$/.test(t)) return parseInt(t, 16);
  if (/^[0-9]+$/.test(t)) return parseInt(t, 10);
  return null;
}

/** Parses a Unicode range expression like "0x20-0x7E, 0xA9, 0x100-0x17F" (hex or decimal,
 * comma/space separated, each token either a single codepoint or a start-end range). */
export function parseUnicodeRangeField(input: string): { codepoints: Set<number>; error?: string } {
  const codepoints = new Set<number>();
  const tokens = input
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = token.match(/^(0x[0-9a-fA-F]+|\d+)\s*-\s*(0x[0-9a-fA-F]+|\d+)$/);
    if (rangeMatch) {
      const start = parseNumberToken(rangeMatch[1]);
      const end = parseNumberToken(rangeMatch[2]);
      if (start === null || end === null || start > end) {
        return { codepoints, error: `Invalid range token "${token}".` };
      }
      for (let cp = start; cp <= end; cp++) codepoints.add(cp);
      continue;
    }
    const single = parseNumberToken(token);
    if (single !== null) {
      codepoints.add(single);
      continue;
    }
    if ([...token].length === 1) {
      codepoints.add(token.codePointAt(0)!);
      continue;
    }
    return { codepoints, error: `Could not parse range token "${token}" — expected "0x20-0x7E", a single codepoint, or a single character.` };
  }
  return { codepoints };
}

/** Parses the explicit character/symbol list field: comma-separated codepoints or literal
 * characters if a comma is present, otherwise every character in the pasted string. */
export function parseExplicitCharList(input: string): Set<number> {
  const codepoints = new Set<number>();
  if (!input.trim()) return codepoints;
  if (input.includes(',')) {
    for (const token of input.split(',').map((t) => t.trim()).filter(Boolean)) {
      const num = parseNumberToken(token);
      if (num !== null) codepoints.add(num);
      else for (const ch of token) codepoints.add(ch.codePointAt(0)!);
    }
  } else {
    for (const ch of input) codepoints.add(ch.codePointAt(0)!);
  }
  return codepoints;
}

export function combineCodepoints(...sets: Set<number>[]): number[] {
  const combined = new Set<number>();
  for (const s of sets) for (const cp of s) combined.add(cp);
  return [...combined].sort((a, b) => a - b);
}
