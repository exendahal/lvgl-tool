import { parseFontCSource } from '../importer/parseFontCSource';
import { ICONS } from './icons';
import { renderGlyphGrid } from './glyphGrid';

export function renderFontImportPanelHtml(): string {
  return `
  <div class="grid">
    <div>
      <div class="section">
        <h3 class="section-heading">Load an existing LVGL font source</h3>
        <div class="field">
          <label for="font-import-file-input">Upload a font .c source</label>
          <input type="file" id="font-import-file-input" accept=".c,.h,text/plain" />
        </div>
        <div class="field">
          <label for="font-import-text-area">…or paste .c source text directly</label>
          <textarea id="font-import-text-area" rows="10" style="width:100%; font-family: Consolas, monospace; font-size: 0.8rem;" placeholder="static const lv_font_fmt_txt_dsc_t my_font_dsc = { ... };"></textarea>
        </div>
        <div class="actions">
          <button class="primary" id="font-import-decode-btn">${ICONS.search}Decode &amp; preview</button>
        </div>
        <p class="status" id="font-import-status"></p>
      </div>
    </div>
    <div>
      <div class="card">
        <h3 class="section-heading">Metadata</h3>
        <div id="font-import-metadata" class="note">Load and decode a font source to see metadata here.</div>
      </div>
      <div class="card">
        <h3 class="section-heading">Glyph grid</h3>
        <div id="font-import-glyph-grid" style="display:flex; flex-wrap:wrap; gap:6px; max-height: 480px; overflow:auto;"></div>
      </div>
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
    renderGlyphGrid(gridEl, f.glyphs, f.bpp);
    setStatus(`Decoded ${f.glyphs.length} glyph(s) successfully.`, 'ok');
  });
}
