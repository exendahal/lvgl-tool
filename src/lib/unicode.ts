/** Private Use Area code points (BMP + supplementary A/B) have no universal meaning — rendering
 * them as a character shows whatever a system font arbitrarily maps there, unrelated to what an
 * LVGL icon font (which lives in this range) actually draws. Callers should show the hex
 * codepoint instead for these. */
export function isPrivateUseArea(codepoint: number): boolean {
  return (codepoint >= 0xe000 && codepoint <= 0xf8ff) || (codepoint >= 0xf0000 && codepoint <= 0xffffd) || (codepoint >= 0x100000 && codepoint <= 0x10fffd);
}
