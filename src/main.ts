import './style.css';
import logoUrl from './image/lvgl-logo-square-colored.png';
import { ICONS } from './ui/icons';
import type { BinaryRawVariant, ColorFormatDef, ColorRangeSettings, ConversionResult, DecodedImage, LvglVersion, OutputMode, TransparencyMode } from './lib/types';
import { decodeImageFile, readSvgIntrinsicSize } from './lib/imageLoad';
import { toCIdentifier } from './lib/bytes';
import { getFormats, findFormat } from './profiles';
import { packPixels, encodeRawPassthrough, buildPreviewRgba } from './image/formats';
import { applyTransparency, autoSampleCornerColor, samplePixelColor, DEFAULT_CHROMA_COLOR, DEFAULT_COLOR_RANGE } from './image/transparency';
import { generateCArrayFile } from './image/encodeCArray';
import { encodeBinaryRaw, encodeV9Bin } from './image/encodeBinary';
import { combinePixelBytes, maybeRle } from './image/combine';
import { downloadBytes, downloadText } from './ui/download';
import { paintOnCheckerboard } from './ui/checkerboard';
import { renderFormatReference } from './ui/formatReference';
import { renderImportPanelHtml, wireImportPanel } from './ui/importPanel';
import { loadJson, saveJson } from './lib/persist';

const IMAGE_OPTIONS_KEY = 'lvgl-tool.image-options';

interface AppState {
  version: LvglVersion;
  file: File | null;
  decodedImage: DecodedImage | null;
  svgWidth: number;
  svgHeight: number;
  formatId: string;
  colorDepth: 16 | 32;
  dithering: boolean;
  transparencyMode: TransparencyMode;
  pickedColor: [number, number, number];
  tolerance: number;
  feather: number;
  colorRange: ColorRangeSettings;
  varName: string;
  fileNameBase: string;
  outputMode: OutputMode;
  binaryVariant: BinaryRawVariant;
  rle: boolean;
  result: ConversionResult | null;
  pickingFromImage: boolean;
}

/** The subset of AppState worth remembering across visits — everything a user picks/configures,
 * not transient per-file state like the loaded image or the last conversion result. */
type PersistedImageOptions = Pick<
  AppState,
  'version' | 'formatId' | 'colorDepth' | 'dithering' | 'transparencyMode' | 'pickedColor' | 'tolerance' | 'feather' | 'colorRange' | 'outputMode' | 'binaryVariant' | 'rle'
>;

const savedOptions = loadJson<PersistedImageOptions>(IMAGE_OPTIONS_KEY) ?? {};
const savedVersion = savedOptions.version;

const state: AppState = {
  version: savedVersion === 'v7' || savedVersion === 'v8' || savedVersion === 'v9' ? savedVersion : 'v9',
  file: null,
  decodedImage: null,
  svgWidth: 256,
  svgHeight: 256,
  formatId: savedOptions.formatId ?? '',
  colorDepth: savedOptions.colorDepth ?? 16,
  dithering: savedOptions.dithering ?? false,
  transparencyMode: savedOptions.transparencyMode ?? 'none',
  pickedColor: savedOptions.pickedColor ?? [...DEFAULT_CHROMA_COLOR],
  tolerance: savedOptions.tolerance ?? 24,
  feather: savedOptions.feather ?? 0,
  colorRange: { ...DEFAULT_COLOR_RANGE, ...savedOptions.colorRange },
  varName: 'img',
  fileNameBase: 'img',
  outputMode: savedOptions.outputMode ?? 'carray',
  binaryVariant: savedOptions.binaryVariant ?? 'RGB565',
  rle: savedOptions.rle ?? false,
  result: null,
  pickingFromImage: false,
};

