import type { LvglVersion } from '../lib/types';
import { RANGE_PRESETS, parseUnicodeRangeField, parseExplicitCharList, combineCodepoints, MAX_CODEPOINTS } from '../font/rangeParser';
import { buildFont, type BuildFontReport } from '../font/buildFont';
import { generateFontCFile } from '../font/encodeFontC';
import { encodeFontBinary } from '../font/encodeFontBinary';
import { toCIdentifier } from '../lib/bytes';
import { downloadBytes, downloadText } from './download';
import { loadJson, saveJson } from '../lib/persist';
import { ICONS } from './icons';

const FONT_OPTIONS_KEY = 'lvgl-tool.font-options';

interface PersistedFontOptions {
  range: string;
  symbols: string;
  sizePx: string;
  bpp: string;
  letterSpacing: string;
  kerning: boolean;
  outputMode: string;
}

export function renderFontPanelHtml(): string {
  const presetButtons = RANGE_PRESETS.map((p) => `<button type="button" class="secondary" data-preset="${p.id}" style="margin: 0 0.3rem 0.3rem 0;">${p.label}</button>`).join('');
  return `
  <div class="grid">
    <div>
      <div class="section">
        <h3 class="section-heading">Source font</h3>
        <div class="field">
          <label for="font-file-input">Font file (TTF / OTF / WOFF)</label>
          <input type="file" id="font-file-input" accept=".ttf,.otf,.woff,font/*" />
        </div>
        <div class="checkbox-field field">
          <input type="checkbox" id="font-merge-enable" />
          <label for="font-merge-enable" style="margin:0">Merge an additional font source (e.g. base font + icon font)</label>
        </div>
        <div class="field" id="font-merge-row" style="display:none">
          <label for="font-merge-input">Additional source (glyphs missing from the primary font are pulled from here)</label>
          <input type="file" id="font-merge-input" accept=".ttf,.otf,.woff,font/*" />
        </div>
        <p class="note" id="font-file-info"></p>
      </div>

      <div class="section">
        <h3 class="section-heading">Character coverage</h3>
        <div class="field">
          <label>Range presets</label>
          <div>${presetButtons}</div>
        </div>
        <div class="field">
          <label for="font-range-input">Unicode range (e.g. 0x20-0x7E, 0xA9)</label>
          <input type="text" id="font-range-input" value="0x20-0x7E" />
        </div>
        <div class="field">
          <label for="font-symbols-input">Explicit character / symbol list (combinable with the range above)</label>
          <input type="text" id="font-symbols-input" placeholder="e.g. €£§ or 0x20AC,0xA3" />
        </div>
        <details class="hint"><summary>Range size limit</summary><p>Client-side rasterization caps out at ${MAX_CODEPOINTS.toLocaleString()} combined codepoints to keep the browser responsive — large CJK blocks aren't practical here.</p></details>
      </div>

      <div class="section">
        <h3 class="section-heading">Font settings</h3>
        <div class="row field">
          <div>
            <label for="font-size-input">Font size (px)</label>
            <input type="number" id="font-size-input" min="4" max="256" value="16" />
          </div>
          <div>
            <label for="font-bpp-select">Bits per pixel</label>
            <select id="font-bpp-select">
              <option value="1">1 bpp</option>
              <option value="2">2 bpp</option>
              <option value="4" selected>4 bpp</option>
              <option value="8">8 bpp</option>
            </select>
          </div>
        </div>
        <details class="hint"><summary>Why no 3bpp option</summary><p>3bpp is compression-gated in the official tool, and LVGL's real compression algorithm isn't reproduced here, so it's left out.</p></details>
        <div class="row field">
          <div>
            <label for="font-letterspacing-input">Letter spacing (px, added to each glyph's advance width)</label>
            <input type="number" id="font-letterspacing-input" value="0" />
          </div>
          <div>
            <label for="font-fallback-input">Fallback font variable name (optional, v8/v9 only)</label>
            <input type="text" id="font-fallback-input" placeholder="e.g. lv_font_montserrat_14" />
          </div>
        </div>
        <div class="checkbox-field field">
          <input type="checkbox" id="font-kerning-checkbox" />
          <label for="font-kerning-checkbox" style="margin:0">Enable kerning (experimental — best-effort read of the font's own kern/GPOS table, capped at 500 glyphs)</label>
        </div>
      </div>

      <div class="section">
        <h3 class="section-heading">Output</h3>
        <div class="row field">
          <div>
            <label for="font-varname-input">C variable name</label>
            <input type="text" id="font-varname-input" value="my_font" />
          </div>
          <div>
            <label for="font-output-mode">Output mode</label>
            <select id="font-output-mode">
              <option value="c">C file (.c/.h pair)</option>
              <option value="binary">Binary (experimental, this tool's own format)</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button class="primary" id="font-convert-btn" disabled>${ICONS.play}Convert</button>
          <button class="secondary" id="font-download-btn" disabled>${ICONS.download}Download</button>
        </div>
        <p class="status" id="font-status"></p>
      </div>
    </div>

    <div>
      <div class="card">
        <h3 class="section-heading">Glyph preview</h3>
        <div id="font-glyph-grid" style="display:flex; flex-wrap:wrap; gap:6px; max-height: 480px; overflow:auto;"></div>
      </div>
      <div class="card">
        <h3 class="section-heading">Generated output</h3>
        <textarea id="font-output-text" readonly placeholder="Convert a font to see the generated .c source here."></textarea>
      </div>
    </div>
  </div>`;
}

