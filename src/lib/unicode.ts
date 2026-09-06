/** Private Use Area code points (BMP + supplementary A/B). */
function isPrivateUseArea(codepoint: number): boolean {
  return (codepoint >= 0xe000 && codepoint <= 0xf8ff) || (codepoint >= 0xf0000 && codepoint <= 0xffffd) || (codepoint >= 0x100000 && codepoint <= 0x10fffd);
}

/**
 * Labels a glyph cell by its code point, always.
 *
 * Rendering the code point as a character is actively misleading for icon fonts: the PUA has no
 * universal meaning, and plenty of subsetted icon fonts (Font Awesome subsets included) map their
 * icons onto ordinary ASCII slots — so a trash-can icon would be labelled "#". The code point is
 * the only label that is true for every font; the character, where it has one, goes in the tooltip.
 */
export function formatCodepoint(codepoint: number): string {
  return `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function glyphTooltip(codepoint: number): string {
  const printable = codepoint > 0x20 && codepoint !== 0x7f && !isPrivateUseArea(codepoint);
  return printable ? `${formatCodepoint(codepoint)}  ${String.fromCodePoint(codepoint)}` : formatCodepoint(codepoint);
}