function persistImageOptions(): void {
  const toSave: PersistedImageOptions = {
    version: state.version,
    formatId: state.formatId,
    colorDepth: state.colorDepth,
    dithering: state.dithering,
    transparencyMode: state.transparencyMode,
    pickedColor: state.pickedColor,
    tolerance: state.tolerance,
    feather: state.feather,
    colorRange: state.colorRange,
    outputMode: state.outputMode,
    binaryVariant: state.binaryVariant,
    rle: state.rle,
  };
  saveJson(IMAGE_OPTIONS_KEY, toSave);
}

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="app-header">
    <div class="brand">
      <img src="${logoUrl}" alt="LVGL logo" class="brand-logo" />
      <h1>LVGL Asset Converter</h1>
    </div>
    <div class="header-right">
      <a class="github-link" href="https://github.com/exendahal/lvgl-tool/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
        GitHub
      </a>
      <div class="trust-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        100% client-side — nothing you upload ever leaves your browser
      </div>
      <div class="version-select">
        <label for="version-select" style="margin:0;">LVGL version</label>
        <select id="version-select">
          <option value="v7">v7</option>
          <option value="v8">v8</option>
          <option value="v9">v9</option>
        </select>
      </div>
    </div>
  </header>

  <p class="hero-subtitle">Convert images and fonts to LVGL C arrays or binaries for v7/v8/v9, or decode existing LVGL asset files back into a preview — entirely in your browser.</p>

  <div class="tabs-bar">
    <div class="tab-group">
      <span class="tab-group-label">Images</span>
      <div class="tabs">
        <button id="tab-convert-btn" class="active">${ICONS.image}Image Converter</button>
        <button id="tab-import-btn">${ICONS.search}Image Import &amp; Inspect</button>
      </div>
    </div>
    <div class="tab-group">
      <span class="tab-group-label">Fonts</span>
      <div class="tabs">
        <button id="tab-font-btn">${ICONS.type}Font Converter</button>
        <button id="tab-font-import-btn">${ICONS.search}Font Import &amp; Inspect</button>
      </div>
    </div>
    <div class="tab-group">
      <span class="tab-group-label">&nbsp;</span>
      <div class="tabs">
        <button id="tab-docs-btn">${ICONS.book}Format Reference</button>
      </div>
    </div>
  </div>

  <section id="panel-convert" class="panel active">
    <div class="grid">
      <div>
        <div class="section">
          <h3 class="section-heading">Source image</h3>
          <div id="drop-zone">Drop a PNG / JPG / BMP / SVG here, or click to choose a file</div>
          <input type="file" id="file-input" accept=".png,.jpg,.jpeg,.bmp,.svg,image/*" style="display:none" />
          <div class="row" id="svg-size-row" style="display:none">
            <div class="field">
              <label for="svg-width">SVG target width (px)</label>
              <input type="number" id="svg-width" min="1" value="256" />
            </div>
            <div class="field">
              <label for="svg-height">SVG target height (px)</label>
              <input type="number" id="svg-height" min="1" value="256" />
            </div>
          </div>
          <p class="note" id="file-info"></p>
        </div>

        <div class="section">
          <h3 class="section-heading">Color format</h3>
          <div class="field">
            <label for="format-select">Color format (options shown are only those valid for the selected LVGL version)</label>
            <select id="format-select"></select>
          </div>
          <div class="row field" id="color-depth-row" style="display:none">
            <div>
              <label><input type="radio" name="color-depth" value="16" checked /> 16-bit (RGB565) — matches LV_COLOR_DEPTH 16</label>
            </div>
            <div>
              <label><input type="radio" name="color-depth" value="32" /> 32-bit — matches LV_COLOR_DEPTH 32</label>
            </div>
          </div>
          <div class="checkbox-field field">
            <input type="checkbox" id="dithering-checkbox" />
            <label for="dithering-checkbox" style="margin:0">Enable dithering (Floyd–Steinberg) for color-reduced/indexed formats</label>
          </div>
          <p class="note" id="raw-passthrough-note" style="display:none">Raw passthrough formats embed the original file bytes unmodified — color/dithering/transparency options don't apply.</p>
        </div>

        <div class="section" id="transparency-section">
          <h3 class="section-heading">Transparency</h3>
          <div class="field">
            <label for="transparency-mode">Approach</label>
            <select id="transparency-mode">
              <option value="none">None (fully opaque)</option>
              <option value="existingAlpha">Existing-alpha passthrough (use the source PNG's alpha channel)</option>
              <option value="colorPick">Color-pick transparency (pick a background color + tolerance)</option>
              <option value="chromaKey">Chroma-key (magic transparent color)</option>
              <option value="colorRange">Color range (per-channel min/max box, optional grey-only gate)</option>
            </select>
          </div>
          <div id="transparency-controls" style="display:none">
            <div class="row field" id="color-pick-row">
              <div>
                <label for="chroma-color">Picked / chroma color</label>
                <input type="color" id="chroma-color" value="#ff00ff" style="width:100%; height:2.2rem;" />
              </div>
              <div>
                <label>&nbsp;</label>
                <button type="button" class="secondary" id="pick-from-image-btn">Pick from preview →</button>
              </div>
            </div>
            <div class="field" id="tolerance-row">
              <label for="tolerance-slider">Tolerance (<span id="tolerance-value">24</span>)</label>
              <input type="range" id="tolerance-slider" min="0" max="150" value="24" />
            </div>
            <div class="field" id="feather-row">
              <label for="feather-slider">Edge feather / despill radius (<span id="feather-value">0</span>px)</label>
              <input type="range" id="feather-slider" min="0" max="8" value="0" />
            </div>
            <div id="color-range-controls" style="display:none">
              <details class="hint"><summary>How color range mode works</summary><p>Makes a pixel transparent when its R/G/B all fall inside (or, inverted, outside) these ranges. Matches a per-channel range + grey-detection workflow rather than a single picked color.</p></details>
              <div class="row field">
                <div>
                  <label for="range-r-min">R min</label>
                  <input type="number" id="range-r-min" min="0" max="255" value="240" />
                </div>
                <div>
                  <label for="range-r-max">R max</label>
                  <input type="number" id="range-r-max" min="0" max="255" value="255" />
                </div>
              </div>
              <div class="row field">
                <div>
                  <label for="range-g-min">G min</label>
                  <input type="number" id="range-g-min" min="0" max="255" value="240" />
                </div>
                <div>
                  <label for="range-g-max">G max</label>
                  <input type="number" id="range-g-max" min="0" max="255" value="255" />
                </div>
              </div>
              <div class="row field">
                <div>
                  <label for="range-b-min">B min</label>
                  <input type="number" id="range-b-min" min="0" max="255" value="240" />
                </div>
                <div>
                  <label for="range-b-max">B max</label>
                  <input type="number" id="range-b-max" min="0" max="255" value="255" />
                </div>
              </div>
              <div class="checkbox-field field">
                <input type="checkbox" id="range-invert" />
                <label for="range-invert" style="margin:0">Invert (make transparent everything OUTSIDE the range)</label>
              </div>
              <div class="checkbox-field field">
                <input type="checkbox" id="range-grey-only" checked />
                <label for="range-grey-only" style="margin:0">Grey-only gate (only affect near-neutral pixels within the range)</label>
              </div>
              <div class="field" id="range-grey-tolerance-row">
                <label for="range-grey-tolerance">Grey tolerance (<span id="range-grey-tolerance-value">50</span>)</label>
                <input type="range" id="range-grey-tolerance" min="0" max="255" value="50" />
              </div>
              <div class="checkbox-field field">
                <input type="checkbox" id="range-protect-black" checked />
                <label for="range-protect-black" style="margin:0">Never make pure black (#000000) transparent</label>
              </div>
            </div>
          </div>
          <p class="note warn" id="transparency-disabled-note" style="display:none">This color format has no alpha or chroma-key support for the selected LVGL version — transparency controls are disabled.</p>
        </div>

        <div class="section">
          <h3 class="section-heading">Output</h3>
          <div class="row field">
            <div>
              <label for="var-name-input">C variable name</label>
              <input type="text" id="var-name-input" value="img" />
            </div>
            <div>
              <label for="file-name-input">Output file name (no extension)</label>
              <input type="text" id="file-name-input" value="img" />
            </div>
          </div>
          <div class="field">
            <label for="output-mode-select">Output mode</label>
            <select id="output-mode-select">
              <option value="carray">C array (.c file)</option>
              <option value="binaryRaw">Raw binary (no C wrapper)</option>
              <option value="bin9">v9 .bin (LV_FS-loadable, header + data)</option>
            </select>
          </div>
          <div class="field" id="binary-variant-row" style="display:none">
            <label for="binary-variant-select">Raw binary variant</label>
            <select id="binary-variant-select">
              <option value="RGB332">RGB332 (1 byte/pixel)</option>
              <option value="RGB565">RGB565 (2 bytes/pixel, little-endian)</option>
              <option value="RGB565_SWAPPED">RGB565 byte-swapped (big-endian)</option>
              <option value="RGB888">RGB888 (3 bytes/pixel)</option>
            </select>
            <details class="hint"><summary>About raw binary output</summary><p>Packs straight R,G,B channel order and is not dithered in this version — pick a color format above for a dithered, transparency-aware C array instead.</p></details>
          </div>
          <div class="checkbox-field field" id="rle-row" style="display:none">
            <input type="checkbox" id="rle-checkbox" />
            <label for="rle-checkbox" style="margin:0">RLE-compress (experimental, custom scheme — see Format Reference)</label>
          </div>
        </div>

        <div class="actions">
          <button class="primary" id="convert-btn" disabled>${ICONS.play}Convert</button>
          <button class="secondary" id="download-btn" disabled>${ICONS.download}Download</button>
          <button class="secondary" id="copy-btn" disabled>${ICONS.copy}Copy to clipboard</button>
        </div>
        <p class="status" id="status-msg"></p>
      </div>

      <div>
        <div class="card">
          <h3 class="section-heading">Preview</h3>
          <div class="preview-row">
            <div class="preview-box">
              <canvas id="preview-before"></canvas>
              <div class="caption">Source (click to pick a transparency color)</div>
            </div>
            <div class="preview-box">
              <canvas id="preview-after"></canvas>
              <div class="caption">Converted (simulated at target format precision)</div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 class="section-heading">Generated output</h3>
          <textarea id="output-text" readonly placeholder="Convert an image to see the generated C array here. Binary outputs won't render as text — use Download."></textarea>
        </div>
      </div>
    </div>
  </section>

  <section id="panel-import" class="panel">
    ${renderImportPanelHtml()}
  </section>

  <section id="panel-font" class="panel">
    <p class="note" id="font-panel-loading">Loading font engine (opentype.js)…</p>
  </section>

  <section id="panel-font-import" class="panel">
    <p class="note">Loading…</p>
  </section>

  <section id="panel-docs" class="panel">
    ${renderFormatReference()}
  </section>

  <footer class="app-footer">LVGL Asset Converter — static, client-side, open-source. See the Format Reference tab for known limitations before shipping generated assets to production firmware.</footer>
`;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const versionSelect = $<HTMLSelectElement>('version-select');
const tabConvertBtn = $<HTMLButtonElement>('tab-convert-btn');
const tabImportBtn = $<HTMLButtonElement>('tab-import-btn');
const tabFontBtn = $<HTMLButtonElement>('tab-font-btn');
const tabFontImportBtn = $<HTMLButtonElement>('tab-font-import-btn');
const tabDocsBtn = $<HTMLButtonElement>('tab-docs-btn');
const panelConvert = $<HTMLDivElement>('panel-convert');
const panelImport = $<HTMLDivElement>('panel-import');
const panelFont = $<HTMLDivElement>('panel-font');
const panelFontImport = $<HTMLDivElement>('panel-font-import');
const panelDocs = $<HTMLDivElement>('panel-docs');

const dropZone = $<HTMLDivElement>('drop-zone');
const fileInput = $<HTMLInputElement>('file-input');
const svgSizeRow = $<HTMLDivElement>('svg-size-row');
const svgWidthInput = $<HTMLInputElement>('svg-width');
const svgHeightInput = $<HTMLInputElement>('svg-height');
const fileInfo = $<HTMLParagraphElement>('file-info');

const formatSelect = $<HTMLSelectElement>('format-select');
const colorDepthRow = $<HTMLDivElement>('color-depth-row');
const ditheringCheckbox = $<HTMLInputElement>('dithering-checkbox');
const rawPassthroughNote = $<HTMLParagraphElement>('raw-passthrough-note');

const transparencyModeSelect = $<HTMLSelectElement>('transparency-mode');
const transparencyControls = $<HTMLDivElement>('transparency-controls');
const transparencyDisabledNote = $<HTMLParagraphElement>('transparency-disabled-note');
const chromaColorInput = $<HTMLInputElement>('chroma-color');
const pickFromImageBtn = $<HTMLButtonElement>('pick-from-image-btn');
const toleranceSlider = $<HTMLInputElement>('tolerance-slider');
const toleranceValue = $<HTMLSpanElement>('tolerance-value');
const featherSlider = $<HTMLInputElement>('feather-slider');
const featherValue = $<HTMLSpanElement>('feather-value');

const varNameInput = $<HTMLInputElement>('var-name-input');
const fileNameInput = $<HTMLInputElement>('file-name-input');
const outputModeSelect = $<HTMLSelectElement>('output-mode-select');
const binaryVariantRow = $<HTMLDivElement>('binary-variant-row');
const binaryVariantSelect = $<HTMLSelectElement>('binary-variant-select');
const rleRow = $<HTMLDivElement>('rle-row');
const rleCheckbox = $<HTMLInputElement>('rle-checkbox');

const convertBtn = $<HTMLButtonElement>('convert-btn');
const downloadBtn = $<HTMLButtonElement>('download-btn');
const copyBtn = $<HTMLButtonElement>('copy-btn');
const statusMsg = $<HTMLParagraphElement>('status-msg');

const previewBefore = $<HTMLCanvasElement>('preview-before');
const previewAfter = $<HTMLCanvasElement>('preview-after');
const outputText = $<HTMLTextAreaElement>('output-text');

function currentFormat(): ColorFormatDef | undefined {
  return findFormat(state.version, state.formatId);
}

function setStatus(msg: string, kind: 'ok' | 'error' | '' = ''): void {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${kind}`;
}

function populateFormatOptions(): void {
  const formats = getFormats(state.version);
  const previousId = state.formatId;
  formatSelect.innerHTML = formats.map((f) => `<option value="${f.id}">${f.label}</option>`).join('');
  const stillValid = formats.some((f) => f.id === previousId);
  state.formatId = stillValid ? previousId : formats[0].id;
  formatSelect.value = state.formatId;
  updateFormatDependentUI();
}

function updateFormatDependentUI(): void {
  const format = currentFormat();
  if (!format) return;

  const isTrueColorDepthChoice = format.category === 'trueColor' && ['true_color', 'true_color_alpha', 'true_color_chroma'].includes(format.id) && state.version !== 'v9';
  colorDepthRow.style.display = isTrueColorDepthChoice ? 'flex' : 'none';

  rawPassthroughNote.style.display = format.isRawPassthrough ? 'block' : 'none';
  ditheringCheckbox.disabled = !!format.isRawPassthrough;

  const transparencyCapable = format.supportsAlpha || format.supportsChroma;
  transparencyModeSelect.disabled = !transparencyCapable || !!format.isRawPassthrough;
  transparencyDisabledNote.style.display = transparencyCapable ? 'none' : 'block';
  if (!transparencyCapable) {
    transparencyControls.style.display = 'none';
  }

  // Chroma-key mode only makes sense when the format actually supports it (vs. plain alpha).
  const chromaOption = transparencyModeSelect.querySelector<HTMLOptionElement>('option[value="chromaKey"]')!;
  chromaOption.disabled = !format.supportsChroma;
  const alphaOptions = ['existingAlpha', 'colorPick', 'colorRange'];
  alphaOptions.forEach((v) => {
    const opt = transparencyModeSelect.querySelector<HTMLOptionElement>(`option[value="${v}"]`)!;
    opt.disabled = !format.supportsAlpha;
  });
  const modeStillValid =
    state.transparencyMode === 'none' ||
    (state.transparencyMode === 'chromaKey' && format.supportsChroma) ||
    (['existingAlpha', 'colorPick', 'colorRange'].includes(state.transparencyMode) && format.supportsAlpha);
  if (!modeStillValid) {
    state.transparencyMode = 'none';
    transparencyModeSelect.value = 'none';
    updateTransparencyControlsVisibility();
  }

  rleRow.style.display = state.version === 'v9' && !!format.supportsRle && state.outputMode !== 'binaryRaw' ? 'flex' : 'none';

  // bin9 output only valid for v9 non-raw formats.
  const bin9Option = outputModeSelect.querySelector<HTMLOptionElement>('option[value="bin9"]')!;
  bin9Option.disabled = state.version !== 'v9' || !!format.isRawPassthrough;
  if (bin9Option.disabled && state.outputMode === 'bin9') {
    state.outputMode = 'carray';
    outputModeSelect.value = 'carray';
  }

  binaryVariantRow.style.display = state.outputMode === 'binaryRaw' ? 'block' : 'none';
}

function refreshPreviewBefore(): void {
  if (!state.decodedImage) return;
  paintOnCheckerboard(state.decodedImage, previewBefore);
}

async function handleFile(file: File): Promise<void> {
  state.file = file;
  const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
  svgSizeRow.style.display = isSvg ? 'flex' : 'none';

  if (isSvg) {
    const intrinsic = await readSvgIntrinsicSize(file);
    if (intrinsic) {
      state.svgWidth = Math.round(intrinsic.width);
      state.svgHeight = Math.round(intrinsic.height);
      svgWidthInput.value = String(state.svgWidth);
      svgHeightInput.value = String(state.svgHeight);
    }
  }

  try {
    const decoded = await decodeImageFile(file, isSvg ? { width: state.svgWidth, height: state.svgHeight } : undefined);
    state.decodedImage = decoded;
    fileInfo.textContent = `${file.name} — ${decoded.width}×${decoded.height}px`;
    const base = toCIdentifier(file.name.replace(/\.[^/.]+$/, ''));
    state.varName = base;
    state.fileNameBase = base;
    varNameInput.value = base;
    fileNameInput.value = base;

    // Auto-sample the corner as a starting guess for a color-pick/chroma-key background color.
    state.pickedColor = autoSampleCornerColor(decoded);
    chromaColorInput.value = '#' + state.pickedColor.map((c) => c.toString(16).padStart(2, '0')).join('');

    refreshPreviewBefore();
    convertBtn.disabled = false;
    setStatus('Image loaded. Adjust options and click Convert.', 'ok');
  } catch (err) {
    setStatus(`Failed to load image: ${(err as Error).message}`, 'error');
  }
}

async function reRasterizeSvg(): Promise<void> {
  if (!state.file) return;
  const isSvg = state.file.name.toLowerCase().endsWith('.svg');
  if (!isSvg) return;
  const decoded = await decodeImageFile(state.file, { width: state.svgWidth, height: state.svgHeight });
  state.decodedImage = decoded;
  fileInfo.textContent = `${state.file.name} — ${decoded.width}×${decoded.height}px`;
  refreshPreviewBefore();
}

function runConvert(): void {
  if (!state.decodedImage || !state.file) {
    setStatus('Load an image first.', 'error');
    return;
  }
  const format = currentFormat();
  if (!format) return;

  try {
    if (state.outputMode === 'binaryRaw') {
      const bytes = encodeBinaryRaw(state.decodedImage, state.binaryVariant);
      state.result = {
        fileName: `${toCIdentifier(state.fileNameBase)}_${state.binaryVariant}.bin`,
        kind: 'binary',
        bytes,
        previewRgba: state.decodedImage,
      };
    } else if (format.isRawPassthrough) {
      encodeRawPassthrough(state.file).then((packed) => {
        const text = generateCArrayFile({
          version: state.version,
          format,
          variableName: state.varName,
          width: state.decodedImage!.width,
          height: state.decodedImage!.height,
          pixelData: packed.data,
          stride: 0,
          isRawPassthrough: true,
          rle: false,
        });
        state.result = { fileName: `${toCIdentifier(state.varName)}.c`, kind: 'text', text, previewRgba: state.decodedImage! };
        renderResult();
      });
      return;
    } else {
      const transparent = applyTransparency(state.decodedImage, {
        mode: state.transparencyMode,
        pickedColor: state.pickedColor,
        tolerance: state.tolerance,
        feather: state.feather,
        colorRange: state.colorRange,
      }, format);
      const packOpts = { colorDepth: state.colorDepth, dithering: state.dithering };
      const packed = packPixels(transparent, format, packOpts);
      const preview = buildPreviewRgba(transparent, format, packOpts);

      if (state.outputMode === 'bin9') {
        const combined = combinePixelBytes(packed.palette, packed.data);
        const finalBytes = maybeRle(combined, state.rle && !!format.supportsRle);
        const bytes = encodeV9Bin(format, state.decodedImage.width, state.decodedImage.height, packed.stride, finalBytes);
        state.result = { fileName: `${toCIdentifier(state.varName)}.bin`, kind: 'binary', bytes, previewRgba: preview };
      } else {
        const text = generateCArrayFile({
          version: state.version,
          format,
          variableName: state.varName,
          width: state.decodedImage.width,
          height: state.decodedImage.height,
          pixelData: packed.data,
          paletteData: packed.palette,
          stride: packed.stride,
          isRawPassthrough: false,
          rle: state.rle,
        });
        state.result = { fileName: `${toCIdentifier(state.varName)}.c`, kind: 'text', text, previewRgba: preview };
      }
    }
    renderResult();
  } catch (err) {
    setStatus(`Conversion failed: ${(err as Error).message}`, 'error');
  }
}

function renderResult(): void {
  if (!state.result) return;
  paintOnCheckerboard(state.result.previewRgba, previewAfter);
  if (state.result.kind === 'text') {
    outputText.value = state.result.text ?? '';
    copyBtn.disabled = false;
  } else {
    outputText.value = `(binary output — ${state.result.bytes?.length ?? 0} bytes — use Download)`;
    copyBtn.disabled = true;
  }
  downloadBtn.disabled = false;
  setStatus(`Converted successfully → ${state.result.fileName}`, 'ok');
}

// ---- Event wiring ----

let fontPanelApi: { onVersionChange: () => void } | null = null;
let fontPanelLoading = false;

versionSelect.value = state.version;
versionSelect.addEventListener('change', () => {
  state.version = versionSelect.value as LvglVersion;
  populateFormatOptions();
  fontPanelApi?.onVersionChange();
});

// Remember every image-converter option across visits — one delegated listener beats wiring
// persistImageOptions() into two dozen individual input handlers.
panelConvert.addEventListener('change', persistImageOptions);
panelConvert.addEventListener('input', persistImageOptions);

const allTabs = [
  { btn: tabConvertBtn, panel: panelConvert },
  { btn: tabImportBtn, panel: panelImport },
  { btn: tabFontBtn, panel: panelFont },
  { btn: tabFontImportBtn, panel: panelFontImport },
  { btn: tabDocsBtn, panel: panelDocs },
];
function activateTab(target: HTMLButtonElement): void {
  for (const { btn, panel } of allTabs) {
    const active = btn === target;
    btn.classList.toggle('active', active);
    panel.classList.toggle('active', active);
  }
}
tabConvertBtn.addEventListener('click', () => activateTab(tabConvertBtn));
tabImportBtn.addEventListener('click', () => activateTab(tabImportBtn));
tabDocsBtn.addEventListener('click', () => activateTab(tabDocsBtn));

// Font engine (opentype.js, ~300KB) is only fetched once the user actually opens this tab,
// so users converting images only never pay for it (PRD's explicit lazy-load requirement).
tabFontBtn.addEventListener('click', () => {
  activateTab(tabFontBtn);
  if (fontPanelApi || fontPanelLoading) return;
  fontPanelLoading = true;
  import('./ui/fontPanel').then(({ renderFontPanelHtml, wireFontPanel }) => {
    panelFont.innerHTML = renderFontPanelHtml();
    fontPanelApi = wireFontPanel(panelFont, () => state.version);
  });
});

let fontImportLoaded = false;
tabFontImportBtn.addEventListener('click', () => {
  activateTab(tabFontImportBtn);
  if (fontImportLoaded) return;
  fontImportLoaded = true;
  import('./ui/fontImportPanel').then(({ renderFontImportPanelHtml, wireFontImportPanel }) => {
    panelFontImport.innerHTML = renderFontImportPanelHtml();
    wireFontImportPanel(panelFontImport);
  });
});

wireImportPanel(panelImport);

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
});

