import type { LvglVersion } from '../lib/types';
import { parseImageCSource } from '../importer/parseCSource';
import { parseBin9 } from '../importer/parseBin9';
import { decodeImageBytes, decodeRawPassthrough, type DecodeResult } from '../importer/decodeImage';
import { findFormatByMacro, findFormat } from '../profiles';
import { paintOnCheckerboard } from './checkerboard';
import { ICONS } from './icons';

export function renderImportPanelHtml(): string {
  return `
  <div class="grid">
    <div>
      <div class="section">
        <h3 class="section-heading">Load an existing LVGL image source</h3>
        <div class="field">
          <label for="import-file-input">Upload a .c/.h source, or a v9 .bin file</label>
          <input type="file" id="import-file-input" accept=".c,.h,.bin,text/plain,application/octet-stream" />
        </div>
        <div class="field">
          <label for="import-text-area">…or paste .c source text directly</label>
          <textarea id="import-text-area" rows="8" style="width:100%; font-family: Consolas, monospace; font-size: 0.8rem;" placeholder="const lv_img_dsc_t my_icon = { ... };"></textarea>
        </div>
        <div class="row field">
          <div>
            <label for="import-version-select">LVGL version (auto-detected — override if wrong)</label>
            <select id="import-version-select">
              <option value="v7">v7</option>
              <option value="v8" selected>v8</option>
              <option value="v9">v9</option>
            </select>
          </div>
          <div>
            <label for="import-zoom-slider">Zoom (<span id="import-zoom-value">4</span>x)</label>
            <input type="range" id="import-zoom-slider" min="1" max="16" value="4" />
          </div>
        </div>
        <div class="actions">
          <button class="primary" id="import-decode-btn">${ICONS.search}Decode &amp; preview</button>
        </div>
        <p class="status" id="import-status"></p>
      </div>
    </div>
    <div>
      <div class="card">
        <h3 class="section-heading">Decoded preview</h3>
        <div class="preview-row">
          <div class="preview-box" style="flex:2;">
            <div style="overflow:auto; max-height:420px; border:1px solid var(--border); border-radius:6px; display:inline-block;">
              <canvas id="import-preview-canvas" style="image-rendering pixelated;"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 class="section-heading">Metadata</h3>
        <div id="import-metadata" class="note">Load and decode a file to see metadata here.</div>
        <div id="import-palette" style="display:flex; flex-wrap:wrap; gap:2px; margin-top:0.5rem;"></div>
        <ul id="import-notes" class="note" style="padding-left: 1.1rem;"></ul>
      </div>
    </div>
  </div>`;
}

