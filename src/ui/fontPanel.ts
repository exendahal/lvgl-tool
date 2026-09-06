import type { LvglVersion } from '../lib/types';
import { RANGE_PRESETS, parseUnicodeRangeField, parseExplicitCharList, combineCodepoints, formatCodepointRanges, MAX_CODEPOINTS } from '../font/rangeParser';
import { loadOpentypeFont, listFontCodepoints } from '../font/parseFont';
import { buildFont, type BuildFontReport } from '../font/buildFont';
import { generateFontCFile } from '../font/encodeFontC';
import { encodeFontBinary } from '../font/encodeFontBinary';
import { toCIdentifier } from '../lib/bytes';
import { downloadBytes, downloadText } from './download';
import { loadJson, saveJson } from '../lib/persist';
import { ICONS } from './icons';
import { renderGlyphGrid } from './glyphGrid';

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
          <div>${presetButtons}<button type="button" class="secondary" id="font-range-all-btn" disabled style="margin: 0 0.3rem 0.3rem 0;">All glyphs in font</button></div>
        </div>
        <div class="field">
          <label>Available in this font</label>
          <p class="note" id="font-available-ranges" style="margin:0 0 0.6rem; word-break:break-all; max-height:6rem; overflow:auto;">Load a font file to see the ranges it maps.</p>
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

  const rangeAllBtn = $<HTMLButtonElement>('font-range-all-btn');
  const availableRanges = $<HTMLParagraphElement>('font-available-ranges');
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
  let primaryCodepoints: number[] = [];
  let mergeCodepoints: number[] = [];
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

  /** Reads what the font actually maps so the coverage fields can be filled from the font itself
   * rather than from the user's guess at its Unicode range. */
  async function detectCodepoints(bytes: ArrayBuffer): Promise<number[]> {
    try {
      return listFontCodepoints(await loadOpentypeFont(bytes));
    } catch {
      return [];
    }
  }

  function allFontCodepoints(): number[] {
    return combineCodepoints(new Set(primaryCodepoints), new Set(mergeEnable.checked ? mergeCodepoints : []));
  }

  function describeCoverage(): string {
    const all = allFontCodepoints();
    if (all.length === 0) return 'No mapped code points detected — set the range manually.';
    const range = `U+${all[0].toString(16).toUpperCase()}–U+${all[all.length - 1].toString(16).toUpperCase()}`;
    return `${all.length} mapped code point(s), ${range}.`;
  }

  /** Fills the range field from the font's own coverage. Done automatically on load because the
   * previous range belonged to the previous font, and a stale ASCII default silently drops every
   * icon in an icon font. Skipped for fonts too large to rasterize client-side. */
  function applyFontCoverage(auto: boolean): void {
    const all = allFontCodepoints();
    rangeAllBtn.disabled = all.length === 0;
    availableRanges.textContent = all.length > 0 ? `${all.length} code point(s): ${formatCodepointRanges(all)}` : primaryBytes ? 'No mapped code points detected in this font.' : 'Load a font file to see the ranges it maps.';
    if (all.length === 0) return;
    if (auto && all.length > MAX_CODEPOINTS) return;
    if (all.length > MAX_CODEPOINTS) {
      setStatus(`This font maps ${all.length} code points, above the ${MAX_CODEPOINTS} client-side cap — narrow the range by hand.`, 'error');
      return;
    }
    rangeInput.value = formatCodepointRanges(all);
    persistFontOptions();
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    primaryBytes = await file.arrayBuffer();
    primaryCodepoints = await detectCodepoints(primaryBytes);
    const base = toCIdentifier(file.name.replace(/\.[^/.]+$/, ''));
    varNameInput.value = base;
    applyFontCoverage(true);
    fileInfo.textContent = `${file.name} loaded — ${describeCoverage()}`;
    updateConvertEnabled();
  });

  rangeAllBtn.addEventListener('click', () => applyFontCoverage(false));

  mergeEnable.addEventListener('change', () => {
    mergeRow.style.display = mergeEnable.checked ? 'block' : 'none';
    applyFontCoverage(true);
  });

  mergeInput.addEventListener('change', async () => {
    const file = mergeInput.files?.[0];
    if (!file) return;
    mergeBytes = await file.arrayBuffer();
    mergeCodepoints = await detectCodepoints(mergeBytes);
    applyFontCoverage(true);
    fileInfo.textContent = `${describeCoverage()}`;
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
      renderGlyphGrid(glyphGrid, report.result.glyphs.map((g) => ({ ...g, levels: g.bppLevels })), report.result.bpp);

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