svgWidthInput.addEventListener('change', () => {
  state.svgWidth = Math.max(1, parseInt(svgWidthInput.value, 10) || 1);
  void reRasterizeSvg();
});
svgHeightInput.addEventListener('change', () => {
  state.svgHeight = Math.max(1, parseInt(svgHeightInput.value, 10) || 1);
  void reRasterizeSvg();
});

formatSelect.addEventListener('change', () => {
  state.formatId = formatSelect.value;
  updateFormatDependentUI();
});

colorDepthRow.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.name === 'color-depth') state.colorDepth = target.value === '32' ? 32 : 16;
});

ditheringCheckbox.addEventListener('change', () => {
  state.dithering = ditheringCheckbox.checked;
});

transparencyModeSelect.addEventListener('change', () => {
  state.transparencyMode = transparencyModeSelect.value as TransparencyMode;
  updateTransparencyControlsVisibility();
});

const toleranceRow = $<HTMLDivElement>('tolerance-row');
const featherRow = $<HTMLDivElement>('feather-row');
const colorPickRow = $<HTMLDivElement>('color-pick-row');
const colorRangeControls = $<HTMLDivElement>('color-range-controls');
const rangeGreyToleranceRow = $<HTMLDivElement>('range-grey-tolerance-row');

function updateTransparencyControlsVisibility(): void {
  transparencyControls.style.display = state.transparencyMode === 'none' ? 'none' : 'block';
  const needsColor = state.transparencyMode === 'colorPick' || state.transparencyMode === 'chromaKey';
  colorPickRow.style.display = needsColor ? 'flex' : 'none';
  toleranceRow.style.display = needsColor ? 'block' : 'none';
  featherRow.style.display = state.transparencyMode === 'colorPick' || state.transparencyMode === 'existingAlpha' ? 'block' : 'none';
  colorRangeControls.style.display = state.transparencyMode === 'colorRange' ? 'block' : 'none';
  rangeGreyToleranceRow.style.display = state.colorRange.greyOnly ? 'block' : 'none';
}