export function wireImportPanel(root: ParentNode): void {
  const $ = <T extends HTMLElement>(id: string): T => root.querySelector<T>('#' + id)!;

  const fileInput = $<HTMLInputElement>('import-file-input');
  const textArea = $<HTMLTextAreaElement>('import-text-area');
  const versionSelect = $<HTMLSelectElement>('import-version-select');
  const zoomSlider = $<HTMLInputElement>('import-zoom-slider');
  const zoomValue = $<HTMLSpanElement>('import-zoom-value');
  const decodeBtn = $<HTMLButtonElement>('import-decode-btn');
  const statusEl = $<HTMLParagraphElement>('import-status');
  const canvas = $<HTMLCanvasElement>('import-preview-canvas');
  const metadataEl = $<HTMLDivElement>('import-metadata');
  const paletteEl = $<HTMLDivElement>('import-palette');
  const notesEl = $<HTMLUListElement>('import-notes');

  let pendingBinBytes: Uint8Array | null = null;
  let zoom = 4;

  function setStatus(msg: string, kind: 'ok' | 'error' | '' = ''): void {
    statusEl.textContent = msg;
    statusEl.className = `status ${kind}`;
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const isBin = file.name.toLowerCase().endsWith('.bin');
    if (isBin) {
      pendingBinBytes = new Uint8Array(await file.arrayBuffer());
      textArea.value = '';
      versionSelect.value = 'v9';
      setStatus(`Loaded ${file.name} (${pendingBinBytes.length} bytes) — click Decode & preview.`);
    } else {
      pendingBinBytes = null;
      textArea.value = await file.text();
      setStatus(`Loaded ${file.name} as text — click Decode & preview.`);
    }
  });

  textArea.addEventListener('input', () => {
    pendingBinBytes = null;
  });

  zoomSlider.addEventListener('input', () => {
    zoom = parseInt(zoomSlider.value, 10);
    zoomValue.textContent = String(zoom);
    canvas.style.width = canvas.width * zoom + 'px';
    canvas.style.height = canvas.height * zoom + 'px';
  });

  function renderMetadata(formatLabel: string, macro: string, width: number, height: number, byteLength: number, result: DecodeResult, stride?: number): void {
    const rows: string[] = [
      `<div><strong>Resolution:</strong> ${width}×${height}px</div>`,
      `<div><strong>Color format:</strong> ${formatLabel} (<code>${macro}</code>)</div>`,
      `<div><strong>Array size:</strong> ${byteLength.toLocaleString()} bytes</div>`,
    ];
    if (stride !== undefined) rows.push(`<div><strong>Stride:</strong> ${stride} bytes/row</div>`);
    if (result.inferredColorDepth) rows.push(`<div><strong>Inferred LV_COLOR_DEPTH:</strong> ${result.inferredColorDepth}-bit</div>`);
    if (result.palette) rows.push(`<div><strong>Palette entries:</strong> ${result.palette.length}</div>`);
    metadataEl.innerHTML = rows.join('');

    paletteEl.innerHTML = '';
    if (result.palette) {
      for (const [r, g, b, a] of result.palette) {
        const sw = document.createElement('div');
        sw.title = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
        sw.style.width = '18px';
        sw.style.height = '18px';
        sw.style.border = '1px solid var(--border)';
        sw.style.background = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        paletteEl.appendChild(sw);
      }
    }

    notesEl.innerHTML = result.notes.map((n) => `<li>${n}</li>`).join('');
  }

  decodeBtn.addEventListener('click', async () => {
    const version = versionSelect.value as LvglVersion;
    try {
      if (pendingBinBytes) {
        const parsedBin = parseBin9(pendingBinBytes);
        if (!parsedBin.ok) {
          setStatus(parsedBin.error, 'error');
          return;
        }
        const format = findFormat('v9', parsedBin.parsed.formatId);
        if (!format) {
          setStatus(`Internal error: unresolved format id '${parsedBin.parsed.formatId}'.`, 'error');
          return;
        }
        const outcome = decodeImageBytes({
          format,
          width: parsedBin.parsed.width,
          height: parsedBin.parsed.height,
          stride: parsedBin.parsed.stride,
          bytes: parsedBin.parsed.bytes,
        });
        if (!outcome.ok) {
          setStatus(outcome.error, 'error');
          return;
        }
        paintOnCheckerboard(outcome.result.image, canvas);
        canvas.style.width = canvas.width * zoom + 'px';
        canvas.style.height = canvas.height * zoom + 'px';
        renderMetadata(format.label, format.macro, parsedBin.parsed.width, parsedBin.parsed.height, parsedBin.parsed.bytes.length, outcome.result, parsedBin.parsed.stride);
        setStatus('Decoded v9 .bin successfully.', 'ok');
        return;
      }

      const src = textArea.value;
      if (!src.trim()) {
        setStatus('Paste a .c source or upload a file first.', 'error');
        return;
      }
      const parsed = parseImageCSource(src);
      if (!parsed.ok) {
        setStatus(parsed.error, 'error');
        return;
      }
      const effectiveVersion: LvglVersion = parsed.parsed.versionAmbiguous ? version : parsed.parsed.versionGuess;
      if (!parsed.parsed.versionAmbiguous) versionSelect.value = effectiveVersion;

      const format = findFormatByMacro(effectiveVersion, parsed.parsed.macro);
      if (!format) {
        setStatus(`'${parsed.parsed.macro}' isn't a recognized color format for LVGL ${effectiveVersion} — try a different version above (v7/v8 share the same macros; this file may target the other one).`, 'error');
        return;
      }

      const outcome = format.isRawPassthrough ? await decodeRawPassthrough(parsed.parsed.bytes) : decodeImageBytes({ format, width: parsed.parsed.width, height: parsed.parsed.height, stride: parsed.parsed.stride, bytes: parsed.parsed.bytes });

      if (!outcome.ok) {
        setStatus(outcome.error, 'error');
        return;
      }
      paintOnCheckerboard(outcome.result.image, canvas);
      canvas.style.width = canvas.width * zoom + 'px';
      canvas.style.height = canvas.height * zoom + 'px';
      renderMetadata(format.label, format.macro, parsed.parsed.width, parsed.parsed.height, parsed.parsed.bytes.length, outcome.result, parsed.parsed.stride);
      setStatus(`Decoded successfully (detected LVGL ${effectiveVersion}${parsed.parsed.versionAmbiguous ? ', ambiguous vs v7 — override above if wrong' : ''}).`, 'ok');
    } catch (err) {
      setStatus(`Unexpected error: ${(err as Error).message}`, 'error');
    }
  });
}
