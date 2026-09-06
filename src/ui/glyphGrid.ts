import { formatCodepoint, glyphTooltip } from '../lib/unicode';

/** The subset of a glyph the preview needs — satisfied by both the converter's GlyphEntry and
 * the importer's DecodedFontGlyph, which is why this grid is shared by both panels. */
export interface PreviewGlyph {
  codepoint: number;
  boxW: number;
  boxH: number;
  /** Quantized coverage levels, 0..2^bpp-1, row-major, boxW*boxH. */
  levels: Uint8Array;
  name?: string;
}

const CELL_PX = 52;

/**
 * Renders the glyph grid in uniform cells. Glyphs really are stored at wildly different sizes —
 * each one is cropped to its own bounding box in the .c, with ofs_x/ofs_y putting it back on the
 * baseline — so the *cell* is fixed and the bitmap is centred inside it at a scale shared by the
 * whole grid. That keeps the layout even without lying about relative glyph sizes.
 */
export function renderGlyphGrid(container: HTMLElement, glyphs: PreviewGlyph[], bpp: number): void {
  container.innerHTML = '';
  const maxLevel = (1 << bpp) - 1;
  const largest = Math.max(1, ...glyphs.map((g) => Math.max(g.boxW, g.boxH)));
  const scale = Math.max(1, Math.floor(CELL_PX / largest));

  for (const g of glyphs) {
    const cell = document.createElement('div');
    cell.style.cssText = `width:${CELL_PX + 12}px; text-align:center; font-size:0.7rem; color:var(--muted)`;
    cell.title = g.name ? `${g.name}  ${glyphTooltip(g.codepoint)}` : glyphTooltip(g.codepoint);

    const box = document.createElement('div');
    box.style.cssText = `width:${CELL_PX}px; height:${CELL_PX}px; margin:0 auto; display:flex; align-items:center; justify-content:center; background:#fff; border:1px solid var(--border)`;

    const w = Math.max(1, g.boxW);
    const h = Math.max(1, g.boxH);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w * scale + 'px';
    canvas.style.height = h * scale + 'px';
    // Nearest-neighbour: this is a preview of the actual stored pixels, so upscaling must not
    // smooth them into something the device will never render.
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const coverage = maxLevel > 0 ? (g.levels[i] ?? 0) / maxLevel : 0;
      const shade = Math.round(255 * (1 - coverage));
      imgData.data[i * 4] = shade;
      imgData.data[i * 4 + 1] = shade;
      imgData.data[i * 4 + 2] = shade;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    box.appendChild(canvas);
    cell.appendChild(box);

    if (g.name) {
      const nameEl = document.createElement('div');
      nameEl.textContent = g.name;
      nameEl.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text)';
      cell.appendChild(nameEl);
    }

    const label = document.createElement('div');
    label.textContent = formatCodepoint(g.codepoint);
    cell.appendChild(label);

    container.appendChild(cell);
  }
}
