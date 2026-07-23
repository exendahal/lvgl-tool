import { parseFontCSource, type DecodedFontGlyph } from '../importer/parseFontCSource';

export function renderFontImportPanelHtml(): string {
  return `
  <div class="grid">
    <div>
      <fieldset>
        <legend>Load an existing LVGL font source</legend>
        <div class="field">
          <label for="font-import-file-input">Upload a font .c source</label>
          <input type="file" id="font-import-file-input" accept=".c,.h,text/plain" />
        </div>
        <div class="field">
          <label for="font-import-text-area">…or paste .c source text directly</label>
          <textarea id="font-import-text-area" rows="10" style="width:100%; font-family: Consolas, monospace; font-size: 0.8rem;" placeholder="static const lv_font_fmt_txt_dsc_t my_font_dsc = { ... };"></textarea>
        </div>
        <div class="actions">
          <button class="primary" id="font-import-decode-btn">Decode &amp; preview</button>
        </div>
        <p class="status" id="font-import-status"></p>
      </fieldset>
    </div>
    <div>
      <fieldset>
        <legend>Metadata</legend>
        <div id="font-import-metadata" class="note">Load and decode a font source to see metadata here.</div>
      </fieldset>
      <fieldset>
        <legend>Glyph grid</legend>
        <div id="font-import-glyph-grid" style="display:flex; flex-wrap:wrap; gap:6px; max-height: 480px; overflow:auto;"></div>
      </fieldset>
    </div>
  </div>`;
}

export function wireFontImportPanel(root: ParentNode): void {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector<T>('#' + id)!;

  const fileInput = $<HTMLInputElement>('font-import-file-input');
  const textArea = $<HTMLTextAreaElement>('font-import-text-area');
  const decodeBtn = $<HTMLButtonElement>('font-import-decode-btn');
  const statusEl = $<HTMLParagraphElement>('font-import-status');
  const metadataEl = $<HTMLDivElement>('font-import-metadata');
  const gridEl = $<HTMLDivElement>('font-import-glyph-grid');

  function setStatus(msg: string, kind: 'ok' | 'error' | '' = ''): void {
    statusEl.textContent = msg;
    statusEl.className = `status ${kind}`;
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    textArea.value = await file.text();
    setStatus(`Loaded ${file.name} — click Decode & preview.`);
  });

  decodeBtn.addEventListener('click', () => {
    const src = textArea.value;
    if (!src.trim()) {
      setStatus('Paste a font .c source or upload a file first.', 'error');
      return;
    }
    const result = parseFontCSource(src);
    if (!result.ok) {
      setStatus(result.error, 'error');
      metadataEl.textContent = 'Decode failed — see error above.';
      gridEl.innerHTML = '';
      return;
    }
    const f = result.font;
    const codepoints = f.glyphs.map((g) => g.codepoint);
    const min = Math.min(...codepoints);
    const max = Math.max(...codepoints);
    metadataEl.innerHTML = `
      <div><strong>Glyph count:</strong> ${f.glyphs.length}</div>
      <div><strong>Bits per pixel:</strong> ${f.bpp}</div>
      <div><strong>Line height:</strong> ${f.lineHeight ?? 'unknown'}px</div>
      <div><strong>Base line:</strong> ${f.baseLine ?? 'unknown'}px</div>
      <div><strong>Kerning table present:</strong> ${f.kerningPresent ? 'yes' : 'no'}</div>
      <div><strong>Character range:</strong> U+${min.toString(16).toUpperCase()}–U+${max.toString(16).toUpperCase()}</div>
      <div><strong>Bitmap array size (flash footprint):</strong> ${f.glyphBitmapByteSize.toLocaleString()} bytes</div>
      <p class="note">${f.versionNote}</p>
    `;
    renderGrid(gridEl, f.glyphs, f.bpp);
    setStatus(`Decoded ${f.glyphs.length} glyph(s) successfully.`, 'ok');
  });
}

function renderGrid(container: HTMLDivElement, glyphs: DecodedFontGlyph[], bpp: number): void {
  container.innerHTML = '';
  const maxLevel = (1 << bpp) - 1;
  for (const g of glyphs) {
    const cell = document.createElement('div');
    cell.style.textAlign = 'center';
    cell.style.fontSize = '0.7rem';
    cell.style.color = 'var(--muted)';

    const canvas = document.createElement('canvas');
    const w = Math.max(1, g.boxW);
    const h = Math.max(1, g.boxH);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = Math.max(16, w * 2) + 'px';
    canvas.style.height = Math.max(16, h * 2) + 'px';
    canvas.style.background = '#fff';
    canvas.style.border = '1px solid var(--border)';
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const level = g.levels[i] ?? 0;
      const coverage = maxLevel > 0 ? level / maxLevel : 0;
      const shade = Math.round(255 * (1 - coverage));
      imgData.data[i * 4] = shade;
      imgData.data[i * 4 + 1] = shade;
      imgData.data[i * 4 + 2] = shade;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const label = document.createElement('div');
    const cp = g.codepoint;
    label.textContent = cp >= 0x20 && cp !== 0x7f && cp < 0x2ffff ? String.fromCodePoint(cp) : `U+${cp.toString(16).toUpperCase()}`;

    cell.appendChild(canvas);
    cell.appendChild(label);
    container.appendChild(cell);
  }
}
