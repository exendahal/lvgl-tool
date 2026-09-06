import assert from 'node:assert/strict';
import { formatCodepointRanges, parseUnicodeRangeField } from './rangeParser';

// Runs of consecutive code points collapse; isolated ones stay single.
assert.equal(formatCodepointRanges([0x20, 0x21, 0x22, 0xa9, 0xf000, 0xf001]), '0x20-0x22, 0xA9, 0xF000-0xF001');
assert.equal(formatCodepointRanges([]), '');
assert.equal(formatCodepointRanges([0x41]), '0x41');

// Whatever we emit, the range field must parse back to exactly the same set — this is the
// contract that makes "All glyphs in font" produce the glyphs the preview showed.
const sample = [0x20, 0x23, 0x28, 0x29, 0x2a, 0x2b, 0x30, 0x33, 0x3c, 0x3e, 0x3f, 0x2212];
const roundTrip = parseUnicodeRangeField(formatCodepointRanges(sample));
assert.equal(roundTrip.error, undefined);
assert.deepEqual([...roundTrip.codepoints].sort((a, b) => a - b), sample);

console.log('rangeParser: ok');