chromaColorInput.addEventListener('input', () => {
  const hex = chromaColorInput.value.replace('#', '');
  state.pickedColor = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
});

const rangeRMin = $<HTMLInputElement>('range-r-min');
const rangeRMax = $<HTMLInputElement>('range-r-max');
const rangeGMin = $<HTMLInputElement>('range-g-min');
const rangeGMax = $<HTMLInputElement>('range-g-max');
const rangeBMin = $<HTMLInputElement>('range-b-min');
const rangeBMax = $<HTMLInputElement>('range-b-max');
const rangeInvert = $<HTMLInputElement>('range-invert');
const rangeGreyOnly = $<HTMLInputElement>('range-grey-only');
const rangeGreyTolerance = $<HTMLInputElement>('range-grey-tolerance');
const rangeGreyToleranceValue = $<HTMLSpanElement>('range-grey-tolerance-value');
const rangeProtectBlack = $<HTMLInputElement>('range-protect-black');

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v) || 0));
}

[
  [rangeRMin, 'rMin'],
  [rangeRMax, 'rMax'],
  [rangeGMin, 'gMin'],
  [rangeGMax, 'gMax'],
  [rangeBMin, 'bMin'],
  [rangeBMax, 'bMax'],
].forEach(([input, key]) => {
  (input as HTMLInputElement).addEventListener('input', () => {
    state.colorRange[key as 'rMin' | 'rMax' | 'gMin' | 'gMax' | 'bMin' | 'bMax'] = clamp255(parseInt((input as HTMLInputElement).value, 10));
  });
});