export interface FontPanelApi {
  onVersionChange: () => void;
}

export function wireFontPanel(root: ParentNode, getVersion: () => LvglVersion): FontPanelApi {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector<T>('#' + id)!;

  const fileInput = $<HTMLInputElement>('font-file-input');
  const mergeEnable = $<HTMLInputElement>('font-merge-enable');
  const mergeRow = $<HTMLDivElement>('font-merge-row');
  const mergeInput = $<HTMLInputElement>('font-merge-input');
  const fileInfo = $<HTMLParagraphElement>('font-file-info');

  const rangeInput = $<HTMLInputElement>('font-range-input');
  const symbolsInput = $<HTMLInputElement>('font-symbols-input');
  const sizeInput = $<HTMLInputElement>('font-size-input');
  const bppSelect = $<HTMLSelectElement>('font-bpp-select');
  const letterSpacingInput = $<HTMLInputElement>('font-letterspacing-input');
  const fallbackInput = $<HTMLInputElement>('font-fallback-input');
  const kerningCheckbox = $<HTMLInputElement>('font-kerning-checkbox');
  const varNameInput = $<HTMLInputElement>('font-varname-input');
  const outputModeSelect = $<HTMLSelectElement>('font-output-mode');
  const convertBtn = $<HTMLButtonElement>('font-convert-btn');
  const downloadBtn = $<HTMLButtonElement>('font-download-btn');
  const statusEl = $<HTMLParagraphElement>('font-status');
  const glyphGrid = $<HTMLDivElement>('font-glyph-grid');
  const outputText = $<HTMLTextAreaElement>('font-output-text');

  const saved = loadJson<PersistedFontOptions>(FONT_OPTIONS_KEY);
  if (saved) {
    if (saved.range) rangeInput.value = saved.range;
    if (saved.symbols) symbolsInput.value = saved.symbols;
    if (saved.sizePx) sizeInput.value = saved.sizePx;
    if (saved.bpp) bppSelect.value = saved.bpp;
    if (saved.letterSpacing) letterSpacingInput.value = saved.letterSpacing;
    if (saved.kerning) kerningCheckbox.checked = saved.kerning;
    if (saved.outputMode) outputModeSelect.value = saved.outputMode;
  }
  const persistFontOptions = (): void =>
    saveJson(FONT_OPTIONS_KEY, {
      range: rangeInput.value,
      symbols: symbolsInput.value,
      sizePx: sizeInput.value,
      bpp: bppSelect.value,
      letterSpacing: letterSpacingInput.value,
      kerning: kerningCheckbox.checked,
      outputMode: outputModeSelect.value,
    });
  root.addEventListener('change', persistFontOptions);
  root.addEventListener('input', persistFontOptions);

  root.querySelectorAll<HTMLButtonElement>('button[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = RANGE_PRESETS.find((p) => p.id === btn.dataset.preset);
      if (preset) rangeInput.value = preset.range;
      persistFontOptions();
    });
  });

  let primaryBytes: ArrayBuffer | null = null;
  let mergeBytes: ArrayBuffer | null = null;
  let lastReport: BuildFontReport | null = null;
  let lastCFile: { c: string; h: string } | null = null;
  let lastBinary: Uint8Array | null = null;

  function setStatus(msg: string, kind: 'ok' | 'error' | '' = ''): void {
    statusEl.textContent = msg;
    statusEl.className = `status ${kind}`;
  }

  function updateConvertEnabled(): void {
    convertBtn.disabled = !primaryBytes;
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    primaryBytes = await file.arrayBuffer();
    const base = toCIdentifier(file.name.replace(/\.[^/.]+$/, ''));
    varNameInput.value = base;
    fileInfo.textContent = `${file.name} loaded.`;
    updateConvertEnabled();
  });

  mergeEnable.addEventListener('change', () => {
    mergeRow.style.display = mergeEnable.checked ? 'block' : 'none';
  });

  mergeInput.addEventListener('change', async () => {
    const file = mergeInput.files?.[0];
    if (!file) return;
    mergeBytes = await file.arrayBuffer();
  });

  function onVersionChange(): void {
    const version = getVersion();
    const isV7 = version === 'v7';
    fallbackInput.disabled = isV7;
    fallbackInput.placeholder = isV7 ? 'Not supported in LVGL v7' : 'e.g. lv_font_montserrat_14';
  }

  convertBtn.addEventListener('click', async () => {
    if (!primaryBytes) return;
    const rangeResult = parseUnicodeRangeField(rangeInput.value);
    if (rangeResult.error) {
      setStatus(rangeResult.error, 'error');
      return;
    }
    const symbolCodepoints = parseExplicitCharList(symbolsInput.value);
    const codepoints = combineCodepoints(rangeResult.codepoints, symbolCodepoints);

    if (codepoints.length === 0) {
      setStatus('No characters selected — set a Unicode range or explicit character list.', 'error');
      return;
    }
    if (codepoints.length > MAX_CODEPOINTS) {
      setStatus(`${codepoints.length} codepoints requested, which exceeds the ${MAX_CODEPOINTS}-codepoint client-side cap. Narrow the range.`, 'error');
      return;
    }

    const version = getVersion();
    convertBtn.disabled = true;
    setStatus('Rasterizing glyphs…');
    try {
      const report = await buildFont({
        version,
        variableName: varNameInput.value || 'my_font',
        sizePx: Math.max(4, parseInt(sizeInput.value, 10) || 16),
        bpp: (parseInt(bppSelect.value, 10) as 1 | 2 | 4 | 8) ?? 4,
        letterSpacingPx: parseFloat(letterSpacingInput.value) || 0,
        kerningEnabled: kerningCheckbox.checked,
        fallbackVarName: version !== 'v7' && fallbackInput.value.trim() ? fallbackInput.value.trim() : undefined,
        codepoints,
        primary: { bytes: primaryBytes! },
        mergeSource: mergeEnable.checked && mergeBytes ? { bytes: mergeBytes } : undefined,
      });
      lastReport = report;
      renderGlyphGrid(glyphGrid, report);

      if (outputModeSelect.value === 'c') {
        lastCFile = generateFontCFile(report.result);
        lastBinary = null;
        outputText.value = lastCFile.c;
      } else {
        lastBinary = encodeFontBinary(report.result);
        lastCFile = null;
        outputText.value = `(binary output — ${lastBinary.length} bytes — use Download)`;
      }

      downloadBtn.disabled = false;
      const notes: string[] = [];
      if (report.missingCodepoints.length > 0) notes.push(`${report.missingCodepoints.length} requested character(s) not found in the font were skipped.`);
      if (report.kerningSkippedReason) notes.push(report.kerningSkippedReason);
      setStatus(`Converted ${report.result.glyphs.length} glyph(s) successfully.${notes.length ? ' ' + notes.join(' ') : ''}`, 'ok');
    } catch (err) {
      setStatus(`Conversion failed: ${(err as Error).message}`, 'error');
    } finally {
      updateConvertEnabled();
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!lastReport) return;
    const varName = toCIdentifier(varNameInput.value, 'font');
    if (lastCFile) {
      downloadText(`${varName}.c`, lastCFile.c);
      downloadText(`${varName}.h`, lastCFile.h);
    } else if (lastBinary) {
      downloadBytes(`${varName}.bin`, lastBinary);
    }
  });

  onVersionChange();
  return { onVersionChange };
}

function renderGlyphGrid(container: HTMLDivElement, report: BuildFontReport): void {
  container.innerHTML = '';
  for (const g of report.result.glyphs) {
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
      const level = g.bppLevels[i] ?? 0;
      const maxLevel = (1 << report.result.bpp) - 1;
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
    label.textContent = cp >= 0x20 && cp !== 0x7f ? String.fromCodePoint(cp) : `U+${cp.toString(16).toUpperCase()}`;

    cell.appendChild(canvas);
    cell.appendChild(label);
    container.appendChild(cell);
  }
}
