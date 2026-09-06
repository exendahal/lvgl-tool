import assert from 'node:assert/strict';
import { generateFontCFile } from '../font/encodeFontC';
import { parseFontCSource } from './parseFontCSource';
import type { FontBuildResult } from '../font/types';

const font: FontBuildResult = {
  version: 'v9',
  variableName: 'test_font',
  sizePx: 16,
  bpp: 4,
  lineHeight: 16,
  baseLine: 4,
  kernPairs: [],
  glyphs: [
    { codepoint: 0x23, boxW: 2, boxH: 2, ofsX: 0, ofsY: 0, advWPx: 8, bppLevels: Uint8Array.from([15, 0, 0, 15]), name: 'numbersign' },
    { codepoint: 0xf023, boxW: 1, boxH: 1, ofsX: 1, ofsY: -1, advWPx: 9, bppLevels: Uint8Array.from([15]), name: 'lock' },
    { codepoint: 0x41, boxW: 1, boxH: 1, ofsX: 0, ofsY: 0, advWPx: 7, bppLevels: Uint8Array.from([8]) }, // no post-table name
  ],
};

const { c } = generateFontCFile(font);
assert.match(c, /U\+0023 name="numbersign"/);
assert.match(c, /U\+F023 name="lock"/);

const parsed = parseFontCSource(c);
assert.ok(parsed.ok, parsed.ok ? '' : parsed.error);
const byCp = new Map(parsed.font.glyphs.map((g) => [g.codepoint, g]));
assert.equal(byCp.get(0x23)?.name, 'numbersign');
assert.equal(byCp.get(0xf023)?.name, 'lock');
assert.equal(byCp.get(0x41)?.name, undefined, 'a glyph with no name must not invent one');

console.log('parseFontCSource: glyph names survive the .c round-trip');