rangeInvert.addEventListener('change', () => {
  state.colorRange.invert = rangeInvert.checked;
});
rangeGreyOnly.addEventListener('change', () => {
  state.colorRange.greyOnly = rangeGreyOnly.checked;
  updateTransparencyControlsVisibility();
});
rangeGreyTolerance.addEventListener('input', () => {
  state.colorRange.greyTolerance = parseInt(rangeGreyTolerance.value, 10);
  rangeGreyToleranceValue.textContent = rangeGreyTolerance.value;
});
rangeProtectBlack.addEventListener('change', () => {
  state.colorRange.protectPureBlack = rangeProtectBlack.checked;
});

pickFromImageBtn.addEventListener('click', () => {
  state.pickingFromImage = true;
  setStatus('Click a pixel on the source preview to pick its color…');
});

previewBefore.addEventListener('click', (e) => {
  if (!state.pickingFromImage || !state.decodedImage) return;
  const rect = previewBefore.getBoundingClientRect();
  const scaleX = state.decodedImage.width / rect.width;
  const scaleY = state.decodedImage.height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  const color = samplePixelColor(state.decodedImage, x, y);
  state.pickedColor = color;
  chromaColorInput.value = '#' + color.map((c) => c.toString(16).padStart(2, '0')).join('');
  state.pickingFromImage = false;
  setStatus('Color picked.', 'ok');
  persistImageOptions();
});

toleranceSlider.addEventListener('input', () => {
  state.tolerance = parseInt(toleranceSlider.value, 10);
  toleranceValue.textContent = String(state.tolerance);
});
featherSlider.addEventListener('input', () => {
  state.feather = parseInt(featherSlider.value, 10);
  featherValue.textContent = String(state.feather);
});

varNameInput.addEventListener('input', () => {
  state.varName = varNameInput.value;
});
fileNameInput.addEventListener('input', () => {
  state.fileNameBase = fileNameInput.value;
});

outputModeSelect.addEventListener('change', () => {
  state.outputMode = outputModeSelect.value as OutputMode;
  updateFormatDependentUI();
});
binaryVariantSelect.addEventListener('change', () => {
  state.binaryVariant = binaryVariantSelect.value as BinaryRawVariant;
});
rleCheckbox.addEventListener('change', () => {
  state.rle = rleCheckbox.checked;
});

convertBtn.addEventListener('click', runConvert);

downloadBtn.addEventListener('click', () => {
  if (!state.result) return;
  if (state.result.kind === 'text') downloadText(state.result.fileName, state.result.text ?? '');
  else downloadBytes(state.result.fileName, state.result.bytes ?? new Uint8Array());
});

copyBtn.addEventListener('click', async () => {
  if (!state.result?.text) return;
  await navigator.clipboard.writeText(state.result.text);
  setStatus('Copied to clipboard.', 'ok');
});

// Reflects restored (or default) `state` values into the actual DOM controls — the HTML template
// above renders with static default attributes, so a restored session needs this to show up.
function syncControlsFromState(): void {
  const colorDepthRadio = document.querySelector<HTMLInputElement>(`input[name="color-depth"][value="${state.colorDepth}"]`);
  if (colorDepthRadio) colorDepthRadio.checked = true;

  ditheringCheckbox.checked = state.dithering;
  transparencyModeSelect.value = state.transparencyMode;
  chromaColorInput.value = '#' + state.pickedColor.map((c) => c.toString(16).padStart(2, '0')).join('');

  toleranceSlider.value = String(state.tolerance);
  toleranceValue.textContent = String(state.tolerance);
  featherSlider.value = String(state.feather);
  featherValue.textContent = String(state.feather);

  rangeRMin.value = String(state.colorRange.rMin);
  rangeRMax.value = String(state.colorRange.rMax);
  rangeGMin.value = String(state.colorRange.gMin);
  rangeGMax.value = String(state.colorRange.gMax);
  rangeBMin.value = String(state.colorRange.bMin);
  rangeBMax.value = String(state.colorRange.bMax);
  rangeInvert.checked = state.colorRange.invert;
  rangeGreyOnly.checked = state.colorRange.greyOnly;
  rangeGreyTolerance.value = String(state.colorRange.greyTolerance);
  rangeGreyToleranceValue.textContent = String(state.colorRange.greyTolerance);
  rangeProtectBlack.checked = state.colorRange.protectPureBlack;

  outputModeSelect.value = state.outputMode;
  binaryVariantSelect.value = state.binaryVariant;
  rleCheckbox.checked = state.rle;
}

// ---- Init ----
syncControlsFromState();
populateFormatOptions();
updateTransparencyControlsVisibility();
